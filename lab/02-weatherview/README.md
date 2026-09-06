# Lab 2 — WeatherView with Spec-Driven Development

**Source scenario**: [DanWahlin/github-azure-agentic-journeys → journeys/weather-view](https://github.com/DanWahlin/github-azure-agentic-journeys/tree/main/journeys/weather-view).
That journey drives a hand-written `PLAN.md` through GitHub Copilot CLI. **This
runbook rebuilds it with spec-kit**, so the constitution, spec, plan, and task
list are generated and governed instead of authored by hand.

**What gets built**: WeatherView — an accessible five-day forecast site in
vanilla HTML/CSS/JS, backed by the free Open-Meteo APIs, deployed to Azure
Static Web Apps with `azd` + Bicep.

> ###  This one is free
>
> Azure Static Web Apps **Free tier**, no API keys, no backend, no database, no
> container, no Docker. Open-Meteo needs no account. Cost is **$0** within the
> free quotas.
>
> Still run `azd down --force --purge` the same day — leaving resources behind is
> a bad habit even when they're free, and the teardown is part of the demo.

**Why this is the better governance demo**: the rules worth encoding here —
accessibility, fail-closed validation, no framework, deterministic tests — are
*checkable*. You can show a violation being caught. Contrast that with a
constitution full of platitudes nobody can verify.

## Demo flow

Use a prepared WeatherView workspace. Do not generate the whole application or
deploy Azure resources during the demo.

| Step | Demo action | Talking point |
|---|---|---|
| 1 | The running forecast site | “This is a small application with requirements that can fail in subtle ways.” |
| 2 | Two constitution rules: accessibility and deterministic dates | “A useful constitution contains assertions we can verify.” |
| 3 | `spec.md`, especially forecast timezone behavior | “The specification describes observable behavior, not a framework.” |
| 4 | `plan.md` and `tasks.md` | “Technical choices appear in the plan and become ordered work.” |
| 5 | `/speckit-analyze` or checklist results | “Quality gates test the requirements before implementation.” |
| 6 | The timezone test and corrected date | “The contract catches a real previous-day rendering defect.” |
| 7 | Demonstrate keyboard navigation and the theme toggle | “The implementation now provides evidence for the original rules.” |

**Demo takeaway:** specifications can catch real defects when requirements
are precise, observable, and testable.

### Quick navigation

- [Demo preparation](#demo-preparation)
- [Build walkthrough](#build-walkthrough)
- [Application checkpoint](#checkpoint-run-it-locally)
- [Azure deployment](#deploy-to-azure-static-web-apps)
- [Cleanup](#cleanup)
- [Demo recovery](#demo-recovery)

---

## Demo preparation

- [ ] VS Code open on this repo, **GitHub Copilot Chat** signed in
- [ ] `node --version` (LTS), `az version`, `azd version` (>= 1.28.0), `git --version`
- [ ] `az login` done; `azd config set auth.useAzCliAuth true`
- [ ] **Azure Skills plugin** — two commands, the marketplace add is easy to miss:
      `/plugin marketplace add microsoft/azure-skills` then
      `/plugin install azure@azure-skills`
- [ ] `az provider register --namespace Microsoft.Web` (only if not registered)
- [ ] Browser zoom set, notifications off, **dark/light theme toggle handy** —
      you will demo it
- [ ] A screen reader or at minimum keyboard-only navigation rehearsed. The
      accessibility beat is the payoff; don't wing it.
- [ ] Working tree clean, constitution is still the template

---

## Build walkthrough

The following sections generate the complete application and its demo artifacts.
Prepare a working checkpoint in advance so the demo can continue if generation
or deployment is delayed.

### Step 0 — Generate into a separate workspace

Keeps this repo clean and settles where spec-kit writes files:

```
Create a standalone WeatherView workspace in a sibling directory named weather-view-workspace next to this repository. Stop and ask before changing anything if that directory already exists and is not empty. Initialize a Git repository at the workspace root and add a .gitignore excluding node_modules/, dist/, test-results/, playwright-report/, and .azure/. Do not modify this repository. When finished, show the workspace path.
```

Then `cd ../weather-view-workspace` and run the spec-kit phases from there.

> **💡** Append *"If you encounter any issues, log them to issues.md so they can
> be tracked and fixed"* to the longer prompts. Everything that goes wrong lands
> in one file instead of scrolling past in chat.

---

### Step 1 — Constitution

Every rule below is testable. That is the point — read two of them aloud and let
people see that they are assertions, not aspirations.

```
/speckit-constitution Fill the constitution for an accessible, dependency-free static web application.

Accessibility is non-negotiable and applies to every phase. Use semantic HTML landmarks and a correct heading structure. Every control has a visible label or an unambiguous accessible name, works with keyboard alone, and shows a visible focus indicator. Toggle controls use native elements or accurate aria-pressed/aria-checked state. Decorative icons are hidden from assistive technology and any meaning they carry is also available as text. Never encode meaning through color alone. Respect prefers-reduced-motion. Both light and dark themes maintain WCAG AA-conscious contrast. Announce asynchronous status through a single aria-live polite region, and never move keyboard focus unexpectedly when async work completes.

No framework, no runtime dependency. Vanilla HTML5, CSS, and modern JavaScript ES modules only. Do not introduce React, Vue, Angular, a CSS framework, or a component library. Load JavaScript as type=module. Avoid external fonts and image assets. Render lists in a single DOM update rather than in a loop that thrashes layout.

Fail closed on external data. Validate the shape of every external response before using it. Treat non-2xx as an error. Never render partial or mismatched results. Build URLs with the URL and URLSearchParams APIs, never string concatenation. Map network, HTTP, empty-result, and malformed-payload failures to user-safe messages while preserving useful detail for tests.

Represent every state explicitly: loading, success, empty result, error with retry, malformed response, and offline. An error must never destroy the last good result the user was looking at.

Caching: cache only successes, never failures. Cache keys must include every input that changes the result. Persist user preferences and the last successful location only — never a whole payload.

Tests must be deterministic — the same result on every run, including against live external APIs. A test that depends on today's date, the machine's timezone, or network ordering is a defect. Time and date handling must be correct outside the local timezone and must be tested explicitly against a non-local one.

Infrastructure is declared as Bicep, preferring Azure Verified Modules from br/public:avm/, falling back to a raw Microsoft.* resource only where AVM blocks deployment and documenting why. No secrets, deployment tokens, API keys, or credentials are created, stored, or printed anywhere — this application requires none. Do not introduce a local Docker requirement.

Always run a validation before running a deployment.
```

**Talking point**: *"Notice rule four — 'a test that depends on the machine's
timezone is a defect.' Hold that thought. It catches a real bug in about ten
minutes."*

---

### Step 2 — Specify

```
/speckit-specify Create a specification called "01-weatherview" for WeatherView, an accessible five-day weather forecast website.

Primary flow: on first load, render the app shell immediately and announce a polite loading status. Request browser geolocation only after the page is interactive. If permission succeeds, load that location's forecast. If permission is denied, unavailable, or times out, load a fixed fallback location of Seattle, Washington at latitude 47.6062 and longitude -122.3321, and explain the fallback without presenting it as an error. The user can search for another city at any time.

City search: a labeled text input and a submit button. Trim the input and reject an empty city without making a request. Submit on Enter and via the button. Disable repeat submission while a request is in flight. Resolve cities through the Open-Meteo geocoding API requesting five results in English. When several matches exist, use the highest-ranked one and display its name, its first-level administrative area when present, and its country. Never invent coordinates. When no result exists, show a helpful inline error and keep the previous successful forecast visible.

Forecast data: request exactly five days from the Open-Meteo forecast API with automatic timezone, retrieving weather code, daily maximum and minimum temperature, maximum precipitation probability, and maximum wind speed. Normalize the parallel arrays the API returns into exactly five day objects, each carrying date, weather code, a human description, an icon name, high and low temperature, precipitation probability, and maximum wind speed, alongside location metadata of name, latitude, longitude, and timezone. Require five aligned values for time and every required daily field; anything else is a malformed response.

Treat each returned date as a calendar date in the forecast's own timezone. Parsing it as midnight and then formatting it in a more western timezone renders the previous day — that is a defect. A forecast dated 2026-07-28 in America/Phoenix must render as Tuesday, Jul 28.

Weather codes are WMO codes and map to human descriptions and icons covering clear, mainly clear, partly cloudy, overcast, fog, drizzle and freezing drizzle, rain and freezing rain, snow, showers, and thunderstorm. An unrecognized code maps to a neutral "Unknown conditions" label and a safe icon rather than crashing.

Units: support Celsius and Fahrenheit. Request the chosen unit from the API rather than converting cached values in the browser. Changing the unit refetches the current coordinates. Display the correct degree symbol on every card. Persist the choice.

Theme: default to the operating system preference. Persist an explicit user choice and apply it to the root element. The theme control exposes its current state through visible text and an accessible name. Changing theme never refetches weather data.

Caching: cache the last successful normalized response by rounded coordinates plus selected unit, reusable for up to ten minutes. Unit changes use separate cache keys. Never cache a failure. Persist only the last successful location, not the forecast.

Layout: a centered shell with a readable maximum width. A header containing the brand, city search, unit toggle, and theme toggle. The resolved location and the forecast update time shown above the cards. Five forecast cards in a responsive grid — five or three columns when space allows, two on tablet, one on narrow mobile — each showing day and date, a weather icon, the description, high and low temperature, precipitation probability, and maximum wind speed. Design tokens as CSS custom properties covering both themes. Concise attribution to the weather data source in the footer.

Acceptance criteria: the initial flow uses geolocation when available and falls back to Seattle when it is not; exactly five cards render from live data; city search loads another location without a page reload; the unit toggle changes the source unit and persists across reload; the theme toggle changes and persists across reload; loading, no-result, malformed-response, offline, and retry states are all represented safely; keyboard navigation, accessible names, status announcements, and visible focus have been verified; and the successful flow produces no console errors and no failed required network requests.
```

**Optional and strong here** — `/speckit-clarify` tends to ask genuinely good
questions about the state machine (what happens to the old forecast on a failed
search?) that the spec above already answers. Use it to show the gate working.

---

### Step 3 — Plan

```
/speckit-plan Implement as a vanilla static site with no build framework and no runtime dependencies, split into ES modules: index.html for the semantic shell, controls, status region and forecast grid; styles.css for the responsive grid, design tokens, themes, focus and reduced-motion behavior; weather-api.js for geocoding, forecast requests, response validation and normalization; weather-maps.js for WMO code labels and icons; and app.js for state, event wiring, caching, preferences, geolocation and rendering.

Use https://geocoding-api.open-meteo.com/v1/search for city lookup and https://api.open-meteo.com/v1/forecast for forecasts. Neither requires a key.

Tooling: a minimal package.json with scripts for start (serve locally on a configurable port without a global package), build, test, test:e2e using Playwright, and verify. Write tests covering: the forecast URL carries every required field including five forecast days, automatic timezone, and the selected unit; normalization yields exactly five aligned days; malformed and incomplete payloads fail closed; the code mapping handles clear, rain, snow, thunderstorm and unknown values; unit and theme preferences persist and restore; empty search input never calls geocoding; geolocation denial falls back to Seattle; a successful render creates exactly five cards; a unit change refetches with the new source unit; error and retry states are keyboard accessible; and a mocked 2026-07-28 forecast in America/Phoenix renders Tuesday, Jul 28 rather than the previous day.

Deploy to Azure Static Web Apps Free tier with azd and Bicep. Use the Azure Skills plugin: call azure_bicep_schema to confirm current properties and API versions rather than guessing, and azure_deploy_plan to review before deploying. Prefer br/public:avm/res/web/static-site, falling back to raw Microsoft.Web/staticSites if AVM parameter drift blocks a working deployment. Use the Free SKU with provider Custom and allowConfigFileUpdates enabled, and tag the resource azd-service-name: web.

Static Web Apps deploys only to centralus, eastus2, westus2, westeurope or eastasia — normalize any requested location to one of those and default to eastus2. main.bicep runs at subscription scope and creates one environment-scoped resource group, with resource-group resources in their own module. Output WEB_URL, STATIC_WEB_APP_NAME and RESOURCE_GROUP_NAME in SCREAMING_SNAKE_CASE, and generate main.parameters.json mapping parameters to the azd environment values.

azd cannot publish a Static Web App when the service source and the output folder both resolve to the project root. Generate scripts/build-static.mjs that recreates dist/ and copies only index.html, styles.css, app.js, weather-api.js, weather-maps.js and staticwebapp.config.json — no tests, scripts, dependencies, documentation, package files or infrastructure — declare exactly one azd service named web with dist: dist, and gitignore dist/.

Create staticwebapp.config.json with a navigation fallback to /index.html excluding static file extensions, and security headers including X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, and a Content Security Policy allowing only self plus the two Open-Meteo HTTPS origins for connect-src.

Do not create a deployment token, GitHub Actions workflow, managed function, backend, API key, storage account or container.
```

---

### Step 4 — Tasks

```
/speckit-tasks
```

Put the task list next to the journey's README on screen. Theirs is three phases
of prompts a person wrote. This one was *derived*, with acceptance criteria that
trace back to the constitution.

---

### Step 5 — Implement

```
/speckit-implement
```

---

## The delegation beat (optional)

```
/speckit-taskstoissues
```

Turns the task list into GitHub issues you can hand to the Copilot coding agent.
The upstream journey makes the point that well-scoped issues with acceptance
criteria are what make delegation work — and that writing them is the actual
labor. Here the spec produced them.

---

## Checkpoint — run it locally

```bash
npm install
npm start          # then open the served URL
npm test           # unit + behavior
npm run verify     # the generated acceptance checks
```

**Demo order, and it matters:**

1. **Deny the geolocation prompt.** It falls back to Seattle and explains itself
   without an error state. That's a spec'd behavior, not a coincidence.
2. **Search a city.** Five cards, no page reload.
3. **Toggle °C/°F, then reload.** The preference persists — and it refetched from
   the API rather than converting in the browser.
4. **Toggle the theme, then reload.** Persists, and the forecast did *not*
   refetch.
5. **Tab through the whole page with the mouse untouched.** Visible focus on
   every control, accessible names, and the status region announcing changes.
   This is the moment — the constitution's first rule, working, verifiable, on
   screen.
6. **Kill your network and hit Retry.** The previous forecast is still there.

### The timezone catch

Run the `America/Phoenix` test and explain it: parse `2026-07-28` as midnight,
format it in a more western timezone, and the card renders **Monday, Jul 27**.
Off by one day, invisible in your own timezone, and it ships.

*"Nobody prompted for that. The constitution said tests must be deterministic
across timezones, the spec turned that into a required behavior, and tasks turned
it into a test."* This is the single best thirty seconds in the demo.

---

## Deploy to Azure Static Web Apps

### Generate the infrastructure

```
Read the deployment requirements in the spec. Create everything they specify to deploy WeatherView to Azure Static Web Apps: Bicep in infra/ with main.bicep at subscription scope and a resource-group-scoped module, main.parameters.json, azure.yaml declaring exactly one web service, scripts/build-static.mjs, and staticwebapp.config.json. Location eastus2. Log issues to issues.md.
```

### Review before deploying — the constitution's own rule

```
Perform a read-only pre-deployment review of the generated WeatherView infrastructure. Do not modify files or deploy. Check every deployment requirement in the spec, including the Static Web Apps region restriction, the Free SKU settings, the azd-service-name tag, the required outputs, the dist/ build separation, and the absence of any deployment token, workflow, backend, or secret. Run any read-only Bicep or azd validation that does not create resources. Return: (1) PRE-DEPLOYMENT STATUS: READY or NOT READY; (2) a table of each requirement with PASS or FAIL and file/line evidence; (3) every blocking issue and the smallest exact fix. Do not report READY while any required check is unresolved.
```

### Deploy

```bash
az account show --query id --output tsv          # copy the value
azd env set AZURE_SUBSCRIPTION_ID <subscription-id>
npm run build                                     # populate dist/
azd up
```

Then:

```bash
azd env get-value WEB_URL
```

Open it. Re-run the same six-step demo against the live site, and capture a
full-page screenshot — the journey treats that as an acceptance artifact.

### Cleanup

```bash
azd env get-value RESOURCE_GROUP_NAME          # save this
azd down --force --purge                       # must exit successfully
az group exists --name <resource-group-name>   # must return: false
```

`az group exists` returning `false` is the proof, not `azd down` exiting.

---

## Demo recovery

Stay in the same session so it keeps context, and paste:

```
The following command failed during <phase> on <OS and shell>:

<exact command>

Relevant error output:

<redacted error output>

Inspect the relevant application or Azure state, explain the root cause, make the smallest safe fix, rerun the failed step, and run the applicable verifier. Record the issue and resolution in issues.md. Do not print secrets.
```

Paste the **exact** error, never a paraphrase.

---

## Known demo risks

- **Static Web Apps has five deployment regions.** `centralus`, `eastus2`,
  `westus2`, `westeurope`, `eastasia`. Default to `eastus2`. Asking for anything
  else fails at provision time. The resource group itself can live elsewhere.
- **`azd` cannot publish when source and output both resolve to the project
  root.** That's why `build-static.mjs` and `dist: dist` exist. Skip the build
  step and the deploy fails in a confusing way.
- **ARM64 publish.** On Apple Silicon or Windows on ARM, the publisher can fail
  with `Exec format error` or `cannot execute binary file`. Don't preemptively
  work around it — most hosts are fine. If it hits, the journey's troubleshooting
  has an approved recovery. Never install privileged emulation or make Docker a
  prerequisite.
- **Open-Meteo is live and unauthenticated.** No key to leak, but it is a real
  network dependency. Keep a cached screenshot available in case the demo
  network is unavailable.
- **Model choice.** Use a frontier model for the constitution, the plan, and the
  accessibility review. Smaller models are fine for narrow test fixes.

---

## Demo tips

- **Don't read the prompts aloud** — paste, then narrate the intent.
- Open the journey's `PLAN.md`, scroll all 344 lines of it, and say *"someone
  wrote every line of this by hand."* Then run Step 1.
- If asked why not just point Copilot at `PLAN.md`: that's the honest question.
  `PLAN.md` is one person's context. The constitution is reviewable,
  version-controlled policy that every later phase is checked against, and the
  task list is derived rather than narrated. Same philosophy, repeatable across
  a team.
- Lead the accessibility beat with the keyboard, not with an explanation. People
  who have never thought about focus indicators understand it instantly when
  they watch someone navigate without a mouse.
- Credit the source. The scenario is theirs.
