import math

import pytest

import precompute
from precompute import region_series, sample_points, weighted_mean

T2M = {"id": "T2M", "powerParameter": "T2M", "unit": "°C", "startYear": 2020,
       "source": "NASA POWER monthly (MERRA-2), API v2.10.0"}
REGION = {"id": "test-box", "name": "Test box", "bbox": [0, 10, 6, 16]}


def power_response(values_by_key, param="T2M"):
    """The shape captured in src/data/power-sample.json."""
    return {"header": {"fill_value": -999.0}, "properties": {"parameter": {param: values_by_key}}}


def test_sample_points_gives_9_points_inside_the_bbox():
    s, w, n, e = REGION["bbox"]
    points = sample_points(REGION["bbox"])
    assert len(points) == 9
    assert len(set(points)) == 9
    assert all(s < lat < n and w < lon < e for lat, lon in points)
    assert sorted({lat for lat, _ in points}) == [1, 3, 5]
    assert sorted({lon for _, lon in points}) == [11, 13, 15]


def test_weighted_mean_weights_low_latitude_more():
    # cos(0) = 1, cos(60°) = 0.5, so the equator point counts twice as much.
    assert weighted_mean([10, 20], [0, 60]) == pytest.approx((10 * 1 + 20 * 0.5) / 1.5)
    assert weighted_mean([10, 20], [0, 60]) < 15


def test_weighted_mean_skips_missing_and_all_missing_gives_none():
    assert weighted_mean([10, None, 20], [0, 0, 60]) == pytest.approx((10 + 10) / 1.5)
    assert weighted_mean([None, None], [0, 60]) is None


def test_region_series_has_equal_dates_and_values_lengths():
    keys = {f"{y}{m:02d}": 1.0 for y in (2020, 2021) for m in range(1, 14)}
    keys["202003"] = -999.0
    calls = []

    def fetch(lat, lon, variable):
        calls.append((lat, lon))
        return power_response(keys)

    s = region_series(T2M, REGION, fetch)
    assert len(calls) == 9
    assert len(s["dates"]) == len(s["values"]) == 24
    assert s["dates"][0] == "2020-01" and s["dates"][-1] == "2021-12"
    assert s["values"][2] is None  # fill value at every point
    assert s["values"][0] == 1.0
    assert s["variableId"] == "T2M" and s["placeId"] == "test-box" and s["unit"] == "°C"


def test_source_text_says_sampled_regional_mean_of_9_points():
    s = region_series(T2M, REGION, lambda lat, lon, v: power_response({"202001": 1.0}))
    # Names the product and version from the catalog (issue 22), plus the card A5 wording.
    assert s["source"] == "NASA POWER monthly (MERRA-2), API v2.10.0, sampled regional mean of 9 points"


def test_region_series_rounds_to_4_decimals_and_writes_valid_json():
    s = region_series(T2M, REGION, lambda lat, lon, v: power_response({"202001": 1 / 3, "202002": math.nan}))
    assert s["values"] == [0.3333, None]
    precompute.to_json(s)  # raises on NaN


class FakeResponse:
    def __init__(self, status, body=None):
        self.status_code = status
        self._body = body

    def json(self):
        return self._body


def test_get_json_backs_off_after_429_then_succeeds():
    replies = [FakeResponse(429), FakeResponse(429), FakeResponse(200, {"ok": True})]
    waits = []
    body = precompute.get_json("u", get=lambda url, timeout: replies.pop(0), sleep=waits.append)
    assert body == {"ok": True}
    assert waits == [30, 60]


def test_get_json_stops_after_5_tries_with_a_clear_error():
    waits = []
    with pytest.raises(RuntimeError, match="429"):
        precompute.get_json("u", get=lambda url, timeout: FakeResponse(429), sleep=waits.append)
    assert waits == [30, 60, 120, 120]


def test_cache_name_includes_the_end_year(tmp_path, monkeypatch):  # D5
    monkeypatch.setattr(precompute, "CACHE", tmp_path)
    monkeypatch.setattr(precompute.time, "sleep", lambda s: None)
    urls = []
    monkeypatch.setattr(precompute, "get_json", lambda url: urls.append(url) or power_response({"202001": 1.0}))
    fetch = precompute.make_fetch([T2M])
    fetch(1.0, 2.0, T2M)
    fetch(1.0, 2.0, T2M)
    assert len(urls) == 1  # the second call is served from the cache
    monkeypatch.setattr(precompute, "END_YEAR", 2026)
    fetch(1.0, 2.0, T2M)
    assert len(urls) == 2 and "end=2026" in urls[-1]


def test_booleans_are_not_measurements():  # D10: in Python, True is an int
    s = region_series(T2M, REGION, lambda lat, lon, v: power_response({"202001": True, "202002": 2.0}))
    assert s["values"] == [None, 2.0]
