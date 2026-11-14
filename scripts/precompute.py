"""Write one sampled regional Series file per catalog variable and region (Task A5).

Each region's value for a month is the cos(latitude)-weighted mean of 9 POWER points
inside its bbox. Raw responses are cached in scripts/.cache, so a rerun refetches nothing.

Run from the repo root:  python scripts/precompute.py
"""

import json
import math
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
CACHE = Path(__file__).resolve().parent / ".cache"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
END_YEAR = 2025
PAUSE_SECONDS = 1.5
BACKOFF_SECONDS = [30, 60, 120, 120]  # waits between the 5 tries after HTTP 429
# Appended to the catalog source, so each file names its product and version (issue 22).
SAMPLED = "sampled regional mean of 9 points"
MONTH_KEY = re.compile(r"^\d{4}(0[1-9]|1[0-2])$")  # drops the YYYY13 annual key

STATS = {"calls": 0, "rate_limited": 0}


def sample_points(bbox):
    """9 points at 1/6, 3/6 and 5/6 of each side, so all sit strictly inside the bbox."""
    s, w, n, e = bbox
    fractions = (1 / 6, 3 / 6, 5 / 6)
    return [
        (round(s + (n - s) * fy, 2), round(w + (e - w) * fx, 2))
        for fy in fractions
        for fx in fractions
    ]


def weighted_mean(values, lats):
    """Mean weighted by cos(latitude), renormalized over the points that have a value."""
    pairs = [(v, math.cos(math.radians(lat))) for v, lat in zip(values, lats) if v is not None]
    total = sum(w for _, w in pairs)
    return sum(v * w for v, w in pairs) / total if pairs else None


def _monthly(body, param):
    """Months 01-12 of one parameter, with the fill value and non-numbers as None."""
    raw = body["properties"]["parameter"][param]
    fill = body.get("header", {}).get("fill_value", -999.0)
    return {
        f"{k[:4]}-{k[4:]}": (v if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v != fill else None)
        for k, v in raw.items()
        if MONTH_KEY.match(k)
    }


def region_series(variable, region, fetch):
    """A Series dict for one variable and region. fetch(lat, lon, variable) returns a POWER response."""
    points = sample_points(region["bbox"])
    by_point = [_monthly(fetch(lat, lon, variable), variable["powerParameter"]) for lat, lon in points]
    lats = [lat for lat, _ in points]
    dates = sorted(set().union(*by_point))
    values = []
    for d in dates:
        mean = weighted_mean([p.get(d) for p in by_point], lats)
        values.append(None if mean is None else round(mean, 4))
    return {
        "variableId": variable["id"],
        "placeId": region["id"],
        "unit": variable["unit"],
        "source": f"{variable['source']}, {SAMPLED}",
        "dates": dates,
        "values": values,
    }


def to_json(series):
    # allow_nan=False: browsers reject the NaN that json.dumps writes by default.
    return json.dumps(series, ensure_ascii=False, allow_nan=False)


def get_json(url, get=requests.get, sleep=time.sleep):
    """One POWER request; backs off after HTTP 429 and gives up after 5 tries."""
    for attempt in range(len(BACKOFF_SECONDS) + 1):
        STATS["calls"] += 1
        r = get(url, timeout=30)
        if r.status_code == 429:
            STATS["rate_limited"] += 1
            if attempt == len(BACKOFF_SECONDS):
                raise RuntimeError(f"POWER still answers HTTP 429 after 5 tries: {url}")
            sleep(BACKOFF_SECONDS[attempt])
            continue
        if r.status_code != 200:
            raise RuntimeError(f"POWER answered HTTP {r.status_code}: {url}\n{getattr(r, 'text', '')[:500]}")
        return r.json()


def make_fetch(catalog):
    """fetch(lat, lon, variable) that asks for every parameter sharing the variable's start year in one call."""

    def fetch(lat, lon, variable):
        start = variable["startYear"]
        params = sorted(v["powerParameter"] for v in catalog if v["powerParameter"] and v["startYear"] == start)
        # The end year is part of the name, so a longer record is never served from an old cache (D5).
        path = CACHE / f"{lat}_{lon}_{start}-{END_YEAR}_{'-'.join(params)}.json"
        if path.exists():
            return json.loads(path.read_text("utf-8"))
        url = (f"{POWER_URL}?parameters={','.join(params)}&community=AG"
               f"&longitude={lon}&latitude={lat}&start={start}&end={END_YEAR}&format=JSON")
        body = get_json(url)
        CACHE.mkdir(exist_ok=True)
        path.write_text(json.dumps(body), "utf-8")
        time.sleep(PAUSE_SECONDS)
        return body

    return fetch


def main():
    catalog = json.loads((DATA / "catalog.json").read_text("utf-8"))
    regions = json.loads((DATA / "regions.json").read_text("utf-8"))
    fetch = make_fetch(catalog)
    for region in regions:  # file order, so the Arctic region goes first
        s, w, n, e = region["bbox"]
        if not (s < n and w < e):
            sys.exit(f"{region['id']}: bbox needs south < north and west < east")
        for variable in catalog:
            if not variable["powerParameter"]:
                print(f"{region['id']} {variable['id']}: skipped, no POWER parameter", flush=True)
                continue
            series = region_series(variable, region, fetch)
            out = DATA / "series" / variable["id"] / f"{region['id']}.json"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(to_json(series) + "\n", "utf-8", newline="\n")
            valid = sum(v is not None for v in series["values"])
            print(f"{region['id']} {variable['id']}: {valid}/{len(series['values'])} valid months", flush=True)
    print(f"Done: {STATS['calls']} POWER calls, {STATS['rate_limited']} answered HTTP 429")


if __name__ == "__main__":
    main()
