#!/usr/bin/env node
// Verify a deployed (or locally running) AIMarket against the acceptance
// criteria in the spec. Exits non-zero on the first failed assertion group so
// CI and the demo runbook get a hard signal.
//
//   node .github/scripts/verify-aimarket.mjs --api <apiBase> --web <webUrl>
//
// With no arguments it reads API_URL and WEB_URL from the current azd
// environment, then falls back to localhost.

import { execFileSync } from 'node:child_process';

const EXPECTED_PRODUCTS = 10;
const EXPECTED_PRODUCT = 'UltraBook Pro 15';
const COMPARISON_PROMPT =
  `Compare the ${EXPECTED_PRODUCT} with the Wireless Noise-Canceling Headphones for travel.`;

// ---------------------------------------------------------------- resolution

function fromAzd(key) {
  try {
    return execFileSync('azd', ['env', 'get-value', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}

function resolveTargets(argv) {
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
  };

  const api = flag('api') || fromAzd('API_URL') || 'http://localhost:3000';
  const web = flag('web') || fromAzd('WEB_URL') || 'http://localhost:5173';

  // The spec's client convention: API_BASE already includes /api.
  const apiBase = api.replace(/\/+$/, '').endsWith('/api')
    ? api.replace(/\/+$/, '')
    : `${api.replace(/\/+$/, '')}/api`;

  return { apiBase, web: web.replace(/\/+$/, '') };
}

// ------------------------------------------------------------------- helpers

async function get(url, { timeout = 20_000, ...init } = {}) {
  return fetch(url, { signal: AbortSignal.timeout(timeout), ...init });
}

async function json(url, init) {
  const res = await get(url, init);
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

// Product listings may be a bare array or { data, totalCount }.
const listOf = (payload) => (Array.isArray(payload) ? payload : payload?.data ?? []);

async function mapLimit(items, limit, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return out;
}

// -------------------------------------------------------------------- checks

function buildChecks({ apiBase, web }) {
  // Populated by the products check and reused by later ones.
  let products = [];

  return [
    {
      name: 'health',
      async run() {
        const res = await get(`${apiBase}/health`);
        if (res.status !== 200) throw new Error(`expected HTTP 200, got ${res.status}`);
        const body = await res.json().catch(() => ({}));
        if (body.status !== 'ok') {
          throw new Error(`expected {status:"ok"}, got ${JSON.stringify(body)}`);
        }
        return 'HTTP 200, status ok';
      },
    },
    {
      name: `${EXPECTED_PRODUCTS} products`,
      async run() {
        products = listOf(await json(`${apiBase}/products?pageSize=50`));
        if (products.length !== EXPECTED_PRODUCTS) {
          throw new Error(`expected ${EXPECTED_PRODUCTS} products, got ${products.length}`);
        }
        if (!products.some((p) => p?.name === EXPECTED_PRODUCT)) {
          throw new Error(`seed product "${EXPECTED_PRODUCT}" is missing`);
        }
        return `${products.length} products including ${EXPECTED_PRODUCT}`;
      },
    },
    {
      name: 'images',
      async run() {
        const urls = products.map((p) => p?.imageUrl).filter(Boolean);
        if (urls.length === 0) throw new Error('no product carries an imageUrl');

        const failures = (
          await mapLimit(urls, 4, async (url) => {
            try {
              const res = await get(url, { timeout: 15_000 });
              return res.ok ? null : `${url} → HTTP ${res.status}`;
            } catch (err) {
              return `${url} → ${err.message}`;
            }
          })
        ).filter(Boolean);

        if (failures.length) {
          throw new Error(`${failures.length} image(s) failed:\n      ${failures.join('\n      ')}`);
        }
        return `${urls.length} image(s) loaded`;
      },
    },
    {
      name: 'search',
      async run() {
        const res = await get(`${apiBase}/products/search`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'something for a long flight' }),
          timeout: 30_000,
        });
        if (!res.ok) throw new Error(`search returned HTTP ${res.status}`);
        const results = listOf(await res.json());
        if (results.length === 0) {
          throw new Error(
            'search returned no results — the Azure AI Search index is probably empty; ' +
              'push the products from the data store into it',
          );
        }
        return `${results.length} result(s)`;
      },
    },
    {
      name: 'chat',
      async run() {
        // A comparison prompt, not a lookup: GPT-5 can spend a small budget
        // entirely on hidden reasoning and return an empty message, which a
        // simple lookup can mask.
        const res = await get(`${apiBase}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: COMPARISON_PROMPT }] }),
          timeout: 90_000,
        });
        if (!res.ok) {
          throw new Error(
            `chat returned HTTP ${res.status}` +
              (res.status >= 500
                ? ' — check the Foundry reasoning effort and completion-token budget'
                : ''),
          );
        }

        const payload = await res.json();
        const reply =
          typeof payload === 'string'
            ? payload
            : payload?.reply ?? payload?.message ?? payload?.content ?? '';

        if (!reply.trim()) throw new Error('assistant returned an empty reply');
        if (!reply.includes(EXPECTED_PRODUCT)) {
          throw new Error(
            `reply never mentions "${EXPECTED_PRODUCT}" — the catalog is probably not ` +
              `in the system prompt. Got: ${reply.slice(0, 160)}…`,
          );
        }
        return `grounded reply mentioning ${EXPECTED_PRODUCT}`;
      },
    },
    {
      name: 'storefront',
      async run() {
        const res = await get(web);
        if (res.status !== 200) throw new Error(`expected HTTP 200, got ${res.status}`);
        return `HTTP 200 from ${web}`;
      },
    },
    {
      name: 'API integration',
      async run() {
        // The built bundle must point at the deployed API, not localhost —
        // the classic VITE_API_URL-at-build-time failure.
        if (new URL(web).hostname === 'localhost') return 'skipped (local storefront)';

        const html = await (await get(web)).text();
        const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
        if (srcs.length === 0) throw new Error('no script tags found in the storefront HTML');

        const apiHost = new URL(apiBase).host;
        for (const src of srcs) {
          const bundle = await (await get(new URL(src, `${web}/`).href, { timeout: 30_000 })).text();
          if (bundle.includes(apiHost)) return `bundle references ${apiHost}`;
          if (/localhost:\d+/.test(bundle)) {
            throw new Error(
              'bundle still points at localhost — rebuild the client with ' +
                'VITE_API_URL including the /api segment (re-run the postdeploy hook)',
            );
          }
        }
        throw new Error(`no bundle references the API host ${apiHost}`);
      },
    },
  ];
}

// ---------------------------------------------------------------------- main

const targets = resolveTargets(process.argv.slice(2));
console.log(`AIMarket verification\n  API: ${targets.apiBase}\n  Web: ${targets.web}\n`);

const failed = [];
for (const check of buildChecks(targets)) {
  try {
    const detail = await check.run();
    console.log(`  ✓ ${check.name} — ${detail}`);
  } catch (err) {
    failed.push(check.name);
    console.log(`  ✗ ${check.name} — ${err.message}`);
  }
}

console.log('');
if (failed.length) {
  console.error(`FAIL: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('PASS: health, 10 products, images, search, chat, storefront, and API integration');
