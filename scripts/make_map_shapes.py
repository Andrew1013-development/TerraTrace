"""Write the Scene map's shape files from Natural Earth 1:110m (public domain). Run once:

    python scripts/make_map_shapes.py <ne_110m_geography_regions_polys.geojson> <ne_110m_admin_0_countries.geojson>

public/data/region-shapes.json: for each region in regions.json, its real outline. A region that is a whole named
Natural Earth area (the Sahara, the Plateau of Tibet) gets that area's full outline. A part of one ("the central
Amazon") or a region with no named area gets the outline trimmed to the region's box, so it never claims a much
larger area than the 9 sampled points cover.
public/data/countries.json: country outlines and names, for naming a typed point outside every region.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

# Region id -> Natural Earth geography-region NAME. Regions not listed use the land coastline.
NAMED = {
    "arctic-canada": "ARCTIC ARCHIPELAGO",
    "central-amazon": "AMAZON BASIN",
    "sahara": "SAHARA",
    "central-siberia": "SIBERIA",
    "tibetan-plateau": "PLATEAU OF TIBET",
    "us-great-plains": "GREAT PLAINS",
    "antarctic-peninsula": "Antarctic Peninsula",
    "iberian-peninsula": "PENÍNSULA IBÉRICA",
}

# Regions that are the whole named area: drawn with its full outline, not trimmed to the box.
WHOLE = {"arctic-canada", "sahara", "tibetan-plateau", "us-great-plains", "antarctic-peninsula", "iberian-peninsula"}


def clip_ring(ring, box):
    """Sutherland-Hodgman: clip one polygon ring (list of [lon, lat]) to box [south, west, north, east]."""
    s, w, n, e = box
    edges = [
        (lambda p: p[0] >= w, lambda a, b: _at_lon(a, b, w)),
        (lambda p: p[0] <= e, lambda a, b: _at_lon(a, b, e)),
        (lambda p: p[1] >= s, lambda a, b: _at_lat(a, b, s)),
        (lambda p: p[1] <= n, lambda a, b: _at_lat(a, b, n)),
    ]
    out = ring[:-1] if ring and ring[0] == ring[-1] else list(ring)
    for inside, cross in edges:
        if not out:
            break
        points, out = out, []
        for i, cur in enumerate(points):
            prev = points[i - 1]
            if inside(cur):
                if not inside(prev):
                    out.append(cross(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cross(prev, cur))
    if len(out) < 3:
        return None
    return out + [out[0]]


def _at_lon(a, b, lon):
    t = (lon - a[0]) / (b[0] - a[0])
    return [lon, a[1] + t * (b[1] - a[1])]


def _at_lat(a, b, lat):
    t = (lat - a[1]) / (b[1] - a[1])
    return [a[0] + t * (b[0] - a[0]), lat]


def polygons(geometry):
    return [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]


def clip_geometry(geometries, box):
    """Clip polygons' outer rings to the box; returns MultiPolygon coordinates (holes dropped at this scale)."""
    parts = []
    for g in geometries:
        for poly in polygons(g):
            ring = clip_ring(poly[0], box)
            if ring:
                parts.append([[[round(x, 2), round(y, 2)] for x, y in ring]])
    return parts


def outer_rings(geometries):
    """Every polygon's outer ring, rounded; MultiPolygon coordinates (holes dropped at this scale)."""
    return [[[[round(x, 2), round(y, 2)] for x, y in poly[0]]] for g in geometries for poly in polygons(g)]


def round_geometry(g, places):
    r = lambda c: [round(c[0], places), round(c[1], places)]
    if g["type"] == "Polygon":
        return {"type": "Polygon", "coordinates": [[r(p) for p in ring] for ring in g["coordinates"]]}
    return {"type": "MultiPolygon", "coordinates": [[[r(p) for p in ring] for ring in poly] for poly in g["coordinates"]]}


def main(regions_path, countries_path):
    named = {f["properties"]["NAME"]: f["geometry"] for f in json.loads(Path(regions_path).read_text(encoding="utf-8"))["features"]}
    # land.json sits beside this script: only the script reads it, so it is not published with the site.
    land = [f["geometry"] for f in json.loads((ROOT / "scripts" / "land.json").read_text(encoding="utf-8"))["features"]]
    shapes = {}
    for region in json.loads((DATA / "regions.json").read_text(encoding="utf-8")):
        source = [named[NAMED[region["id"]]]] if region["id"] in NAMED else land
        parts = outer_rings(source) if region["id"] in WHOLE else clip_geometry(source, region["bbox"])
        shapes[region["id"]] = {"type": "MultiPolygon", "coordinates": parts, "outline": NAMED.get(region["id"], "land")}
    (DATA / "region-shapes.json").write_text(json.dumps(shapes, separators=(",", ":"), allow_nan=False), encoding="utf-8")

    countries = [
        {"type": "Feature", "properties": {"name": f["properties"]["NAME"]}, "geometry": round_geometry(f["geometry"], 1)}
        for f in json.loads(Path(countries_path).read_text(encoding="utf-8"))["features"]
    ]
    (DATA / "countries.json").write_text(
        json.dumps({"type": "FeatureCollection", "features": countries}, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )
    print(f"{len(shapes)} region shapes, {len(countries)} countries")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
