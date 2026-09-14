#!/usr/bin/env node
/**
 * Zet ALLEEN wiki.thisline.eu goed.
 * Raakt thisline.eu / www / andere records of pull zones van de hoofdsite niet.
 */
const API = "https://api.bunny.net";
const HOST = "wiki.thisline.eu";
const RECORD_NAME = "wiki";
const ZONE_DOMAIN = "thisline.eu";
const CNAME_TARGET = "mc-kghhhdngwp.bunny.run";
const MC_PULLZONE_ID = 6571141;
const LOOP_PULLZONE_ID = 6571143;
const MC_APP_ID = "JvU6ASVcm2kmxOy";

const FORBIDDEN_NAMES = new Set(["", "@", "*", "www", ZONE_DOMAIN, `www.${ZONE_DOMAIN}`]);
const TYPES = { A: 0, AAAA: 1, CNAME: 2, PULLZONE: 7 };

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

function assertWikiOnly(name) {
  const n = String(name ?? "").trim().toLowerCase();
  if (n !== RECORD_NAME) {
    throw new Error(`Geweigerd: record '${name}' is niet wiki. Hoofddomein blijft onaangeroerd.`);
  }
  if (FORBIDDEN_NAMES.has(n)) {
    throw new Error(`Geweigerd: '${name}' hoort bij het hoofddomein.`);
  }
}

function isWikiRecord(rec) {
  return String(rec.Name ?? "").trim().toLowerCase() === RECORD_NAME;
}

function hostnameList(zone) {
  return (zone.Hostnames || []).map((h) => (typeof h === "string" ? h : h.Value || h.Hostname || "")).filter(Boolean);
}

async function main() {
  console.log("Alleen wiki.thisline.eu. thisline.eu / www blijven onaangeroerd.\n");

  const zones = [];
  let page = 0;
  for (;;) {
    const { data } = await bunny(`/pullzone?page=${page}&perPage=1000`);
    const items = data.Items || data.items || (Array.isArray(data) ? data : []);
    zones.push(...items);
    if (items.length < 1000) break;
    page += 1;
  }

  const mcZone = zones.find((z) => z.Id === MC_PULLZONE_ID);
  if (!mcZone) throw new Error(`Magic Container pull zone ${MC_PULLZONE_ID} niet gevonden.`);
  const mcHosts = hostnameList(mcZone);
  console.log(`MC-zone ${MC_PULLZONE_ID} (${mcZone.Name}): ${mcHosts.join(", ") || "(geen extra hostnames)"}`);

  const mainHosts = new Set([ZONE_DOMAIN, `www.${ZONE_DOMAIN}`]);
  for (const z of zones) {
    const hosts = hostnameList(z).map((h) => h.toLowerCase());
    if (hosts.includes(HOST)) {
      if (z.Id === MC_PULLZONE_ID) {
        console.log(`wiki hangt al op MC-zone ${z.Id}`);
        continue;
      }
      if (hosts.some((h) => mainHosts.has(h))) {
        throw new Error(`Stop: zone ${z.Id} (${z.Name}) heeft wiki én het hoofddomein. Niets gedaan.`);
      }
      console.log(`Haal wiki weg van extra zone ${z.Id} (${z.Name})`);
      await bunny(`/pullzone/${z.Id}/removeHostname`, {
        method: "POST",
        body: { Hostname: HOST },
        allow: [200, 204, 404],
      });
    }
  }

  if (zones.some((z) => z.Id === LOOP_PULLZONE_ID)) {
    const loop = zones.find((z) => z.Id === LOOP_PULLZONE_ID);
    const hosts = hostnameList(loop).map((h) => h.toLowerCase());
    if (hosts.includes(HOST)) {
      if (hosts.some((h) => mainHosts.has(h))) {
        throw new Error("Stop: lus-zone bevat ook het hoofddomein.");
      }
      console.log(`Haal wiki weg van lus-zone ${LOOP_PULLZONE_ID}`);
      await bunny(`/pullzone/${LOOP_PULLZONE_ID}/removeHostname`, {
        method: "POST",
        body: { Hostname: HOST },
        allow: [200, 204, 404],
      });
    }
  }

  const { data: dnsList } = await bunny("/dnszone?page=1&perPage=100");
  const dnsZones = dnsList.Items || dnsList.items || [];
  const dns = dnsZones.find((z) => String(z.Domain || z.Name || "").toLowerCase() === ZONE_DOMAIN);
  if (!dns) throw new Error("DNS-zone thisline.eu niet gevonden.");

  const { data: dnsDetail } = await bunny(`/dnszone/${dns.Id}`);
  const records = dnsDetail.Records || [];
  const wikiRecords = records.filter(isWikiRecord);
  console.log(`DNS thisline.eu id=${dns.Id}; ${wikiRecords.length} wiki-record(s). Overige records: niet aangeraakt.`);

  for (const rec of wikiRecords) {
    assertWikiOnly(rec.Name);
    const type = rec.Type;
    if (![TYPES.A, TYPES.AAAA, TYPES.CNAME, TYPES.PULLZONE].includes(type)) {
      console.log(`Laat wiki-record type ${type} id=${rec.Id} staan`);
      continue;
    }
    console.log(`Verwijder wiki-record type=${type} id=${rec.Id} value=${rec.Value}`);
    await bunny(`/dnszone/${dns.Id}/records/${rec.Id}`, { method: "DELETE", allow: [200, 204, 404] });
  }

  const already = hostnameList(mcZone).some((h) => h.toLowerCase() === HOST);
  if (!already) {
    console.log(`Voeg ${HOST} toe aan MC-zone ${MC_PULLZONE_ID}`);
    await bunny(`/pullzone/${MC_PULLZONE_ID}/addHostname`, {
      method: "POST",
      body: { Hostname: HOST },
      allow: [200, 204],
    });
  }

  console.log(`CNAME wiki → ${CNAME_TARGET} (geen Accelerate)`);
  const cnameBody = {
    Type: TYPES.CNAME,
    Ttl: 300,
    Name: RECORD_NAME,
    Value: CNAME_TARGET,
    Accelerated: false,
  };
  try {
    await bunny(`/dnszone/${dns.Id}/records`, {
      method: "PUT",
      body: cnameBody,
      allow: [200, 201, 204],
    });
  } catch (err) {
    console.log(`PUT records faalde (${err.message}); probeer POST`);
    await bunny(`/dnszone/${dns.Id}/records`, {
      method: "POST",
      body: cnameBody,
      allow: [200, 201, 204],
    });
  }

  try {
    await bunny(`/mc/apps/${MC_APP_ID}`);
  } catch {
    /* optioneel; MC-app niet nodig voor DNS */
  }

  console.log("Wacht 15s op DNS, daarna gratis SSL…");
  await new Promise((r) => setTimeout(r, 15000));
  const cert = await bunny(
    `/pullzone/loadFreeCertificate?hostname=${encodeURIComponent(HOST)}`,
    { allow: [200, 204, 400] },
  );
  if (cert.status === 400) {
    console.log(`SSL later nogmaals: ${cert.data?.Message || JSON.stringify(cert.data)}`);
  } else {
    console.log("SSL-certificaat aangevraagd/geladen.");
  }

  console.log("\nKlaar. Controleer https://wiki.thisline.eu (DNS kan een paar minuten duren).");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
