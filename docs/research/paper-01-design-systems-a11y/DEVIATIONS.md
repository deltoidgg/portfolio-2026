# Deviations from pre-registration — running log

Every departure from [PREREGISTRATION.md](./PREREGISTRATION.md) (locked 2026-06-12, tag
`paper-01-prereg`) or [UK_SCAN_RECIPE.md](./UK_SCAN_RECIPE.md) is logged here as it happens and
reproduced in the paper's "Deviations from pre-registration" appendix.

## D1 — Calibration-list repair (2026-06-12, before the full UK scan)

The first calibration run (recipe §8) failed 8/12 + 8/12 — but every failure was a defect of the
calibration _list_, not of the detector. On the 17 sites that actually loaded, detection was
correct for 16 (the one miss being a mislabelled entry, see below). Repairs, verified by
independent fetches before re-running:

**Expected adopters**

- `check-mot.service.gov.uk` — does not resolve (service moved behind www/gov.uk routing).
  Replaced with `www.trade-tariff.service.gov.uk` (verified govuk-template in served HTML).
- `viewdrivingrecord.service.gov.uk` — apex does not resolve; corrected to
  `www.viewdrivingrecord.service.gov.uk` (verified).
- `www.account.gov.uk` — does not resolve unauthenticated (sign-in gated). Replaced with
  `www.apply-for-teacher-training.service.gov.uk` (verified).
- `petition.parliament.uk` — **mislabelled by the analyst**: source inspection shows the
  petitions app uses custom classes (`back-to-parliament`, `banner`…), not govuk-frontend. The
  detector scoring it 0 was correct. Replaced with
  `www.get-information-schools.service.gov.uk` (verified).

**Expected non-adopters**

- `www.parliament.uk`, `www.bankofengland.co.uk`, `www.met.police.uk` — WAF challenge pages
  (recorded as `blocked_waf`; cannot validate detection either way). Replaced with
  `www.judiciary.uk`, `www.nao.org.uk`, `www.nhsinform.scot` (all load, all independently
  expected non-adopters).
- `www.senedd.wales` — returns a non-2xx response; replaced with its canonical host
  `www.senedd.cymru`.

No detector weight, threshold, or band was changed (recipe §8 forbids that). The repaired list
replaces `data/inputs/uk-domains/calibration.csv`; calibration sites remain excluded from the
analysis sample.

### D1 second round (same day)

The repaired list surfaced four more list defects, again fixed with independent verification and
no detector change:

- `www.trade-tariff.service.gov.uk` and `www.apply-for-teacher-training.service.gov.uk` publish
  `Disallow: /` for all agents in robots.txt — the scanner honours robots (recipe §3) so they can
  never complete. Replaced with `www.notifications.service.gov.uk` and
  `www.payments.service.gov.uk` (verified govuk-template, robots-allowed).
- `www.get-information-schools.service.gov.uk` rejects the headless browser (non-2xx). Replaced
  with `data.gov.uk` (verified).
- `www.judiciary.uk` (54 govuk- classes in served HTML) and `www.nao.org.uk` (71) were
  **analyst mislabels**: both genuinely embed govuk-frontend styling — the detector scoring them
  76/88 ("likely") was correct. Replaced as non-adopters by `www.tfl.gov.uk` and
  `www.scotcourts.gov.uk` (verified zero govuk- classes); `www.senedd.cymru` (non-2xx to the
  scanner) replaced by `ico.org.uk` (verified).

A lesson recorded for the paper: "non-adoption" among UK arm's-length bodies is rarer than
assumed — partial govuk-frontend uptake extends well beyond GDS properties.

## D2 — www fallback for apex connection failures (2026-06-12, ~50 sites into the full scan, before any UK analysis)

The recipe (§3) declared navigation to `https://<domain>/`. The first minutes of the full scan
showed a systematic failure mode: some estates (disproportionately local authorities) do not
serve the apex host at all — e.g. `bracknell-forest.gov.uk` and `middevon.gov.uk` refuse or
reset connections on the apex while `https://www.<domain>/` serves 200. Treating these as
non-live would create _differential_ nonresponse by organisation type, biasing the local
stratum. GSA does not face this because federal registrations resolve apex or redirect.

**Change:** when navigation to the apex fails with a connection-level status
(`dns_resolution_error` / `connection_refused` / `connection_reset` / `ssl_error` / `timeout`)
and the hostname does not already start with `www.`, the scanner retries once at
`https://www.<domain>/`. Only a _completed_ fallback replaces the failed row, and such rows are
flagged `usedWwwFallback: true` so the analysis can check sensitivity to their inclusion. No
detection, outcome, or banding logic changed.

The scan was restarted from zero after ~50 sites (all statuses re-collected under the unified
rule), so the frozen raw file contains no mixed-rule rows.

## D3 — Operationalization of the "strong vs none" headline contrast (2026-06-12, after the US run, before any UK estimation)

The prereg's banded H1 form says "IRR(strong vs none) < 1" with strong = likely ∪ definite
(score ≥ 50). The analysis script operationalized the headline single-number contrast as a
binary `strong` dummy on the full sample — whose reference group is every site **below 50**
(none ∪ trace ∪ partial), i.e. "strong vs not-strong", not literally "strong vs the none band".
The pre-registered banded model (estimated alongside, none as reference) gives the none-referenced
IRRs directly: likely 0.456, definite 0.491 — bracketing the strong-dummy estimate of 0.497, so
nothing of substance turns on the choice (trace ∪ partial is ~19% of the reference mass and its
band IRRs are close to 1).

**Change:** estimate labels corrected from "strong (>=50) vs none" to "strong (>=50) vs
below-50" in both analysis scripts; paper prose describes the contrast accurately. No model,
sample, or decision rule changed; the US script re-run reproduces identical estimates (seeded).
The UK script (not yet run at the time of this entry) uses the same construction, keeping the
pre-registered US-vs-UK comparison window apples-to-apples.
