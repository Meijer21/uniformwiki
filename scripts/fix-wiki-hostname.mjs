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

function zoneId(z) {
  return z?.Id ?? z?.id;
}

function hostnameList(zone) {
  return (zone.Hostnames || zone.hostnames || []).map((h) => {
    if (typeof h === "string") return h;
    return h.Value || h.Hostname || h.value || h.hostname || "";
  }).filter(Boolean);
}

function hasMainSite(zone) {
  const hosts = hostnameList(zone).map((h) => h.toLowerCase());
  return hosts.includes(ZONE_DOMAIN) || hosts.includes(`www.${ZONE_DOMAIN}`);
}

async function getPullZone(id) {
  const { status, data } = await bunny(`/pullzone/${id}`, { allow: [200, 404] });
  if (status === 404) return null;
  return data;
}

async function listPullZones() {
  const zones = [];
  for (const page of [1, 0]) {
    const { status, data } = await bunny(`/pullzone?page=${page}&perPage=1000`, { allow: [200, 400] });
    if (status !== 200 || !data) continue;
    const items = data.Items || data.items || (Array.isArray(data) ? data : []);
    if (items.length) {
      console.log(`Pull zones pagina ${page}: ${items.length} (keys: ${Object.keys(items[0] || {}).slice(0, 8).join(",")})`);
      zones.push(...items);
      break;
    }
  }
  return zones;
}

async function resolveMcPullZone(zones) {
  const fromId = await getPullZone(MC_PULLZONE_ID);
  if (fromId) {
    console.log(`MC-zone via id ${MC_PULLZONE_ID}: ${fromId.Name || fromId.name}`);
    return fromId;
  }

  try {
    const { data: app } = await bunny(`/mc/apps/${MC_APP_ID}`);
    const endpoints = (app.containerTemplates || []).flatMap((t) => t.endpoints || []);
    const pz = endpoints.map((e) => e.pullZoneId).find(Boolean);
    if (pz) {
      const z = await getPullZone(Number(pz));
      if (z) {
        console.log(`MC-zone via app ${MC_APP_ID}: ${pz}`);
        return z;
      }
    }
  } catch (err) {
    console.log(`MC-app lookup: ${err.message}`);
  }

  const byHost = zones.find((z) =>
    hostnameList(z).some((h) => h.toLowerCase().includes("mc-kghhhdngwp") || h.toLowerCase() === CNAME_TARGET),
  );
  if (byHost) return byHost;

  throw new Error("Magic Container pull zone niet gevonden (lijst + id + app).");
}

async function main() {
  console.log("Alleen wiki.thisline.eu. thisline.eu / www blijven onaangeroerd.\n");

  const zones = await listPullZones();
  const mcZone = await resolveMcPullZone(zones);
  const mcId = zoneId(mcZone);
  const mcHosts = hostnameList(mcZone);
  console.log(`MC-zone ${mcId} (${mcZone.Name || mcZone.name}): ${mcHosts.join(", ") || "(geen extra hostnames)"}`);

  const knownIds = new Set(zones.map(zoneId).filter((id) => id != null));
  for (const extraId of [LOOP_PULLZONE_ID, mcId]) {
    if (!knownIds.has(extraId)) {
      const extra = await getPullZone(extraId);
      if (extra) {
        zones.push(extra);
        knownIds.add(extraId);
      }
    }
  }

  for (const z of zones) {
    const id = zoneId(z);
    const hosts = hostnameList(z).map((h) => h.toLowerCase());
    if (!hosts.includes(HOST)) continue;
    if (id === mcId) {
      console.log(`wiki hangt al op MC-zone ${id}`);
      continue;
    }
    if (hasMainSite(z)) {
      throw new Error(`Stop: zone ${id} (${z.Name || z.name}) heeft wiki én het hoofddomein. Niets gedaan.`);
    }
    console.log(`Haal wiki weg van extra zone ${id} (${z.Name || z.name})`);
    await bunny(`/pullzone/${id}/removeHostname`, {
      method: "POST",
      body: { Hostname: HOST },
      allow: [200, 204, 404],
    });
  }

  const loop = await getPullZone(LOOP_PULLZONE_ID);
  if (loop && hostnameList(loop).some((h) => h.toLowerCase() === HOST)) {
    if (hasMainSite(loop)) throw new Error("Stop: lus-zone bevat ook het hoofddomein.");
    console.log(`Haal wiki weg van lus-zone ${LOOP_PULLZONE_ID}`);
    await bunny(`/pullzone/${LOOP_PULLZONE_ID}/removeHostname`, {
      method: "POST",
      body: { Hostname: HOST },
      allow: [200, 204, 404],
    });
  }

  const { data: dnsList } = await bunny("/dnszone?page=1&perPage=100");
  const dnsZones = dnsList.Items || dnsList.items || [];
  const dns = dnsZones.find((z) => String(z.Domain || z.Name || "").toLowerCase() === ZONE_DOMAIN);
  if (!dns) throw new Error("DNS-zone thisline.eu niet gevonden.");

  const dnsId = dns.Id ?? dns.id;
  const { data: dnsDetail } = await bunny(`/dnszone/${dnsId}`);
  const records = dnsDetail.Records || dnsDetail.records || [];
  const wikiRecords = records.filter(isWikiRecord);
  console.log(`DNS thisline.eu id=${dnsId}; ${wikiRecords.length} wiki-record(s). Overige records: niet aangeraakt.`);

  for (const rec of wikiRecords) {
    assertWikiOnly(rec.Name ?? rec.name);
    const type = rec.Type ?? rec.type;
    const recId = rec.Id ?? rec.id;
    if (![TYPES.A, TYPES.AAAA, TYPES.CNAME, TYPES.PULLZONE].includes(type)) {
      console.log(`Laat wiki-record type ${type} id=${recId} staan`);
      continue;
    }
    console.log(`Verwijder wiki-record type=${type} id=${recId} value=${rec.Value ?? rec.value}`);
    await bunny(`/dnszone/${dnsId}/records/${recId}`, { method: "DELETE", allow: [200, 204, 404] });
  }

  const refreshed = (await getPullZone(mcId)) || mcZone;
  const already = hostnameList(refreshed).some((h) => h.toLowerCase() === HOST);
  if (!already) {
    console.log(`Voeg ${HOST} toe aan MC-zone ${mcId}`);
    await bunny(`/pullzone/${mcId}/addHostname`, {
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
    await bunny(`/dnszone/${dnsId}/records`, {
      method: "PUT",
      body: cnameBody,
      allow: [200, 201, 204],
    });
  } catch (err) {
    console.log(`PUT records faalde (${err.message}); probeer POST`);
    await bunny(`/dnszone/${dnsId}/records`, {
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

  console.log("Wacht 40s op DNS, daarna gratis SSL…");
  await new Promise((r) => setTimeout(r, 40000));
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
