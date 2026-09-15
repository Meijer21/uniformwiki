#!/usr/bin/env node
/**
 * Alleen pull zone 6571141 (wiki Magic Container).
 * thisline.eu / zone 6160758 wordt niet aangeraakt.
 * Geen Bunny Shield. Geo + geblokkeerde landen zitten in de pull zone zelf.
 */
const API = "https://api.bunny.net";
const MC_PULLZONE_ID = 6571141;
const MAIN_SITE_ZONE = 6160758;
const HOSTS_OK = new Set(["wiki.thisline.eu", "mc-kghhhdngwp.bunny.run"]);

const EUROPE = new Set([
  "AD", "AL", "AT", "AX", "BA", "BE", "BG", "CH", "CY", "CZ",
  "DE", "DK", "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI",
  "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT",
  "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL",
  "PT", "RO", "RS", "SE", "SI", "SJ", "SK", "SM", "UA", "VA", "XK",
]);

const ISO2 = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW`.split(/\s+/);

function key() {
  const k = process.env.BUNNYNET_API_KEY?.trim();
  if (!k) throw new Error("BUNNYNET_API_KEY ontbreekt");
  return k;
}

async function bunny(path, { method = "GET", body, allow = [200, 204] } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      AccessKey: key(),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!allow.includes(res.status)) {
    throw new Error(`${method} ${path} → ${res.status}: ${data?.Message || data?.detail || text || res.statusText}`);
  }
  return { status: res.status, data };
}

function hostnames(zone) {
  return (zone.Hostnames || zone.hostnames || [])
    .map((h) => (typeof h === "string" ? h : h.Value || h.Hostname || ""))
    .filter(Boolean)
    .map((h) => h.toLowerCase());
}

async function main() {
  const id = Number(process.env.BUNNY_PULLZONE_ID || MC_PULLZONE_ID);
  if (id === MAIN_SITE_ZONE) {
    throw new Error("Geweigerd: dit is de pull zone van thisline.eu.");
  }
  const { data: zone } = await bunny(`/pullzone/${id}`);
  const hosts = hostnames(zone);
  if (hosts.includes("thisline.eu") || hosts.includes("www.thisline.eu")) {
    throw new Error("Geweigerd: deze zone bevat het hoofddomein.");
  }
  const wikiOk = hosts.some((h) => HOSTS_OK.has(h) || h.includes("mc-kghhhdngwp"));
  if (!wikiOk) {
    throw new Error(`Geweigerd: zone ${id} hoort niet bij de wiki (${hosts.join(", ") || "geen hosts"}).`);
  }

  const blocked = ISO2.filter((code) => !EUROPE.has(code));
  console.log(`Zone ${id} (${zone.Name || zone.name}): ${hosts.join(", ")}`);
  console.log(`EU-edges aan, overige regio’s uit. ${blocked.length} landen geblokkeerd. Geen Shield.`);

  await bunny(`/pullzone/${id}`, {
    method: "POST",
    body: {
      EnableGeoZoneEU: true,
      EnableGeoZoneUS: false,
      EnableGeoZoneASIA: false,
      EnableGeoZoneSA: false,
      EnableGeoZoneAF: false,
      BlockedCountries: blocked,
      BudgetRedirectedCountries: [],
      LoggingIPAnonymizationEnabled: true,
      EnableQueryStringOrdering: true,
      EnableCountryCodeVary: false,
    },
  });

  const { data: after } = await bunny(`/pullzone/${id}`);
  const blockedNow = after.BlockedCountries || after.blockedCountries || [];
  console.log(`Klaar. EnableGeoZoneEU=${after.EnableGeoZoneEU} BlockedCountries=${blockedNow.length}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
