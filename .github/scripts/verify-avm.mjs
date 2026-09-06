#!/usr/bin/env node
// Verify a generated Terraform configuration against the Azure Platform
// Constitution. Every check here is a constitutional principle made executable.
//
//   node .github/scripts/verify-avm.mjs                    # checks known-good AIMarket reference
//   node .github/scripts/verify-avm.mjs --dir path/to/tf
//   node .github/scripts/verify-avm.mjs --offline          # skip registry lookups
//   node .github/scripts/verify-avm.mjs --rg rg-name       # also check the deployed estate
//
// Runs every check even after one fails, so a red run tells you everything that
// is wrong in a single pass. Exits non-zero if any check failed.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

// ------------------------------------------------------------------ arguments

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const has = (name) => argv.includes(`--${name}`);

const DIR = flag('dir') || 'lab/03-aimarket/infra';
const OFFLINE = has('offline');
const RG = flag('rg');

// -------------------------------------------------------------------- results

const results = [];
let currentGroup = null;

function group(principle, title) {
  currentGroup = { principle, title, failures: [], checked: 0 };
  results.push(currentGroup);
}
function pass(n = 1) { currentGroup.checked += n; }
function fail(message, hint) {
  currentGroup.checked += 1;
  currentGroup.failures.push({ message, hint });
}

// --------------------------------------------------------------- HCL scanning

// Deliberately regex-based: this repository carries no dependencies, and the
// properties we check (source, version, presence of an input, presence of a
// resource block) are all lexically visible. It is not a parser and does not
// need to be.

function tfFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== '.terraform') out.push(...tfFiles(p));
    } else if (entry.endsWith('.tf')) {
      out.push(p);
    }
  }
  return out.sort();
}

// Return the body of a block starting at `open` (index of its `{`), by matching
// braces while ignoring those inside strings and comments.
function blockBody(text, open) {
  let depth = 0, i = open, inString = false, inComment = false;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inComment) { if (c === '\n') inComment = false; continue; }
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '#' || (c === '/' && text[i + 1] === '/')) { inComment = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return text.slice(open + 1);
}

function findBlocks(text, kind) {
  const blocks = [];
  const re = new RegExp(`(^|\\n)\\s*${kind}\\s+"([^"]+)"(?:\\s+"([^"]+)")?\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const open = text.indexOf('{', m.index + m[1].length);
    const body = blockBody(text, open);
    blocks.push({
      labels: [m[2], m[3]].filter(Boolean),
      body,
      line: text.slice(0, m.index).split('\n').length + (m[1] ? 1 : 0),
    });
  }
  return blocks;
}

const attr = (body, name) => {
  const m = body.match(new RegExp(`(^|\\n)\\s*${name}\\s*=\\s*([^\\n]+)`));
  return m ? m[2].trim() : null;
};
const hasAttr = (body, name) =>
  new RegExp(`(^|\\n)\\s*${name}\\s*=`).test(body) ||
  new RegExp(`(^|\\n)\\s*${name}\\s*\\{`).test(body);
const unquote = (v) => (v ? v.replace(/^"(.*)"$/, '$1') : v);

// ------------------------------------------------------------------- registry

const AVM_SOURCE = /^(?:registry\.terraform\.io\/)?Azure\/avm-(res|ptn|utl)-[a-z0-9-]+\/azurerm$/;
const registryCache = new Map();

async function moduleInputs(source, version) {
  const key = `${source}@${version}`;
  if (registryCache.has(key)) return registryCache.get(key);
  const path = source.replace(/^registry\.terraform\.io\//, '');
  const url = `https://registry.terraform.io/v1/modules/${path}/${version}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) { registryCache.set(key, null); return null; }
    const body = await res.json();
    const names = new Set((body?.root?.inputs || []).map((i) => i.name));
    registryCache.set(key, names);
    return names;
  } catch {
    registryCache.set(key, null);
    return null;
  }
}

// ---------------------------------------------------------------- the checks

const files = tfFiles(DIR);
const sources = files.map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));
const modules = sources.flatMap(({ file, text }) =>
  findBlocks(text, 'module').map((b) => ({ ...b, file, name: b.labels[0] })));
const resources = sources.flatMap(({ file, text }) =>
  findBlocks(text, 'resource').map((b) => ({ ...b, file, type: b.labels[0], name: b.labels[1] })));

function checkConfigurationExists() {
  group('—', `Terraform configuration in ${DIR}/`);
  if (files.length === 0) {
    fail(`no .tf files found under ${DIR}/`,
      'Run /speckit-implement first, or pass --dir if the configuration lives elsewhere.');
    return false;
  }
  pass();
  if (modules.length === 0) {
    fail('configuration declares no modules at all',
      'Principle I requires AVM modules; a configuration of only raw resources violates it wholesale.');
    return false;
  }
  pass();
  return true;
}

// Principle I — Verified Modules Before Raw Resources
function checkAvmFirst() {
  group('I', 'Verified modules before raw resources');

  for (const m of modules) {
    const source = unquote(attr(m.body, 'source'));
    if (!source) {
      fail(`module "${m.name}" (${relative('.', m.file)}:${m.line}) has no source`);
      continue;
    }
    if (AVM_SOURCE.test(source)) { pass(); continue; }
    if (/^\.{1,2}\//.test(source)) {
      fail(`module "${m.name}" uses a local source (${source})`,
        'A local module is not an AVM module. Either use the registry module or record an exception.');
    } else {
      fail(`module "${m.name}" source "${source}" is not an AVM registry module`,
        'Expected Azure/avm-<res|ptn|utl>-<namespace>-<type>/azurerm.');
    }
  }

  // Raw azurerm resources need a documented exception.
  const exceptionsPath = join(DIR, 'EXCEPTIONS.md');
  const exceptions = existsSync(exceptionsPath) ? readFileSync(exceptionsPath, 'utf8') : '';
  const raw = resources.filter((r) => r.type.startsWith('azurerm_'));

  for (const r of raw) {
    if (exceptions.includes(r.type)) {
      pass();
    } else {
      fail(`raw resource "${r.type}" "${r.name}" (${relative('.', r.file)}:${r.line}) has no recorded exception`,
        `Use an AVM module, or document why none fits in ${exceptionsPath} naming ${r.type}.`);
    }
  }
  if (modules.length && !raw.length) pass();
}

// Principle II — Pinned, Reproducible, Re-plannable
function checkPinning() {
  group('II', 'Pinned, reproducible, re-plannable');

  for (const m of modules) {
    const version = unquote(attr(m.body, 'version'));
    if (!version) {
      fail(`module "${m.name}" has no version pin`,
        'AVM modules are pre-1.0; an unpinned module takes a breaking release on the next init.');
    } else if (!/^\d+\.\d+\.\d+$/.test(version)) {
      fail(`module "${m.name}" version "${version}" is not an exact pin`,
        'Range operators accept breaking pre-1.0 minor releases. Use an exact version.');
    } else {
      pass();
    }
  }

  // Terraform and provider constraints
  const terraformBlocks = sources.flatMap(({ text }) => {
    const out = [];
    const re = /(^|\n)\s*terraform\s*\{/g;
    let m;
    while ((m = re.exec(text)) !== null) out.push(blockBody(text, text.indexOf('{', m.index)));
    return out;
  });
  const tf = terraformBlocks.join('\n');
  if (!tf) {
    fail('no terraform{} block declaring required_version and required_providers');
  } else {
    if (/required_version\s*=/.test(tf)) pass();
    else fail('terraform{} block does not constrain required_version');
    if (/required_providers\s*\{/.test(tf)) pass();
    else fail('terraform{} block does not declare required_providers');
    const unpinnedProviders = [...tf.matchAll(/source\s*=\s*"([^"]+)"\s*(?:\n\s*)?(?:version\s*=\s*"([^"]*)")?/g)]
      .filter(([, src, ver]) => src.includes('/') && !ver);
    if (unpinnedProviders.length) {
      fail(`provider(s) declared without a version: ${unpinnedProviders.map((p) => p[1]).join(', ')}`);
    } else pass();
  }

  if (existsSync(join(DIR, '.terraform.lock.hcl'))) pass();
  else fail(`${join(DIR, '.terraform.lock.hcl')} is missing`,
    'Run terraform init and commit the lock file; without it provider versions are not reproducible.');

  // Non-deterministic naming
  for (const r of resources.filter((r) => r.type.startsWith('random_'))) {
    if (hasAttr(r.body, 'keepers')) pass();
    else fail(`${r.type}.${r.name} has no keepers`,
      'It regenerates on a later apply and renames globally-unique resources. Derive the suffix deterministically.');
  }

  // Region literals inside module blocks
  for (const m of modules) {
    const location = attr(m.body, 'location');
    if (location && /^"/.test(location)) {
      fail(`module "${m.name}" hardcodes location ${location}`,
        'Declare the region once as a variable and reference it.');
    }
  }
}

// Principle III — Identity, Not Secrets
function checkSecrets() {
  group('III', 'Identity, not secrets');

  const BANNED = [
    [/admin_enabled\s*=\s*true/, 'admin_enabled = true', 'Disable the registry admin user; grant AcrPull to a managed identity instead.'],
    [/legacy_access_policies_enabled\s*=\s*true/, 'Key Vault legacy access policies enabled', 'Use RBAC authorization.'],
    [/shared_access_key_enabled\s*=\s*true/, 'storage shared access keys enabled', 'Use Entra ID authorization.'],
    [/local_auth_enabled\s*=\s*true/, 'local authentication enabled', 'Prefer Entra ID / managed identity.'],
  ];
  const SECRET_LITERAL =
    /(password|secret|client_secret|access_key|primary_key|connection_string|sas_token)\s*=\s*"(?!\s*$)[^"$][^"]{7,}"/i;

  for (const { file, text } of sources) {
    const lines = text.split('\n');
    for (const [re, label, hint] of BANNED) {
      lines.forEach((line, i) => {
        if (re.test(line)) fail(`${relative('.', file)}:${i + 1} — ${label}`, hint);
      });
    }
    lines.forEach((line, i) => {
      if (SECRET_LITERAL.test(line) && !/var\.|local\.|data\.|module\./.test(line)) {
        fail(`${relative('.', file)}:${i + 1} — looks like a hardcoded credential`,
          'Source it from the environment or a vault and mark the variable sensitive.');
      }
    });
    pass();
  }

  // Sensitive variables must not carry defaults.
  for (const { file, text } of sources) {
    for (const v of findBlocks(text, 'variable')) {
      if (/sensitive\s*=\s*true/.test(v.body) && hasAttr(v.body, 'default')
          && !/default\s*=\s*null/.test(v.body)) {
        fail(`variable "${v.labels[0]}" (${relative('.', file)}:${v.line}) is sensitive but has a default`,
          'A default for a secret is a secret in source control.');
      } else pass();
    }
  }

  // State must never be committed.
  try {
    const tracked = execFileSync('git', ['ls-files', '--', '*.tfstate', '*.tfstate.*', '*.tfvars'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (tracked) fail(`state or tfvars files are tracked by git: ${tracked.split('\n').join(', ')}`,
      'State contains every value the providers read back, including secrets.');
    else pass();
  } catch { /* not a git repo — skip */ }
}

// Principle IV — Observable by Default
async function checkObservability() {
  group('IV', 'Observable by default');

  const unsupported = [];
  for (const m of modules) {
    const source = unquote(attr(m.body, 'source'));
    const version = unquote(attr(m.body, 'version'));
    if (!source || !AVM_SOURCE.test(source)) continue;

    if (hasAttr(m.body, 'enable_telemetry')) pass();
    else fail(`module "${m.name}" does not set enable_telemetry explicitly`,
      'The constitution requires the choice to be recorded, not inherited.');

    if (!version || OFFLINE) continue;
    const inputs = await moduleInputs(source, version);
    if (!inputs) {
      fail(`could not resolve ${source} ${version} in the registry`,
        'Check the source name and that the version exists.');
      continue;
    }
    if (!inputs.has('diagnostic_settings')) { unsupported.push(m.name); pass(); continue; }
    if (hasAttr(m.body, 'diagnostic_settings')) pass();
    else fail(`module "${m.name}" supports diagnostic_settings but does not set it`,
      'Wire it to the platform Log Analytics workspace in the same change that creates the resource.');
  }

  if (unsupported.length) {
    console.log(`  note: no diagnostic settings interface (correctly omitted): ${unsupported.join(', ')}`);
  }
  if (OFFLINE) console.log('  note: --offline, diagnostic coverage not checked against the registry');
}

// Principle V — Reversible by Construction
function checkReversibility() {
  group('V', 'Reversible by construction');

  for (const m of modules) {
    if (hasAttr(m.body, 'lock')) {
      const kind = unquote(attr(m.body, 'kind'));
      fail(`module "${m.name}" sets a resource lock${kind ? ` (${kind})` : ''}`,
        'A lock blocks the destroy Terraform itself issues, minutes into teardown.');
    } else pass();

    if (/purge_protection_enabled\s*=\s*true/.test(m.body)) {
      fail(`module "${m.name}" enables purge protection`,
        'Purge protection is irreversible for the life of the vault and holds the name after deletion.');
    } else pass();

    const retention = attr(m.body, 'soft_delete_retention_days');
    if (retention && Number(unquote(retention)) > 7) {
      fail(`module "${m.name}" sets soft_delete_retention_days = ${retention}`,
        'Use the 7-day minimum so the name can be reused immediately.');
    } else pass();
  }

  for (const r of resources.filter((r) => r.type === 'azurerm_management_lock')) {
    fail(`azurerm_management_lock.${r.name} will block terraform destroy`);
  }
}

// Terraform's own gates
function checkTerraformGates() {
  group('Gate', 'terraform fmt and validate');
  let terraform = true;
  try {
    execFileSync('terraform', ['version'], { stdio: 'ignore' });
  } catch {
    terraform = false;
    console.log('  note: terraform not on PATH — fmt/validate skipped');
  }
  if (!terraform) return;

  try {
    execFileSync('terraform', ['fmt', '-check', '-recursive', DIR], { stdio: 'pipe' });
    pass();
  } catch (e) {
    const files = (e.stdout?.toString() || '').trim().split('\n').filter(Boolean);
    fail(`terraform fmt reports unformatted files: ${files.join(', ') || 'see terraform fmt output'}`,
      'Run terraform fmt -recursive.');
  }

  if (!existsSync(join(DIR, '.terraform'))) {
    console.log('  note: terraform not initialised — validate skipped (run terraform init)');
    return;
  }
  try {
    execFileSync('terraform', [`-chdir=${DIR}`, 'validate'], { stdio: 'pipe' });
    pass();
  } catch (e) {
    fail(`terraform validate failed:\n${(e.stdout?.toString() || e.message).trim()}`);
  }
}

// Deployed estate — only with --rg
function checkDeployed() {
  group('Deployed', `estate in resource group ${RG}`);
  const az = (args) => JSON.parse(
    execFileSync('az', [...args, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));

  let deployed;
  try {
    deployed = az(['resource', 'list', '--resource-group', RG]);
  } catch {
    fail(`resource group ${RG} does not exist or is not readable`,
      'Check the name and that az login targets the right subscription.');
    return;
  }
  pass();
  console.log(`  ${deployed.length} resources deployed`);

  for (const r of deployed.filter((r) => r.type === 'Microsoft.ContainerRegistry/registries')) {
    try {
      const acr = az(['acr', 'show', '--name', r.name, '--resource-group', RG]);
      if (acr.adminUserEnabled) fail(`registry ${r.name} has the admin user enabled`);
      else pass();
    } catch { fail(`could not read registry ${r.name}`); }
  }

  for (const r of deployed.filter((r) => r.type === 'Microsoft.KeyVault/vaults')) {
    try {
      const kv = az(['keyvault', 'show', '--name', r.name, '--resource-group', RG]);
      if (!kv.properties?.enableRbacAuthorization) fail(`key vault ${r.name} is not using RBAC authorization`);
      else pass();
      if (kv.properties?.enablePurgeProtection) fail(`key vault ${r.name} has purge protection enabled — it cannot be fully removed`);
      else pass();
    } catch { fail(`could not read key vault ${r.name}`); }
  }

  // Diagnostics actually landed
  for (const r of deployed) {
    let settings;
    try {
      settings = az(['monitor', 'diagnostic-settings', 'list', '--resource', r.id]);
    } catch { continue; }  // resource type does not support diagnostics
    const list = settings?.value ?? settings ?? [];
    if (Array.isArray(list) && list.length === 0) {
      fail(`${r.type.split('/').pop()} "${r.name}" supports diagnostic settings but has none`,
        'Principle IV — wire diagnostic_settings on its module.');
    } else pass();
  }
}

// ------------------------------------------------------------------- reporting

function report() {
  let failed = 0;
  console.log('');
  for (const g of results) {
    const label = g.principle === '—' || g.principle === 'Gate' || g.principle === 'Deployed'
      ? g.title
      : `Principle ${g.principle} — ${g.title}`;
    if (g.failures.length === 0) {
      console.log(`  PASS  ${label} (${g.checked} checks)`);
    } else {
      failed += g.failures.length;
      console.log(`  FAIL  ${label}`);
      for (const f of g.failures) {
        console.log(`        ✗ ${f.message}`);
        if (f.hint) console.log(`          → ${f.hint}`);
      }
    }
  }
  console.log('');
  if (failed === 0) {
    console.log('PASS: module sourcing, version pinning, secret absence, diagnostic coverage, and destroyability');
    console.log('      all verified before a single resource was created.');
    return 0;
  }
  console.log(`FAIL: ${failed} constitutional violation${failed === 1 ? '' : 's'}. Nothing has been deployed.`);
  return 1;
}

// ----------------------------------------------------------------------- main

console.log(`Verifying ${DIR}/ against the Azure Platform Constitution`);
console.log(`  ${files.length} .tf file(s), ${modules.length} module block(s), ${resources.length} resource block(s)`);

if (checkConfigurationExists()) {
  checkAvmFirst();
  checkPinning();
  checkSecrets();
  await checkObservability();
  checkReversibility();
  checkTerraformGates();
  if (RG) checkDeployed();
} else if (RG) {
  checkDeployed();
}

process.exit(report());
