"""Synthetic-data smoke test for the analysis pipeline (no real data touched).

Generates a mini US-shaped and UK-shaped dataset with a planted negative adoption
effect, runs both confirmatory scripts end-to-end with a reduced bootstrap, and
asserts the outputs have the right shape and recover the planted direction.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
VIOL_COLUMNS = [
    "viol_contrast",
    "viol_language",
    "viol_images",
    "viol_link_purpose",
    "viol_aria",
    "viol_user_control_name",
    "viol_lists",
    "viol_page_titled",
    "viol_form_names",
    "viol_frames_iframes",
    "viol_keyboard_access",
]


def synth_us(path: Path, n: int = 900, seed: int = 7) -> None:
    rng = np.random.default_rng(seed)
    agencies = [f"Agency {i}" for i in range(15)]
    agency = rng.choice(agencies, size=n)
    agency_effect = {a: rng.normal(0, 0.4) for a in agencies}
    uswds = np.where(rng.random(n) < 0.35, 0, rng.gamma(2.0, 60, n)).astype(int)
    ln1p = np.log1p(uswds)
    mu = np.exp(1.2 - 0.18 * ln1p + np.array([agency_effect[a] for a in agency]))
    total = rng.poisson(mu)
    shares = rng.dirichlet(np.ones(len(VIOL_COLUMNS)), size=n)
    viols = np.floor(shares * total[:, None]).astype(int)
    frame = pd.DataFrame(
        {
            "url": [f"site{i}.example.gov" for i in range(n)],
            "base_domain": [f"site{i}.example.gov" for i in range(n)],
            "agency": agency,
            "bureau": None,
            "branch": "Executive",
            "scan_date": "2026-06-10",
            "uswds_count": uswds,
            "uswds_semantic_version": np.where(
                rng.random(n) < 0.08, rng.choice(["2.13.3", "3.8.1"], n), None
            ),
            "violations_total": viols.sum(axis=1),
            "dap": rng.random(n) < 0.5,
            "cms": rng.choice(["drupal", "wordpress", None], n, p=[0.3, 0.3, 0.4]),
            "third_party_service_count": rng.poisson(8, n).astype(float),
            "https_enforced": rng.random(n) < 0.8,
            "hsts": rng.random(n) < 0.6,
            "viewport_meta_tag": rng.random(n) < 0.9,
            "main_element_present": rng.random(n) < 0.7,
            "language": "en",
            "cumulative_layout_shift": rng.gamma(1.2, 0.1, n),
            "largest_contentful_paint": rng.gamma(2.5, 900, n),
        }
    )
    frame["uswds_version_major"] = frame["uswds_semantic_version"].map(
        lambda v: v.split(".")[0] if isinstance(v, str) else None
    )
    for i, col in enumerate(VIOL_COLUMNS):
        frame[col] = viols[:, i]
    frame.to_parquet(path)


def synth_uk(path: Path, n: int = 700, seed: int = 11) -> None:
    rng = np.random.default_rng(seed)
    org_types = rng.choice(
        ["central", "local", "parish", "nhs", "devolved"], size=n, p=[0.3, 0.25, 0.3, 0.1, 0.05]
    )
    type_effect = {"central": 0.0, "local": 0.3, "parish": 0.5, "nhs": 0.2, "devolved": 0.1}
    govuk = np.where(rng.random(n) < 0.55, 0, rng.gamma(1.8, 70, n)).astype(int)
    mu = np.exp(1.0 - 0.16 * np.log1p(govuk) + np.array([type_effect[t] for t in org_types]))
    total = rng.poisson(mu)
    frame = pd.DataFrame(
        {
            "hostname": [f"org{i}.gov.uk" for i in range(n)],
            "org_name": [f"Org {i // 2}" for i in range(n)],  # two sites per org cluster
            "org_type": org_types,
            "govuk_count": govuk,
            "violations_total": total,
            "https_enforced": rng.random(n) < 0.75,
            "hsts": rng.random(n) < 0.5,
            "third_party_service_count": rng.poisson(6, n).astype(float),
        }
    )
    frame.to_parquet(path)


def run(script: str, *cli_args: str) -> None:
    result = subprocess.run(
        [sys.executable, str(HERE / script), *cli_args],
        cwd=HERE,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(f"{script} failed with code {result.returncode}")


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        us_parquet = tmpdir / "synth_us.parquet"
        uk_parquet = tmpdir / "synth_uk.parquet"
        synth_us(us_parquet)
        synth_uk(uk_parquet)

        run(
            "us_confirmatory.py",
            "--draws",
            "30",
            "--jobs",
            "4",
            "--artifact",
            str(us_parquet),
            "--out",
            "smoke-us.json",
        )
        from common import RESULTS_DIR

        us = json.loads((RESULTS_DIR / "smoke-us.json").read_text())
        assert us["h1"]["continuous"]["irr"] < 1, "planted negative effect not recovered (US)"
        assert us["h1"]["continuous"]["pOneSided"] < 0.05
        assert len(us["h1"]["bands"]) == 4
        assert len(us["h3"]["categories"]) >= 8
        assert us["diagnostics"]["attenuation"]["pooledIrr"] > 0

        run(
            "uk_confirmatory.py",
            "--artifact",
            str(uk_parquet),
            "--us-results",
            str(RESULTS_DIR / "smoke-us.json"),
            "--out",
            "smoke-uk.json",
        )
        uk = json.loads((RESULTS_DIR / "smoke-uk.json").read_text())
        assert uk["h4"]["strongVsNone"]["irr"] < 1, "planted negative effect not recovered (UK)"
        assert uk["comparison"]["window"] == 0.2

        # clean up smoke artifacts so they are never mistaken for real results
        from common import GENERATED_DIR

        for name in ("smoke-us.json", "smoke-uk.json"):
            (RESULTS_DIR / name).unlink(missing_ok=True)
            (GENERATED_DIR / name).unlink(missing_ok=True)

    print("smoke test passed: pipeline recovers planted effects end-to-end")


if __name__ == "__main__":
    main()
