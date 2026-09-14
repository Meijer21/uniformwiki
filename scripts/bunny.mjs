#!/usr/bin/env node
/**
 * Bunny Magic Containers CLI voor Cursor- en CI-deploys.
 * Eenmalig: export BUNNYNET_API_KEY=…  (account-API-key, geen sub-user)
 *
 *   node scripts/bunny.mjs apps
 *   node scripts/bunny.mjs registries
 *   node scripts/bunny.mjs regions
 *   node scripts/bunny.mjs get [appId]
 *   node scripts/bunny.mjs provision
 *   node scripts/bunny.mjs update-image --tag <sha>
 *   node scripts/bunny.mjs deploy [appId]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MC = "https://api.bunny.net/mc";

function usage(code = 0) {
  console.log(`Bunny Magic Containers — Cursor-workflow

Vereist:  BUNNYNET_API_KEY  (bunny.net → accountmenu → API)

Commando's:
  apps                         Lijst Magic Container-apps
  registries                   Image-registries (pak ghcr.io-id)
  regions                      Regio's (Parijs is meestal FR)
  get [appId]                  App-detail (id of BUNNY_APP_ID / spec-naam)
  provision                    Maak de app uit deploy/magic-container.json
                               als die nog niet bestaat; daarna deploy
  create                       Altijd een nieuwe app (faalt bij dubbele naam)
  update-image                 Zet image-tag en start rolling update
  deploy [appId]               POST /apps/{id}/deploy

Flags:
  --spec <pad>                 Standaard deploy/magic-container.json
  --app <id>                   App-id
  --container <naam>           Container in de app
  --tag <tag>                  Image-tag (github.sha of latest)
  --region <id>                o.a. FR
  --json                       Ruwe JSON

Env bij provision/create:
  BUNNY_IMAGE_REGISTRY_ID      Anders: eerste ghcr.io-registry
  BUNNY_ENV_<NAAM>=waarde      Extra container-env (bijv. BUNNY_ENV_ADMIN_API_KEY)
`);
  process.exit(code);
}

function args() {
  const argv = process.argv.slice(2);
  const cmd = argv.find((a) => !a.startsWith("-")) ?? "help";
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === cmd && positional.length === 0 && !a.startsWith("-")) continue;
    if (a === "--json") {
      flags.json = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[++i] : "true";
      flags[key] = val;
      continue;
    }
    positional.push(a);
  }
  return { cmd, flags, positional };
}

function apiKey() {
  const key = process.env.BUNNYNET_API_KEY?.trim();
  if (!key) {
    console.error("Zet BUNNYNET_API_KEY (account-API-key van bunny.net, geen sub-user).");
    process.exit(1);
  }
  return key;
}

async function mc(path, { method = "GET", body } = {}) {
  const res = await fetch(`${MC}${path}`, {
    method,
    headers: {
      AccessKey: apiKey(),
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
  if (!res.ok) {
    const detail = data?.detail || data?.title || text || res.statusText;
    const err = new Error(`${method} ${path} → ${res.status}: ${detail}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function loadSpec(flags) {
  const path = resolve(flags.spec || process.env.BUNNY_SPEC || join(ROOT, "deploy/magic-container.json"));
  if (!existsSync(path)) {
    throw new Error(`Spec ontbreekt: ${path}`);
  }
  return { path, spec: JSON.parse(readFileSync(path, "utf8")) };
}

function extraEnvFromProcess() {
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("BUNNY_ENV_") || v == null || v === "") continue;
    out[k.slice("BUNNY_ENV_".length)] = v;
  }
  return out;
}

function envList(spec, extra = {}) {
  const merged = { ...(spec.container?.environment ?? {}), ...extra };
  return Object.entries(merged)
    .filter(([, v]) => v != null && v !== "")
    .map(([name, value]) => ({ name, value: String(value) }));
}

async function pickRegistryId(explicit) {
  if (explicit || process.env.BUNNY_IMAGE_REGISTRY_ID) {
    return String(explicit || process.env.BUNNY_IMAGE_REGISTRY_ID);
  }
  const data = await mc("/registries");
  const items = data.items ?? [];
  const ghcr =
    items.find((r) => String(r.hostName || "").includes("ghcr.io")) ||
    items.find((r) => /github/i.test(`${r.displayName} ${r.hostName}`)) ||
    items.find((r) => r.isPublic) ||
    items[0];
  if (!ghcr) {
    throw new Error("Geen container-registry in Bunny. Voeg GitHub Container Registry toe onder Magic Containers → Registries.");
  }
  return String(ghcr.id);
}

async function pickRegion(flags) {
  if (flags.region || process.env.BUNNY_REGION) {
    return flags.region || process.env.BUNNY_REGION;
  }
  const data = await mc("/regions?limit=100");
  const items = data.items ?? [];
  const paris =
    items.find((r) => /paris/i.test(r.name || "")) ||
    items.find((r) => r.id === "FR") ||
    items.find((r) => /^FR/i.test(r.id || ""));
  return paris?.id || "FR";
}

function endpointRequest(spec, port) {
  return {
    displayName: spec.container?.endpointName || "Web",
    cdn: {
      isSslEnabled: false,
      portMappings: [{ containerPort: port, protocols: ["tcp"] }],
    },
  };
}

async function createBody(spec, flags) {
  const port = Number(flags.port || spec.container?.port || 43121);
  const region = spec.regionSettings?.requiredRegionIds?.[0] || (await pickRegion(flags));
  const registryId = await pickRegistryId(flags.registry);
  const c = spec.container;
  const regionSettings = spec.regionSettings ?? {
    requiredRegionIds: [region],
    allowedRegionIds: [region],
    maxAllowedRegions: 1,
  };
  if (!regionSettings.requiredRegionIds?.length) {
    regionSettings.requiredRegionIds = [region];
  }
  if (!regionSettings.allowedRegionIds?.length) {
    regionSettings.allowedRegionIds = [region];
  }
  return {
    name: flags.name || spec.name,
    runtimeType: spec.runtimeType || "shared",
    terminationGracePeriodSeconds: spec.terminationGracePeriodSeconds || 30,
    autoScaling: spec.autoScaling || { min: 1, max: 1 },
    regionSettings,
    volumes: spec.volumes || [],
    containerTemplates: [
      {
        name: c.name,
        imageName: c.imageName,
        imageNamespace: c.imageNamespace,
        imageTag: flags.tag || c.imageTag || "latest",
        imageRegistryId: registryId,
        imagePullPolicy: c.imagePullPolicy || "always",
        environmentVariables: envList(spec, extraEnvFromProcess()),
        endpoints: [endpointRequest(spec, port)],
        volumeMounts: c.volumeMounts || [],
        ...(c.probes ? { probes: c.probes } : {}),
      },
    ],
  };
}

function printJson(data, flags, pretty) {
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  pretty(data);
}

async function listApps() {
  const items = [];
  let cursor;
  do {
    const q = new URLSearchParams({ limit: "100" });
    if (cursor) q.set("nextCursor", cursor);
    const data = await mc(`/apps?${q}`);
    items.push(...(data.items ?? []));
    cursor = data.cursor || undefined;
  } while (cursor);
  return items;
}

async function findApp({ flags, positional, spec }) {
  const id = flags.app || positional[0] || process.env.BUNNY_APP_ID;
  if (id) {
    return mc(`/apps/${id}`);
  }
  const name = flags.name || spec?.name;
  if (!name) throw new Error("Geen app-id of naam. Gebruik --app of zet BUNNY_APP_ID.");
  const items = await listApps();
  const hit = items.find((a) => a.name === name);
  if (!hit) return null;
  return mc(`/apps/${hit.id}`);
}

function toEndpointRequest(ep) {
  const portMappings = (ep.portMappings || []).map((p) => ({
    containerPort: p.containerPort,
    ...(p.exposedPort != null ? { exposedPort: p.exposedPort } : {}),
    ...(p.protocols ? { protocols: p.protocols } : {}),
  }));
  const out = { displayName: ep.displayName };
  if (ep.type === "anycast") {
    out.anycast = { type: "iPv4", portMappings };
    return out;
  }
  const cdn = {
    isSslEnabled: Boolean(ep.isSslEnabled),
    portMappings,
  };
  if (ep.pullZoneId != null && ep.pullZoneId !== "") {
    const n = Number(ep.pullZoneId);
    if (!Number.isNaN(n)) cdn.pullZoneId = n;
  }
  if (ep.stickySessions?.enabled) {
    cdn.stickySessions = ep.stickySessions;
  }
  out.cdn = cdn;
  return out;
}

function toContainerRequest(tpl, { tag, imageName } = {}) {
  const req = {
    id: tpl.id,
    name: tpl.name,
    imageName: imageName || tpl.imageName,
    imageNamespace: tpl.imageNamespace,
    imageTag: tag || tpl.imageTag,
    imageRegistryId: String(tpl.imageRegistryId),
    imagePullPolicy: tpl.imagePullPolicy || "always",
    environmentVariables: tpl.environmentVariables || [],
    endpoints: (tpl.endpoints || []).map(toEndpointRequest),
    volumeMounts: (tpl.volumeMounts || []).map((m) => ({
      name: m.name,
      mountPath: m.mountPath,
    })),
  };
  if (tpl.probes) req.probes = tpl.probes;
  if (tpl.entryPoint && (tpl.entryPoint.command || tpl.entryPoint.commandArray)) {
    req.entryPoint = tpl.entryPoint;
  }
  return req;
}

function toUpdateBody(app, { tag, container, imageName } = {}) {
  const templates = app.containerTemplates || [];
  if (!templates.length) throw new Error("App heeft geen containers.");
  let target = templates;
  if (container) {
    const one = templates.find((t) => t.name === container);
    if (!one) {
      throw new Error(`Container '${container}' niet gevonden. Wel: ${templates.map((t) => t.name).join(", ")}`);
    }
    target = templates.map((t) => (t.name === container ? { ...t, _update: true } : t));
  } else {
    target = templates.map((t, i) => (i === 0 ? { ...t, _update: true } : t));
  }
  return {
    name: app.name,
    runtimeType: app.runtimeType,
    autoScaling: app.autoScaling || { min: 1, max: 1 },
    regionSettings: {
      allowedRegionIds: app.regionSettings?.allowedRegionIds || [],
      requiredRegionIds: app.regionSettings?.requiredRegionIds || [],
      ...(app.regionSettings?.maxAllowedRegions != null
        ? { maxAllowedRegions: app.regionSettings.maxAllowedRegions }
        : {}),
    },
    volumes: (app.volumes || []).map((v) => ({ name: v.name, size: v.size })),
    containerTemplates: target.map((t) =>
      toContainerRequest(t, t._update ? { tag, imageName } : {}),
    ),
  };
}

async function cmdApps(flags) {
  const items = await listApps();
  printJson({ items }, flags, () => {
    if (!items.length) {
      console.log("Geen Magic Container-apps.");
      return;
    }
    for (const a of items) {
      const host = a.displayEndpoint?.address ?? "—";
      console.log(`${a.id}\t${a.status}\t${a.name}\t${host}`);
    }
  });
}

async function cmdGet(ctx) {
  const app = await findApp(ctx);
  if (!app) {
    console.error("App niet gevonden.");
    process.exit(1);
  }
  printJson(app, ctx.flags, () => {
    console.log(`${app.name}  (${app.id})  ${app.status}`);
    const host = app.displayEndpoint?.address;
    if (host) console.log(`endpoint\t${host}`);
    for (const t of app.containerTemplates || []) {
      console.log(`container\t${t.name}\t${t.imageNamespace}/${t.imageName}:${t.imageTag}`);
    }
  });
}

async function cmdList(kind, flags) {
  const data = await mc(`/${kind}?limit=100`);
  printJson(data, flags, () => {
    for (const r of data.items ?? []) {
      if (kind === "registries") {
        console.log(`${r.id}\t${r.hostName}\t${r.displayName}${r.isPublic ? "\tpublic" : ""}`);
      } else {
        console.log(`${r.id}\t${r.name}\t${r.hasCapacity === false ? "geen capaciteit" : ""}`);
      }
    }
  });
}

async function cmdCreate(ctx, { forceNew = true } = {}) {
  const body = await createBody(ctx.spec, ctx.flags);
  if (!forceNew) {
    const items = await listApps();
    const hit = items.find((a) => a.name === body.name);
    if (hit) {
      console.log(`Bestaat al: ${hit.name}  ${hit.id}  ${hit.status}`);
      if (hit.displayEndpoint?.address) console.log(`endpoint  ${hit.displayEndpoint.address}`);
      return hit;
    }
  }
  const created = await mc("/apps", { method: "POST", body });
  console.log(`Aangemaakt: ${body.name}  ${created.id}`);
  console.log(`Dashboard:  https://dash.bunny.net/magic-containers/apps/${created.id}/`);
  return created;
}

async function cmdDeploy(ctx) {
  const app = await findApp(ctx);
  if (!app) throw new Error("App niet gevonden om te deployen.");
  await mc(`/apps/${app.id}/deploy`, { method: "POST" });
  console.log(`Deploy gestart: ${app.name} (${app.id})`);
}

async function cmdUpdateImage(ctx) {
  const tag = ctx.flags.tag;
  if (!tag) throw new Error("Gebruik --tag <image-tag> (bijv. de git-sha).");
  const app = await findApp(ctx);
  if (!app) throw new Error("App niet gevonden. Zet BUNNY_APP_ID of --app.");
  const container = ctx.flags.container || ctx.spec?.container?.name;
  const body = toUpdateBody(app, {
    tag,
    container,
    imageName: ctx.flags["image-name"],
  });
  await mc(`/apps/${app.id}`, { method: "PUT", body });
  await mc(`/apps/${app.id}/deploy`, { method: "POST" });
  console.log(`Rolling update: ${app.name} / ${container || app.containerTemplates[0]?.name} → :${tag}`);
}

async function main() {
  const { cmd, flags, positional } = args();
  if (cmd === "help" || flags.help) usage(0);

  let spec = null;
  let specPath = null;
  if (["provision", "create", "update-image", "get", "deploy"].includes(cmd)) {
    try {
      const loaded = loadSpec(flags);
      spec = loaded.spec;
      specPath = loaded.path;
    } catch (e) {
      if (cmd === "create" || cmd === "provision") throw e;
    }
  }
  const ctx = { cmd, flags, positional, spec, specPath };

  switch (cmd) {
    case "apps":
      await cmdApps(flags);
      break;
    case "registries":
      await cmdList("registries", flags);
      break;
    case "regions":
      await cmdList("regions", flags);
      break;
    case "get":
      await cmdGet(ctx);
      break;
    case "create":
      await cmdCreate(ctx, { forceNew: true });
      break;
    case "provision": {
      const app = await cmdCreate(ctx, { forceNew: false });
      if (!app?.id) throw new Error("Provision gaf geen app-id terug.");
      await cmdDeploy({ ...ctx, flags: { ...flags, app: app.id }, positional: [] });
      break;
    }
    case "deploy":
      await cmdDeploy(ctx);
      break;
    case "update-image":
      await cmdUpdateImage(ctx);
      break;
    default:
      console.error(`Onbekend commando: ${cmd}`);
      usage(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
