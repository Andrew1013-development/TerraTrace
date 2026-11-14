from make_map_shapes import clip_geometry, clip_ring

BOX = [0, 0, 10, 10]  # south, west, north, east


def test_a_ring_inside_the_box_is_unchanged():
    ring = [[2, 2], [2, 8], [8, 8], [8, 2], [2, 2]]
    assert clip_ring(ring, BOX) == ring


def test_a_ring_crossing_the_box_is_cut_at_its_edges():
    ring = [[-5, 5], [5, 15], [15, 5], [5, -5], [-5, 5]]  # a diamond larger than the box
    clipped = clip_ring(ring, BOX)
    assert clipped[0] == clipped[-1]
    assert all(0 <= x <= 10 and 0 <= y <= 10 for x, y in clipped)
    assert len(clipped) > 4  # the corners of the box are cut off, so more vertices than a square


def test_a_ring_outside_the_box_disappears():
    assert clip_ring([[20, 20], [20, 30], [30, 30], [20, 20]], BOX) is None


def test_clip_geometry_keeps_only_parts_inside_and_rounds():
    geoms = [
        {"type": "Polygon", "coordinates": [[[1.234, 1.234], [1.234, 3], [3, 3], [1.234, 1.234]]]},
        {"type": "Polygon", "coordinates": [[[50, 50], [50, 60], [60, 60], [50, 50]]]},
    ]
    parts = clip_geometry(geoms, BOX)
    assert len(parts) == 1
    assert parts[0][0][0] == [1.23, 1.23]
