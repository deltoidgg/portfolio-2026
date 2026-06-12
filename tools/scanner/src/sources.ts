/**
 * Domain-list sources for the UK scan, per UK_SCAN_RECIPE.md §1.
 * Snapshots are committed to data/inputs/uk-domains/ with provenance.
 */

export const GOVUK_REGISTER_URL =
  "https://assets.publishing.service.gov.uk/media/69cbd582024cdf09254f3f7d/List_of_.gov.uk_domain_names_as_of_31_March_2026_1.csv";

/** Last edition that includes the "Registered for" column; classification aid only (recipe §2). */
export const GOVUK_REGISTER_2023_URL =
  "https://assets.publishing.service.gov.uk/media/6425aa8c60a35e00120cb279/List_of_gov.uk_domains_as_of_30_March_2023.csv";

export const MYSOCIETY_COUNCILS_URL =
  "https://raw.githubusercontent.com/mysociety/uk_local_authority_names_and_codes/master/data/uk_local_authorities.csv";

export const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

/** NHS trust (Q6954197) and NHS foundation trust (Q6954187), current (no dissolution date), with official website. */
export const NHS_TRUSTS_SPARQL = `
SELECT DISTINCT ?trust ?trustLabel ?website WHERE {
  VALUES ?type { wd:Q6954187 wd:Q6954197 }
  ?trust wdt:P31 ?type .
  ?trust wdt:P856 ?website .
  FILTER NOT EXISTS { ?trust wdt:P576 ?dissolved . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?trustLabel
`;

export interface CuratedSite {
  hostname: string;
  orgName: string;
  nation: string;
}

/** Recipe §1: principal devolved-government portals (hand-curated). */
export const DEVOLVED_SITES: CuratedSite[] = [
  { hostname: "www.gov.scot", orgName: "Scottish Government", nation: "Scotland" },
  { hostname: "www.mygov.scot", orgName: "mygov.scot (Scottish Government)", nation: "Scotland" },
  { hostname: "www.parliament.scot", orgName: "Scottish Parliament", nation: "Scotland" },
  { hostname: "www.gov.wales", orgName: "Welsh Government", nation: "Wales" },
  { hostname: "www.llyw.cymru", orgName: "Llywodraeth Cymru (Welsh Government)", nation: "Wales" },
  { hostname: "www.senedd.wales", orgName: "Senedd Cymru (Welsh Parliament)", nation: "Wales" },
  {
    hostname: "www.nidirect.gov.uk",
    orgName: "nidirect (Northern Ireland Executive)",
    nation: "Northern Ireland",
  },
  {
    hostname: "www.niassembly.gov.uk",
    orgName: "Northern Ireland Assembly",
    nation: "Northern Ireland",
  },
];

export interface CalibrationSite {
  hostname: string;
  expected: "adopter" | "non-adopter";
  note: string;
}

/**
 * Recipe §8: fixed calibration set, excluded from analysis. Pass criterion:
 * >= 10/12 adopters score >= 50 and >= 10/12 non-adopters score < 50.
 */
export const CALIBRATION_SITES: CalibrationSite[] = [
  { hostname: "www.gov.uk", expected: "adopter", note: "GOV.UK itself" },
  { hostname: "design-system.service.gov.uk", expected: "adopter", note: "Design System docs" },
  {
    hostname: "find-and-update.company-information.service.gov.uk",
    expected: "adopter",
    note: "Companies House",
  },
  { hostname: "www.registertovote.service.gov.uk", expected: "adopter", note: "Register to vote" },
  { hostname: "data.gov.uk", expected: "adopter", note: "Find open data (govuk-frontend)" },
  { hostname: "vehicleenquiry.service.gov.uk", expected: "adopter", note: "DVLA vehicle enquiry" },
  {
    hostname: "www.viewdrivingrecord.service.gov.uk",
    expected: "adopter",
    note: "DVLA driving record",
  },
  {
    hostname: "www.find-government-grants.service.gov.uk",
    expected: "adopter",
    note: "Find a grant",
  },
  {
    hostname: "www.notifications.service.gov.uk",
    expected: "adopter",
    note: "GOV.UK Notify",
  },
  {
    hostname: "www.payments.service.gov.uk",
    expected: "adopter",
    note: "GOV.UK Pay",
  },
  { hostname: "www.tax.service.gov.uk", expected: "adopter", note: "HMRC services" },
  { hostname: "coronavirus.data.gov.uk", expected: "adopter", note: "UKHSA dashboard (archived)" },
  { hostname: "www.nhs.uk", expected: "non-adopter", note: "NHS.UK frontend, not govuk" },
  { hostname: "www.england.nhs.uk", expected: "non-adopter", note: "NHS England" },
  { hostname: "digital.nhs.uk", expected: "non-adopter", note: "NHS England Digital" },
  { hostname: "www.gov.scot", expected: "non-adopter", note: "Scottish DS" },
  { hostname: "www.mygov.scot", expected: "non-adopter", note: "Scottish DS" },
  { hostname: "www.gov.wales", expected: "non-adopter", note: "Welsh Government DS" },
  { hostname: "www.nidirect.gov.uk", expected: "non-adopter", note: "nidirect DS" },
  { hostname: "www.tfl.gov.uk", expected: "non-adopter", note: "Transport for London" },
  { hostname: "www.parliament.scot", expected: "non-adopter", note: "Scottish Parliament" },
  { hostname: "ico.org.uk", expected: "non-adopter", note: "Information Commissioner" },
  { hostname: "www.nhsinform.scot", expected: "non-adopter", note: "NHS Scotland" },
  { hostname: "www.scotcourts.gov.uk", expected: "non-adopter", note: "Scottish Courts" },
];
