import { describe, expect, it } from "vitest";
import {
  buildCouncilIndex,
  buildUniverse,
  classifyOrg,
  normalizeName,
  parseCouncils,
} from "../src/universe.ts";

const COUNCILS_CSV = `local-authority-code,official-name,nice-name,gss-code,start-date,end-date,replaced-by,nation,region,local-authority-type,local-authority-type-name,county-la,combined-authority,alt-names,former-gss-codes,notes,current-authority,BS-6879,ecode,even-older-register-and-code,gov-uk-slug,area,pop-2020,x,y,lat,long,powers,lower-or-unitary,mapit-area-code,ofcom,old-ons-la-code,old-register-and-code,open-council-data-id,os-file,os,snac,wdtk-id
CMD,Camden Borough Council,Camden,E09000007,1965-04-01,,,England,London,LBO,London borough,,,London Borough of Camden,,,True,,,,camden,21.8,270029.0,,,,,,True,,,,,,,,,
WSM,Westminster City Council,Westminster,E09000033,1965-04-01,,,England,London,LBO,London borough,,,City of Westminster,,,True,,,,westminster,21.5,261317.0,,,,,,True,,,,,,,,,
OLD,Old Defunct Council,Defunct,E07000999,1974-04-01,2009-03-31,,England,,NMD,Non-metropolitan district,,,,,,False,,,,defunct,,,,,,,,True,,,,,,,,,`;

const REGISTER_2023_CSV = `Domain: Domain Name,Registered for
camden.gov.uk,Camden Borough Council
kentford-pc.gov.uk,Kentford Parish Council
dwp.gov.uk,Department for Work and Pensions
nhsbsa.gov.uk,NHS Business Services Authority`;

const REGISTER_CSV = `Domain Name
camden.gov.uk
kentford-pc.gov.uk
dwp.gov.uk
nhsbsa.gov.uk
newparishcouncil.gov.uk
brandnew.gov.uk
_dmarc.gov.uk`;

const NHS_CSV = `entity,name,website
http://www.wikidata.org/entity/Q1,Airedale NHS Foundation Trust,https://www.airedale-trust.nhs.uk/`;

describe("normalizeName", () => {
  it("normalizes punctuation and ampersands", () => {
    expect(normalizeName("Armagh City, Banbridge & Craigavon Borough Council")).toBe(
      "armagh city banbridge and craigavon borough council",
    );
  });
});

describe("classifyOrg rules (recipe §2 order)", () => {
  const index = buildCouncilIndex(parseCouncils(COUNCILS_CSV));

  it("rule 1: registrant matching a current principal authority -> local", () => {
    const result = classifyOrg({
      hostname: "camden.gov.uk",
      registrant: "Camden Borough Council",
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("local");
    expect(result.nation).toBe("England");
  });

  it("rule 1: hostname slug match without registrant -> local", () => {
    const result = classifyOrg({
      hostname: "westminster.gov.uk",
      registrant: null,
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("local");
  });

  it("does not match defunct authorities", () => {
    const result = classifyOrg({
      hostname: "defunct.gov.uk",
      registrant: "Old Defunct Council",
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("central");
  });

  it("rule 2: parish registrant -> parish", () => {
    const result = classifyOrg({
      hostname: "kentford-pc.gov.uk",
      registrant: "Kentford Parish Council",
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("parish");
  });

  it("rule 2: parish hostname pattern without registrant -> parish", () => {
    const result = classifyOrg({
      hostname: "newparishcouncil.gov.uk",
      registrant: null,
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("parish");
  });

  it("rule 3: NHS registrant -> nhs", () => {
    const result = classifyOrg({
      hostname: "nhsbsa.gov.uk",
      registrant: "NHS Business Services Authority",
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("nhs");
  });

  it("rule 4: devolved hostname -> devolved", () => {
    const result = classifyOrg({
      hostname: "anything.gov.scot",
      registrant: null,
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("devolved");
  });

  it("rule 5: default -> central", () => {
    const result = classifyOrg({
      hostname: "dwp.gov.uk",
      registrant: "Department for Work and Pensions",
      source: "govuk-register",
      councilIndex: index,
    });
    expect(result.orgType).toBe("central");
  });
});

describe("buildUniverse", () => {
  it("unions sources, attaches registrants, skips junk rows, dedupes", () => {
    const universe = buildUniverse({
      register: REGISTER_CSV,
      register2023: REGISTER_2023_CSV,
      councils: COUNCILS_CSV,
      nhsTrusts: NHS_CSV,
    });
    const byHostname = new Map(universe.map((site) => [site.hostname, site]));
    expect(byHostname.has("_dmarc.gov.uk")).toBe(false);
    expect(byHostname.get("camden.gov.uk")?.orgType).toBe("local");
    expect(byHostname.get("kentford-pc.gov.uk")?.orgType).toBe("parish");
    expect(byHostname.get("dwp.gov.uk")?.orgType).toBe("central");
    expect(byHostname.get("nhsbsa.gov.uk")?.orgType).toBe("nhs");
    expect(byHostname.get("brandnew.gov.uk")?.orgType).toBe("central");
    expect(byHostname.get("www.airedale-trust.nhs.uk")?.orgType).toBe("nhs");
    expect(byHostname.get("www.airedale-trust.nhs.uk")?.source).toBe("nhs-trusts");
    // devolved curated list included
    expect(byHostname.get("www.gov.scot")?.orgType).toBe("devolved");
    expect(universe.length).toBe(6 + 1 + 8); // register(6 valid) + nhs(1) + devolved(8)
  });
});
