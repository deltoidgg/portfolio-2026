# UK domain-list snapshots

Inputs to the UK public-sector scan (see
docs/research/paper-01-design-systems-a11y/UK_SCAN_RECIPE.md). Retrieved 2026-06-12 by
tools/scanner/src/fetch-domains.ts.

| File                    | Source                                                                                                                                                                                                                                                    | Licence                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| govuk-register.csv      | Cabinet Office, "List of .gov.uk domain names" (31 March 2026 edition): https://assets.publishing.service.gov.uk/media/69cbd582024cdf09254f3f7d/List_of_.gov.uk_domain_names_as_of_31_March_2026_1.csv                                                    | Open Government Licence v3.0 |
| govuk-register-2023.csv | Same publication, 30 March 2023 edition — last edition carrying the "Registered for" column; used only to attach registrant names: https://assets.publishing.service.gov.uk/media/6425aa8c60a35e00120cb279/List_of_gov.uk_domains_as_of_30_March_2023.csv | Open Government Licence v3.0 |
| mysociety-councils.csv  | mySociety uk_local_authority_names_and_codes: https://raw.githubusercontent.com/mysociety/uk_local_authority_names_and_codes/master/data/uk_local_authorities.csv                                                                                         | CC-BY 4.0                    |
| nhs-trusts.csv          | Wikidata SPARQL (NHS trusts Q6954197 + NHS foundation trusts Q6954187, current, with official website P856)                                                                                                                                               | CC0                          |
| devolved-curated.csv    | Hand-curated (tools/scanner/src/sources.ts)                                                                                                                                                                                                               | —                            |
| calibration.csv         | Hand-curated detector-validation set (recipe §8); excluded from analysis                                                                                                                                                                                  | —                            |

These snapshots are frozen analysis inputs: re-running the fetch script may produce different
files and would be a logged deviation once the pre-registration is locked.
