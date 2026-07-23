# Brand Refresh Visual Verification

Verified: 23 July 2026

## Reference-frame method

The four approved 1055x1491 PNGs were treated as downscaled 1440x2035 desktop frames (scale 1.36493). Playwright captures were produced at 1440x2035 with fonts settled, reduced motion enabled, transitions disabled, and the dark theme fixed before navigation.

The implementation captures live in the ignored `artifacts/quality/brand-refresh/` directory and can be regenerated with:

```sh
vp run site-quality#visual
```

The capture matrix includes all four reference routes in dark and light themes at:

- Desktop: 1440x2035
- Mobile: 390x844

The manifest records each full rendered width and height. The same command loads each approved PNG, normalises the dark desktop top frame, and writes the comparison metrics to `artifacts/quality/brand-refresh/comparison.json`.

## Top-frame comparison

For content longer than the static comp, comparison uses the first 2035 desktop pixels. The frame is resized to 1055x1491 with the same proportions as the reference, then compared in RGB and luminance space.

| Reference                | RGB mean absolute error | Luma mean absolute error | Pixels differing by more than 24/255 |
| ------------------------ | ----------------------: | -----------------------: | -----------------------------------: |
| Portfolio homepage       |                   12.23 |                    12.26 |                                9.24% |
| Writing article          |                   14.15 |                    14.78 |                               11.54% |
| Research Lab             |                   10.91 |                    10.90 |                                8.67% |
| FPL portfolio case study |                   13.96 |                    14.07 |                               10.57% |

These are review metrics rather than pass/fail thresholds. They include text rasterisation, verified copy differences, real charts, and real project media. The homepage and Research Lab both render at exactly 1440x2035; the article and case study continue below the comp because the repository contains more verified content than the static designs.

## Browser verification

`vp run site-quality#test` checks:

- Every portfolio route, including About and not-found states
- Every Research Lab route, both live data explorers, invalid search state, and not-found states
- Dark and light themes
- 320, 390, 768, and 1440px viewports
- Horizontal overflow
- Browser console and uncaught page errors
- WCAG 2.0/2.1 A and AA axe rules
- A separate minimal FPL technical smoke check, without applying or evaluating the portfolio visual identity

Result: **136 route/theme/viewport combinations passed.**

## Content and asset verification

- The article, case study, paper, and explorer use existing repository content and frozen datasets.
- Metrics are imported from the published US and UK result artifacts.
- The standalone FPL app has no source changes.
- RSS and both sitemaps parse as valid XML.
- All eight social cards are 1200x630.
- The WA SVG favicon is present in portfolio and Research Lab only.
- Mobile menus dismiss on Escape and restore focus to their trigger.
- Reduced-motion rules remove nonessential transitions and animation.

## Deliberate reference deviations

- No invented papers, articles, clients, metrics, testimonials, or newsletter claims.
- The real article and case studies are longer than the comps.
- The author portrait remains the approved WA monogram placeholder.
- Live code-native charts and dataset tools replace flattened mock graphics.
- The light theme is a warm-paper translation of the system rather than a colour inversion.
- The standalone FPL product retains its independent brand.
