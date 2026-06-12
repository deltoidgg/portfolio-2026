"""UK replication (H4) + US-vs-UK comparison, per the locked pre-registration.

Usage: uv run python uk_confirmatory.py [--artifact ../../data/processed/govuk_a11y.parquet]
       [--us-results ../../data/results/paper-01/us-confirmatory.json] [--out uk-confirmatory.json]
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pyfixest as pf

from common import (
    REPO_ROOT,
    extract_estimate,
    fit_fepois,
    sha256_of,
    write_results,
)

UK_CONTROLS = "hygiene + https_enforced_missing + hsts_missing + asinh_tp + tp_missing"
COMPARISON_WINDOW = 0.20


def prepare_uk(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["ln1p_govuk"] = np.log1p(out["govuk_count"].astype(float))
    out["strong"] = (out["govuk_count"] >= 50).astype(int)

    def band(count: float) -> str:
        if count <= 0:
            return "none"
        if count <= 24:
            return "trace"
        if count <= 49:
            return "partial"
        if count <= 99:
            return "likely"
        return "definite"

    out["band"] = pd.Categorical(
        out["govuk_count"].map(band),
        categories=["none", "trace", "partial", "likely", "definite"],
        ordered=True,
    )

    for col in ("https_enforced", "hsts"):
        missing = out[col].isna()
        out[f"{col}_missing"] = missing.astype(int)
        out[col] = out[col].fillna(False).astype(bool).astype(int)
    out["hygiene"] = out["https_enforced"] + out["hsts"]

    tp = out["third_party_service_count"].astype(float)
    out["tp_missing"] = tp.isna().astype(int)
    out["asinh_tp"] = np.arcsinh(tp.fillna(0.0))

    # Cluster: registrant organisation where known, else the site's own hostname (prereg H4).
    out["cluster_org"] = out["org_name"].fillna(out["hostname"]).astype(str)
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--artifact", default=str(REPO_ROOT / "data" / "processed" / "govuk_a11y.parquet")
    )
    parser.add_argument(
        "--us-results",
        default=str(REPO_ROOT / "data" / "results" / "paper-01" / "us-confirmatory.json"),
    )
    parser.add_argument("--out", default="uk-confirmatory.json")
    args = parser.parse_args()

    df = prepare_uk(pd.read_parquet(args.artifact))
    print(
        f"UK analysis sample: {len(df)} sites, {df['org_type'].nunique()} org types, "
        f"{df['cluster_org'].nunique()} clusters"
    )

    strong_model = fit_fepois(
        f"violations_total ~ strong + {UK_CONTROLS} | org_type", df, "cluster_org"
    )
    strong = extract_estimate(strong_model, "strong", "strong (>=50) vs below-50")
    print(f"H4 strong-vs-none IRR={strong.irr:.4f} p1={strong.pOneSided:.2e}")

    continuous_model = fit_fepois(
        f"violations_total ~ ln1p_govuk + {UK_CONTROLS} | org_type", df, "cluster_org"
    )
    continuous = extract_estimate(continuous_model, "ln1p_govuk", "ln(1 + govuk_count)")

    banded_model = fit_fepois(
        f"violations_total ~ C(band) + {UK_CONTROLS} | org_type", df, "cluster_org"
    )
    bands = []
    for band in ("trace", "partial", "likely", "definite"):
        term = f"C(band)[T.{band}]"
        try:
            bands.append(extract_estimate(banded_model, term, f"{band} vs none"))
        except KeyError:
            pass  # a band can be empty in the UK sample; reported as absent

    direction_supported = bool(strong.irr < 1 and strong.pOneSided < 0.05)

    us = json.loads(Path(args.us_results).read_text())
    us_irr = float(us["h1"]["strongVsNone"]["irr"])
    abs_diff = abs(strong.irr - us_irr)
    within = bool(abs_diff <= COMPARISON_WINDOW)

    payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "artifact": str(Path(args.artifact).relative_to(REPO_ROOT))
            if Path(args.artifact).is_relative_to(REPO_ROOT)
            else args.artifact,
            "artifactSha256": sha256_of(Path(args.artifact)),
            "nAnalysis": int(len(df)),
            "nClusters": int(df["cluster_org"].nunique()),
            "pyfixestVersion": pf.__version__,
        },
        "h4": {
            "strongVsNone": strong.to_dict(),
            "continuous": continuous.to_dict(),
            "bands": [b.to_dict() for b in bands],
            "directionSupported": direction_supported,
        },
        "comparison": {
            "usIrr": us_irr,
            "ukIrr": strong.irr,
            "absDiff": abs_diff,
            "window": COMPARISON_WINDOW,
            "withinWindow": within,
        },
        "supported": bool(direction_supported and within),
    }
    write_results(payload, args.out)
    print("UK replication analysis complete.")


if __name__ == "__main__":
    main()
