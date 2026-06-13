"""US confirmatory analysis (H1-H3 + diagnostics 1-6), per the locked pre-registration.

Usage: uv run python us_confirmatory.py [--draws 2000] [--jobs -1]
       [--artifact ../../data/processed/uswds_a11y.parquet] [--out us-confirmatory.json]

Emits data/results/paper-01/us-confirmatory.json (+ a copy in packages/datasets/artifacts/).
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pyfixest as pf
from joblib import Parallel, delayed

from common import (
    ALL_CATEGORIES,
    COMPONENT_CATEGORIES,
    REPO_ROOT,
    US_CONTROLS,
    Estimate,
    cluster_bootstrap_indices,
    extract_estimate,
    fit_category_beta,
    fit_feols,
    fit_fepois,
    one_sided_p,
    prepare_us,
    sha256_of,
    standardized_outcome_gradient,
    write_results,
)

SEED = 20260612


def manual_r2(model, y: pd.Series) -> float:
    resid = np.asarray(model.resid())
    total = np.asarray(y, dtype=float)
    return float(1 - np.nanvar(resid) / np.nanvar(total))


def h1_models(df: pd.DataFrame):
    continuous = fit_fepois(
        f"violations_total ~ ln1p_uswds + {US_CONTROLS} | agency", df, "agency"
    )
    h1_continuous = extract_estimate(continuous, "ln1p_uswds", "ln(1 + uswds_count)")

    strong = fit_fepois(f"violations_total ~ strong + {US_CONTROLS} | agency", df, "agency")
    h1_strong = extract_estimate(strong, "strong", "strong (>=50) vs below-50")

    banded = fit_fepois(
        f"violations_total ~ C(band) + {US_CONTROLS} | agency", df, "agency"
    )
    bands = []
    for band in ("trace", "partial", "likely", "definite"):
        term = f"C(band)[T.{band}]"
        bands.append(extract_estimate(banded, term, f"{band} vs none"))

    irr_by_band = {est.label.split(" ")[0]: est.irr for est in bands}
    monotone = (
        irr_by_band["trace"] <= 1.0
        and irr_by_band["partial"] <= irr_by_band["trace"]
        and irr_by_band["likely"] <= irr_by_band["partial"]
    )
    supported = (
        h1_continuous.beta < 0
        and h1_continuous.pOneSided < 0.05
        and h1_strong.irr < 1.0
        and monotone
    )
    return h1_continuous, h1_strong, bands, monotone, supported


def h2_model(df: pd.DataFrame) -> tuple[Estimate, bool]:
    sub = df[df["uswds_version_major"].isin(["2", "3"])].copy()
    sub["v3"] = (sub["uswds_version_major"] == "3").astype(int)
    model = fit_fepois(
        f"violations_total ~ v3 + ln1p_uswds + {US_CONTROLS} | agency", sub, "agency"
    )
    estimate = extract_estimate(model, "v3", "USWDS v3 vs v2")
    return estimate, bool(estimate.beta < 0 and estimate.pOneSided < 0.05)


def h3_point(df: pd.DataFrame) -> tuple[list[dict], float, float, float]:
    sd_x = float(df["ln1p_uswds"].std())
    categories = []
    comp, temp = [], []
    for name, column in ALL_CATEGORIES.items():
        fit = fit_category_beta(df, column)
        if fit is None:
            continue
        beta, se, n = fit
        beta_std = beta * sd_x
        mechanism = "component" if name in COMPONENT_CATEGORIES else "template"
        categories.append(
            {
                "category": name,
                "mechanism": mechanism,
                "betaStd": beta_std,
                "se": se * sd_x,
                "irr": float(np.exp(beta)),
                "n": int(n),
            }
        )
        (comp if mechanism == "component" else temp).append(beta_std)
    mean_comp = float(np.mean(comp)) if comp else float("nan")
    mean_temp = float(np.mean(temp)) if temp else float("nan")
    return categories, mean_comp, mean_temp, mean_comp - mean_temp


def bootstrap_draw(df: pd.DataFrame, idx: np.ndarray, placebo_df: pd.DataFrame,
                   placebo_idx: np.ndarray) -> dict:
    """One cluster-bootstrap draw: H3 mechanism diff + placebo gradient gaps."""
    out: dict = {"h3_diff": np.nan, "gap_cls": np.nan, "gap_lcp": np.nan}
    sample = df.iloc[idx]
    sd_x = float(sample["ln1p_uswds"].std())
    comp, temp = [], []
    for name, column in ALL_CATEGORIES.items():
        fit = fit_category_beta(sample, column)
        if fit is None:
            continue
        beta_std = fit[0] * sd_x
        (comp if name in COMPONENT_CATEGORIES else temp).append(beta_std)
    if comp and temp:
        out["h3_diff"] = float(np.mean(comp) - np.mean(temp))

    try:
        psample = placebo_df.iloc[placebo_idx]
        a11y, _ = standardized_outcome_gradient(psample, "ln1p_viol")
        cls_grad, _ = standardized_outcome_gradient(psample, "cumulative_layout_shift")
        lcp_grad, _ = standardized_outcome_gradient(psample, "ln_lcp")
        out["gap_cls"] = abs(a11y) - abs(cls_grad)
        out["gap_lcp"] = abs(a11y) - abs(lcp_grad)
    except Exception:
        pass
    return out


def diagnostics(df: pd.DataFrame, placebo_df: pd.DataFrame, h1_strong: Estimate,
                draws_out: dict) -> dict:
    # 1. adoption on maturity (LPM, agency FE)
    adoption = fit_feols(
        "strong ~ dap + dap_missing + hygiene + https_enforced_missing + hsts_missing"
        " + viewport_meta_tag + viewport_meta_tag_missing + asinh_tp + tp_missing"
        " + C(cms_bucket) | agency",
        df,
        "agency",
    )
    terms = []
    for term in ("dap", "hygiene", "viewport_meta_tag", "asinh_tp"):
        terms.append(
            {
                "term": term,
                "coef": float(adoption.coef()[term]),
                "se": float(adoption.se()[term]),
                "pTwoSided": float(adoption.pvalue()[term]),
            }
        )
    try:
        r2_within = float(adoption._r2_within)
    except (AttributeError, TypeError):
        r2_within = None

    # 2. placebos (point estimates on the common placebo subsample)
    a11y_std, _ = standardized_outcome_gradient(placebo_df, "ln1p_viol")
    cls_std, _ = standardized_outcome_gradient(placebo_df, "cumulative_layout_shift")
    lcp_std, _ = standardized_outcome_gradient(placebo_df, "ln_lcp")

    # 3. pooled vs FE attenuation
    pooled = fit_fepois(f"violations_total ~ strong + {US_CONTROLS}", df, "agency")
    pooled_irr = float(np.exp(pooled.coef()["strong"]))
    fe_irr = h1_strong.irr
    shrinkage = 1 - abs(fe_irr - 1) / abs(pooled_irr - 1) if pooled_irr != 1 else 0.0

    # 4. Oster bounds (log-linear analogue, delta=1, Rmax=1.3*R2_controlled)
    controlled = fit_feols(f"ln1p_viol ~ ln1p_uswds + {US_CONTROLS} | agency", df, "agency")
    uncontrolled = fit_feols("ln1p_viol ~ ln1p_uswds", df, "agency")
    beta_c = float(controlled.coef()["ln1p_uswds"])
    beta_u = float(uncontrolled.coef()["ln1p_uswds"])
    r2_c = manual_r2(controlled, df["ln1p_viol"])
    r2_u = manual_r2(uncontrolled, df["ln1p_viol"])
    rmax = min(1.0, 1.3 * r2_c)
    denom = r2_c - r2_u
    beta_star = beta_c - (beta_u - beta_c) * (rmax - r2_c) / denom if denom != 0 else beta_c
    bounds_exclude_zero = (beta_c < 0 and beta_star < 0) or (beta_c > 0 and beta_star > 0)

    # 5. DAP subset
    dap_model = fit_fepois(
        f"violations_total ~ ln1p_uswds + hygiene + https_enforced_missing + hsts_missing"
        f" + viewport_meta_tag + viewport_meta_tag_missing + asinh_tp + tp_missing"
        f" + C(cms_bucket) | agency",
        df[df["dap"] == 1],
        "agency",
    )
    dap_subset = extract_estimate(dap_model, "ln1p_uswds", "ln(1+uswds), DAP subset")

    # 6. functional form
    negbin = negbin_estimate(df)
    p99 = df["violations_total"].quantile(0.99)
    wins = df.assign(viol_w=df["violations_total"].clip(upper=p99))
    wins_model = fit_fepois(f"viol_w ~ ln1p_uswds + {US_CONTROLS} | agency", wins, "agency")
    winsorized = extract_estimate(wins_model, "ln1p_uswds", "ln(1+uswds), winsorized p99")

    return {
        "adoptionOnMaturity": {"terms": terms, "r2Within": r2_within},
        "placebos": {
            "a11yBetaStd": a11y_std,
            "clsBetaStd": cls_std,
            "lcpBetaStd": lcp_std,
            "exceedsCls": bool(abs(a11y_std) > abs(cls_std)),
            "exceedsLcp": bool(abs(a11y_std) > abs(lcp_std)),
            "pVsCls": draws_out["pVsCls"],
            "pVsLcp": draws_out["pVsLcp"],
        },
        "attenuation": {
            "pooledIrr": pooled_irr,
            "feIrr": fe_irr,
            "shrinkagePct": float(shrinkage * 100),
            "collapsed": bool(shrinkage > 0.75),
        },
        "oster": {
            "betaControlled": beta_c,
            "betaUncontrolled": beta_u,
            "r2Controlled": r2_c,
            "r2Uncontrolled": r2_u,
            "rmax": rmax,
            "delta": 1.0,
            "betaStar": float(beta_star),
            "boundsExcludeZero": bool(bounds_exclude_zero),
        },
        "dapSubset": dap_subset.to_dict(),
        "functionalForm": {
            "negbinStrongVsNone": negbin,
            "winsorizedContinuous": winsorized.to_dict(),
            "bandedConsistentWithContinuous": True,  # set by caller after comparing signs
        },
    }


def negbin_estimate(df: pd.DataFrame) -> dict | None:
    """NB2 robustness via statsmodels. Tries agency dummies first; falls back to a
    no-FE specification when the dummied Hessian is singular. None if both fail."""
    import statsmodels.formula.api as smf

    specs = [
        ("strong vs below-50 (NB2, agency dummies)",
         "violations_total ~ strong + dap + hygiene + viewport_meta_tag + asinh_tp"
         " + C(cms_bucket) + C(agency)"),
        ("strong vs below-50 (NB2, no FE)",
         "violations_total ~ strong + dap + hygiene + viewport_meta_tag + asinh_tp"
         " + C(cms_bucket)"),
    ]
    for label, formula in specs:
        try:
            model = smf.negativebinomial(formula, data=df).fit(disp=0, maxiter=300)
            beta = float(model.params["strong"])
            se = float(model.bse["strong"])
            p2 = float(model.pvalues["strong"])
            if not all(np.isfinite([beta, se, p2])):
                print(f"negbin spec '{label}' returned non-finite values", file=sys.stderr)
                continue
            return Estimate(
                label=label,
                beta=beta,
                se=se,
                irr=float(np.exp(beta)),
                ciLow=float(np.exp(beta - 1.96 * se)),
                ciHigh=float(np.exp(beta + 1.96 * se)),
                pOneSided=one_sided_p(beta, p2),
                pTwoSided=p2,
                n=int(model.nobs),
                nClusters=None,
            ).to_dict()
        except Exception as error:  # noqa: BLE001 - recorded as null, disclosed in paper
            print(f"negbin spec '{label}' failed: {error}", file=sys.stderr)
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--draws", type=int, default=2000)
    parser.add_argument("--jobs", type=int, default=-1)
    parser.add_argument(
        "--artifact", default=str(REPO_ROOT / "data" / "processed" / "uswds_a11y.parquet")
    )
    parser.add_argument("--out", default="us-confirmatory.json")
    args = parser.parse_args()

    df = prepare_us(pd.read_parquet(args.artifact))
    print(f"analysis sample: {len(df)} sites, {df['agency'].nunique()} agencies")

    h1_continuous, h1_strong, bands, monotone, h1_supported = h1_models(df)
    print(f"H1 continuous IRR={h1_continuous.irr:.4f} p1={h1_continuous.pOneSided:.2e}")
    h2_estimate, h2_supported = h2_model(df)
    print(f"H2 v3-vs-v2 IRR={h2_estimate.irr:.4f} p1={h2_estimate.pOneSided:.3f}")

    categories, mean_comp, mean_temp, diff = h3_point(df)
    print(f"H3 mean betaStd component={mean_comp:.4f} template={mean_temp:.4f}")

    placebo_df = df[
        df["cumulative_layout_shift"].notna()
        & df["largest_contentful_paint"].notna()
        & (df["largest_contentful_paint"] > 0)
    ].copy()
    placebo_df["ln_lcp"] = np.log(placebo_df["largest_contentful_paint"])
    print(f"placebo subsample: {len(placebo_df)}")

    rng = np.random.default_rng(SEED)
    idx_main = cluster_bootstrap_indices(rng, df["agency"], args.draws)
    idx_placebo = cluster_bootstrap_indices(rng, placebo_df["agency"], args.draws)
    results = Parallel(n_jobs=args.jobs, verbose=1)(
        delayed(bootstrap_draw)(df, idx_main[i], placebo_df, idx_placebo[i])
        for i in range(args.draws)
    )
    h3_diffs = np.array([r["h3_diff"] for r in results], dtype=float)
    gaps_cls = np.array([r["gap_cls"] for r in results], dtype=float)
    gaps_lcp = np.array([r["gap_lcp"] for r in results], dtype=float)

    h3_p = float(np.nanmean(h3_diffs >= 0)) if np.isfinite(h3_diffs).any() else float("nan")
    p_vs_cls = float(np.nanmean(gaps_cls <= 0)) if np.isfinite(gaps_cls).any() else float("nan")
    p_vs_lcp = float(np.nanmean(gaps_lcp <= 0)) if np.isfinite(gaps_lcp).any() else float("nan")

    diag = diagnostics(
        df, placebo_df, h1_strong, {"pVsCls": p_vs_cls, "pVsLcp": p_vs_lcp}
    )
    diag["functionalForm"]["bandedConsistentWithContinuous"] = bool(
        (h1_continuous.beta < 0) == (h1_strong.beta < 0)
    )

    payload = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "artifact": str(Path(args.artifact).relative_to(REPO_ROOT))
            if Path(args.artifact).is_relative_to(REPO_ROOT)
            else args.artifact,
            "artifactSha256": sha256_of(Path(args.artifact)),
            "nAnalysis": int(len(df)),
            "nClusters": int(df["agency"].nunique()),
            "pyfixestVersion": pf.__version__,
            "bootstrapDraws": int(args.draws),
            "seed": SEED,
        },
        "h1": {
            "continuous": h1_continuous.to_dict(),
            "strongVsNone": h1_strong.to_dict(),
            "bands": [b.to_dict() for b in bands],
            "monotoneNoneToLikely": bool(monotone),
            "supported": bool(h1_supported),
        },
        "h2": {"v3VsV2": h2_estimate.to_dict(), "supported": bool(h2_supported)},
        "h3": {
            "categories": categories,
            "meanComponentBetaStd": mean_comp,
            "meanTemplateBetaStd": mean_temp,
            "diff": diff,
            "pOneSided": h3_p,
            "supported": bool(diff < 0 and h3_p < 0.05),
        },
        "diagnostics": diag,
    }
    write_results(payload, args.out)
    print("US confirmatory analysis complete.")


if __name__ == "__main__":
    main()
