"""Write src/stats/fixtures.json: four seeded 240-month series and the answers
pyMannKendall and scipy give for them. Task B2. Run once and commit the output
unedited:  .venv/bin/python scripts/make_stats_fixtures.py
"""

import json
from pathlib import Path

import numpy as np
import pymannkendall as mk
from scipy.stats import linregress

SEED = 20261114
MONTHS = 240
T_CRIT = 1.98  # same fixed t critical value as src/stats olsSlopeCi
OUT = Path(__file__).resolve().parent.parent / "src" / "stats" / "fixtures.json"


def make_series() -> dict[str, np.ndarray]:
    rng = np.random.default_rng(SEED)
    t = np.arange(MONTHS)
    cycle = 3 * np.sin(2 * np.pi * t / 12)

    trend_cycle = 0.01 * t + cycle + rng.normal(0, 0.5, MONTHS)
    cycle_only = cycle + rng.normal(0, 0.5, MONTHS)

    ar = np.zeros(MONTHS)  # AR(1) noise with phi 0.9: strong autocorrelation
    shocks = rng.normal(0, 0.5, MONTHS)
    for i in range(1, MONTHS):
        ar[i] = 0.9 * ar[i - 1] + shocks[i]
    autocorrelated = cycle + ar

    ties = np.round(trend_cycle, 1)  # the first series at 1 decimal, so it has ties

    return {
        "trend_cycle": trend_cycle,
        "cycle_only": cycle_only,
        "autocorrelated": autocorrelated,
        "ties": ties,
    }


def fixture(name: str, y: np.ndarray) -> dict:
    t = np.arange(len(y))
    original = mk.original_test(y)
    seasonal = mk.seasonal_test(y, period=12)
    ols = linregress(t, y)
    return {
        "name": name,
        "y": [float(v) for v in y],
        "original_p": float(original.p),
        "original_slope": float(original.slope),
        "seasonal_p": float(seasonal.p),
        "ols_ci": [float(ols.slope - T_CRIT * ols.stderr), float(ols.slope + T_CRIT * ols.stderr)],
    }


def main() -> None:
    # self-check: the architecture's hand-checked case, before trusting the library on our data
    hand = mk.original_test([1, 2, 3, 4, 5])
    assert abs(hand.p - 0.0275) < 5e-5, hand.p

    fixtures = [fixture(name, y) for name, y in make_series().items()]
    for f in fixtures:
        assert len(f["y"]) == MONTHS
        assert f["ols_ci"][0] < f["ols_ci"][1]

    OUT.write_text(json.dumps(fixtures, indent=1, allow_nan=False) + "\n")
    for f in fixtures:
        print(f'{f["name"]:15} original_p={f["original_p"]:.4g} seasonal_p={f["seasonal_p"]:.4g} '
              f'slope={f["original_slope"]:.5f} ols_ci=[{f["ols_ci"][0]:.5f}, {f["ols_ci"][1]:.5f}]')
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
