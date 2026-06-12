"""Shared helpers for the Paper 01 confirmatory analysis (locked pre-registration).

Estimation: Poisson quasi-maximum-likelihood (PPML) with fixed effects via pyfixest,
cluster-robust SEs. Estimates are reported as incidence-rate ratios (IRR = exp(beta)).
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import pyfixest as pf
from scipy import stats

REPO_ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = REPO_ROOT / "data" / "results" / "paper-01"
GENERATED_DIR = REPO_ROOT / "apps" / "research" / "src" / "generated"

Z95 = 1.959963984540054


@dataclass
class Estimate:
    label: str
    beta: float
    se: float
    irr: float
    ciLow: float
    ciHigh: float
    pOneSided: float
    pTwoSided: float
    n: int
    nClusters: int | None

    def to_dict(self) -> dict:
        return asdict(self)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def one_sided_p(beta: float, p_two_sided: float, *, negative_is_support: bool = True) -> float:
    """One-sided p for the pre-registered direction (beta < 0 unless stated otherwise)."""
    if math.isnan(p_two_sided):
        return float("nan")
    if (beta < 0) == negative_is_support:
        return p_two_sided / 2
    return 1 - p_two_sided / 2


def extract_estimate(
    model,
    term: str,
    label: str,
    *,
    negative_is_support: bool = True,
) -> Estimate:
    """Pull one coefficient out of a fitted pyfixest model as an IRR estimate."""
    coefs = model.coef()
    ses = model.se()
    pvals = model.pvalue()
    beta = float(coefs[term])
    se = float(ses[term])
    p2 = float(pvals[term])
    n_clusters = None
    try:
        # pyfixest stores G (number of clusters) for CRV inference
        n_clusters = int(model._G[0])
    except (AttributeError, TypeError, IndexError):
        n_clusters = None
    return Estimate(
        label=label,
        beta=beta,
        se=se,
        irr=float(np.exp(beta)),
        ciLow=float(np.exp(beta - Z95 * se)),
        ciHigh=float(np.exp(beta + Z95 * se)),
        pOneSided=one_sided_p(beta, p2, negative_is_support=negative_is_support),
        pTwoSided=p2,
        n=int(model._N),
        nClusters=n_clusters,
    )


def fit_fepois(formula: str, data: pd.DataFrame, cluster: str):
    return pf.fepois(formula, data=data, vcov={"CRV1": cluster})


def fit_feols(formula: str, data: pd.DataFrame, cluster: str):
    return pf.feols(formula, data=data, vcov={"CRV1": cluster})


def cluster_bootstrap_indices(
    rng: np.random.Generator, clusters: pd.Series, draws: int
) -> list[np.ndarray]:
    """Resample clusters with replacement; return row-index arrays per draw."""
    unique = clusters.unique()
    by_cluster = {c: np.flatnonzero(clusters.to_numpy() == c) for c in unique}
    out = []
    for _ in range(draws):
        sampled = rng.choice(unique, size=len(unique), replace=True)
        out.append(np.concatenate([by_cluster[c] for c in sampled]))
    return out


def _non_finite_paths(value, path: str = "$") -> list[str]:
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in _non_finite_paths(v, f"{path}.{k}")]
    if isinstance(value, (list, tuple)):
        return [p for i, v in enumerate(value) for p in _non_finite_paths(v, f"{path}[{i}]")]
    if isinstance(value, float) and not math.isfinite(value):
        return [path]
    return []


def write_results(payload: dict, filename: str) -> None:
    bad = _non_finite_paths(payload)
    if bad:
        raise ValueError(f"non-finite values in results payload: {', '.join(bad)}")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, allow_nan=False) + "\n"
    # Match oxfmt's JSON number style (e-5, not e-05) so `vp check` stays clean.
    text = re.sub(r"e([+-])0(\d)", r"e\g<1>\g<2>", text)
    for target in (RESULTS_DIR / filename, GENERATED_DIR / filename):
        target.write_text(text)
        print(f"wrote {target}")


def nan_safe(value: float, fallback: float = 0.0) -> float:
    return fallback if (value is None or math.isnan(value)) else float(value)


# --- US data preparation -----------------------------------------------------------------


def prepare_us(df: pd.DataFrame) -> pd.DataFrame:
    """Derived columns per the locked prereg §2 (missing controls -> explicit indicators)."""
    out = df.copy()
    out["ln1p_uswds"] = np.log1p(out["uswds_count"].astype(float))
    out["strong"] = (out["uswds_count"] >= 50).astype(int)

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
        out["uswds_count"].map(band),
        categories=["none", "trace", "partial", "likely", "definite"],
        ordered=True,
    )

    for col in ("dap", "https_enforced", "hsts", "viewport_meta_tag"):
        missing = out[col].isna()
        out[f"{col}_missing"] = missing.astype(int)
        out[col] = out[col].fillna(False).astype(bool).astype(int)
    out["hygiene"] = out["https_enforced"] + out["hsts"]

    tp = out["third_party_service_count"].astype(float)
    out["tp_missing"] = tp.isna().astype(int)
    out["asinh_tp"] = np.arcsinh(tp.fillna(0.0))

    cms = out["cms"].astype("string")
    top10 = cms.dropna().value_counts().head(10).index
    out["cms_bucket"] = (
        cms.where(cms.isin(top10), other="other").fillna("none_detected").astype(str)
    )

    out["ln1p_viol"] = np.log1p(out["violations_total"].astype(float))
    return out


US_CONTROLS = (
    "dap + dap_missing + hygiene + https_enforced_missing + hsts_missing"
    " + viewport_meta_tag + viewport_meta_tag_missing + asinh_tp + tp_missing"
    " + C(cms_bucket)"
)

COMPONENT_CATEGORIES = {
    "contrast": "viol_contrast",
    "aria": "viol_aria",
    "form-names": "viol_form_names",
    "user-control-name": "viol_user_control_name",
    "link-purpose": "viol_link_purpose",
    "keyboard-access": "viol_keyboard_access",
}
TEMPLATE_CATEGORIES = {
    "language": "viol_language",
    "page-titled": "viol_page_titled",
    "images": "viol_images",
    "lists": "viol_lists",
    "frames-iframes": "viol_frames_iframes",
}
ALL_CATEGORIES = {**COMPONENT_CATEGORIES, **TEMPLATE_CATEGORIES}


def fit_category_beta(
    data: pd.DataFrame, column: str, cluster: str = "agency"
) -> tuple[float, float, float] | None:
    """Return (beta, se, irr-ready beta) for one category PPML, or None if it fails."""
    try:
        model = fit_fepois(
            f"{column} ~ ln1p_uswds + {US_CONTROLS} | agency", data, cluster
        )
        return float(model.coef()["ln1p_uswds"]), float(model.se()["ln1p_uswds"]), float(
            model._N
        )
    except Exception:
        return None


def t_test_one_sided_greater(diff_draws: np.ndarray, observed: float) -> float:
    """Bootstrap p for H: observed difference < 0 (component steeper)."""
    valid = diff_draws[~np.isnan(diff_draws)]
    if len(valid) == 0:
        return float("nan")
    return float(np.mean(valid >= 0))


def standardized_outcome_gradient(
    data: pd.DataFrame, outcome: str, cluster: str = "agency"
) -> tuple[float, float]:
    """OLS gradient of z-scored outcome on ln1p_uswds (+ controls + FE); returns (betaStd, se)."""
    z = (data[outcome] - data[outcome].mean()) / data[outcome].std()
    frame = data.assign(_z_outcome=z)
    model = fit_feols(f"_z_outcome ~ ln1p_uswds + {US_CONTROLS} | agency", frame, cluster)
    sd_x = float(frame["ln1p_uswds"].std())
    return float(model.coef()["ln1p_uswds"]) * sd_x, float(model.se()["ln1p_uswds"]) * sd_x
