# Tab Archive — compressed agent memory (2026-10-26)

## Goal
- Chrome MV3: new tab left in background 5 min -> Notion metadata write -> ack -> recheck tab/dirty/URL -> close. Zero manual bookmarking.
- Notion keeps links, titles, source, category, tags, date. Search/reopen. Never close without confirmed save; failure retries.
- User-facing Egyptian Arabic Caveman; ADHD-friendly. Tech detail agent-only. Superpowers + TDD, Ponytail ultra, no Claude.
- V2 ONLY: embeddings, semantic search, page content, YouTube transcripts/timestamps, AI tagging, vector DB. No V2 implementation.

## Paths and Notion
- Project: `D:\Vibe Coding\03-Personal-Projects\tab-archive`
- Source: `extension/`; tests: `tests/`; ZIP: `dist/tab-archive-v1.zip`.
- Project page: https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825
- Archive database: https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1
- Data source: `af3460cb-e50f-4799-af0e-bc5a72169e52`.
- Exact properties: `العنوان`, `الرابط`, `النوع`, `التصنيف`, `الوسوم`, `آخر استخدام`, `تاريخ الحفظ`, `وصف مختصر`.
- Spec `docs/superpowers/specs/2026-10-26-tab-archive-v1-design.md`; plan `docs/superpowers/plans/2026-10-26-v1.md`; E2E `docs/e2e-2026-10-26.md`.

## Architecture and safety
- No dependencies/backend. `chrome.tabs`, `chrome.alarms` (1m), `chrome.storage.local` + `chrome.storage.session`. Official Notion API `2025-09-03`.
- Local token scoped to archive, trusted extension storage only. No token logged, stored in repo or handed to chat. Connected Notion plugin's credentials NOT reusable by extension.
- Idle starts AFTER deselection, not opening. New background tabs use creation time. Active tab protected even if window idle.
- `onCreated` provisional `chrome://newtab` -> `onUpdated` final URL. Old background tabs ignored until user activates. Browser restart marker in `storage.session` clears stale IDs; 2-minute restore grace.
- Protect active/pinned/audible/incognito/private/auth/admin/bank/messaging-sensitive/dirty/excluded, restricted URL and token-bearing URL. Frame content script flags trusted edits. Reload same URL does NOT clear dirty flag.
- Pause drops tracked candidates. Resume does not close paused tabs. Query canonical URL to dedup; persist pending before network, honor 429 Retry-After, retry ambiguous responses, verify right tab before removal.
- Chrome tab close should only follow Notion success. No production tests against user's existing tabs.

## Verified 2026-10-26
- Node suite `npm test`: **26/26 pass**. Syntax `node --check` to run at final pack.
- Real isolated Chrome + test-only local fake Notion (NOT live Notion API): wall-clock ~5m23s -> saved title/URL/category/tags -> tab closed. Pinned, sensitive, unsaved form, excluded untouched. Search/reopen + duplicate dedup. Offline -> remains open/pending; reconnect -> save/close. Pause/resume safe.
- Isolated persistent Chrome browser restart: stale tracking found then fixed. `chrome.storage.session` marker resets old tracked IDs; connection config persists. Browser runner sometimes disabled unpacked extension until Developer Mode reenabled; isolated only.
- Notion connector: existing archive schema and gallery view verified; cleared empty filters. Gallery reads 0 rows. No external Notion integration token available via connector or env. No real Notion HTTP write/close done.
- Latest gap check: standalone production `extension/` loaded in isolated Chrome profile. Real `api.notion.com` request with deliberately fake, nonsecret token returned HTTP 401; config remained disabled/no token stored; network/API path reachable. NOT an authorized save.
- Examined Notion connector (no token issuance action), Composio (Notion unconnected and content tools only), TinyFish (no signed-in Notion profile), Browser app (read-only). None can grant/export safe standalone extension authorization. No sessions/keys/cookies accessed.
- Fixed `فتح-كروم-منفصل.ps1`: branded Chrome 137+ ignores `--load-extension`; use installed Chrome for Testing with dedicated `%LOCALAPPDATA%\tab-archive-isolated-chrome` profile. Launched process verified separate and uses `--load-extension`. Opens extensions + Notion integrations settings.

## Live Notion acceptance, 2026-10-27
- Owner connected the isolated Chrome extension directly to `Tab Archive V1 Private`. Existing connection Read + Insert ON, Update OFF, project page grant inherited by archive. No token copied to project, agents, logs, or final output; user's previously disclosed token is a known risk.
- `enabled=true`, default idle 5 minutes. Two new disposable background tabs waited >5 actual minutes; both archived through the official API. Local recent recorded Notion page IDs; tabs closed only after confirmation.
- Queried the Notion archive view independently: `Example Domain` URL `/...20261027-one` category `أخرى`, tags `بحث`; `JavaScript | MDN` URL `/...20261027-two` category `برمجة`, tags `تعليم`.
- Duplicate URL archived again after 1-minute shortened test interval: exactly one row per canonical URL; third new row `...20261027-offline` created when the browser CDP offline switch did not isolate extension service worker. That is **not** evidence of retry under a real outage; retry is validated only by automated mock tests.
- Live pinned tab stayed open, pause/resume left its new tab untracked, recent-search filtered and reopened URL. Restored `idleMinutes=5`, auto-save enabled, removed disposable safety tabs only. Original Chrome remained untouched.
- Automatic background alarm tested separately, not via manual `SCAN`: disposable `example.org/?tabArchiveTest=20261027-auto` archived after idle=1-minute test setting, then closed. Browser reported `stillOpen=false`, `recentSaved=true`, valid page ID. Notion view independently confirmed fourth row. Restored `idleMinutes=5`, enabled true, recent=4, pending=0, lastError empty.
- UI v1.1.0: Arabic/English button, persisted locale and automatic RTL/LTR; Arabic `Point R` system preference, bundled IBM Plex Sans Arabic weights 400/500/600/700 fallback, English Inter variable. Point R distributable assets/license not verified. English rule terms accepted without altering Notion Arabic taxonomy. 29/29 Node tests passed after changes.
- Isolated Chrome for Testing requires Developer Mode ON for unpacked extension. `chrome.runtime.reload()` from popup unexpectedly disabled it; reenabled Developer Mode, then successfully reloaded from `chrome://extensions`. No original browser affected.

## Backups
- Caveman Compress script calls Claude; user forbids. Compress prose manually with original preserved outside repo: `%LOCALAPPDATA%\caveman-compress\backups\tab-archive\` (`AGENTS.*.original.md`, `agent-memory.*.original.md`). Never compress code, URLs, commands, secrets.
- Global memory: `mem context "tab-archive: <task>"` when relevant; record verified milestones under project tab-archive. No worktrees. Do not run Caveman Compress code that invokes Claude.

## v1.2.0 — legacy enrollment and metadata (2026-10-27)
- Explicit preview and import of at most 10 existing Chrome tabs per click. No automatic import; new idle timer from enrollment. Host permission check; top-frame injection; reject dirty forms, iframes, unsafe/active/pinned/audible pages and failed probes. Rejected tabs are not repeatedly retried until navigation or user reactivation. No browser restart/bulk close.
- Bounded local OG/SEO metadata: title, description, site name, type, keywords (max 5). Sanitized before Notion; `وصف مختصر` property used when safe; enriches category and local recent search. No page HTML, input values or full-text indexing.
- E2E on Chrome for Testing extension v1.2.0: with a **dummy local authorization solely to enable import**, preview counted 2 eligible tabs, explicit enrollment registered both, pinned third protected, all 3 remained open, MDN guard returned title/description, bilingual popup worked. Dummy token removed and archiving disabled. **No real Notion v1.2.0 write was verified.** Prior v1.1 live Notion acceptance remains separate evidence.
- v1.2 safety regression: fresh iframe appearing during the HTTP write prevents old tab closure even after Notion acknowledgment; injection targets top frame only. `npm test` **42/42**.
- Use `docs/e2e-v1.2.0.md` for verified vs unverified boundaries. Never inspect or copy Chrome profile token.
- Main Chrome v1.2 rollout confirmed live by UI Automation on the Tabati extension card: exact previously installed path retained, 16 files checksum-identical, Reload via manager, version 1.2.0 / enabled. No second card; no browser restart/tabs touched. Previous v1.1 directory copy safely stored outside repo before overwrite. Popup Notion connection status not assessed. GitHub Release v1.2.0 published with ZIP SHA256 `01B7B8AA7A7011D8F123F081196C1985914DF62EEC5EAA6CCF82E3A92B261CA7`.
