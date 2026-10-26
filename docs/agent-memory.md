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

## Only remaining owner step
- Owner creates private Notion integration from logged-in workspace, gives archive DB only read/insert permissions, pastes token into installed extension popup; never send token via chat.
- Real Notion live acceptance: 3 disposable tabs, wait 5min each; ensure row before close, tags/category, duplicate check, offline recovery.

## Backups
- Caveman Compress script calls Claude; user forbids. Compress prose manually with original preserved outside repo: `%LOCALAPPDATA%\caveman-compress\backups\tab-archive\` (`AGENTS.*.original.md`, `agent-memory.*.original.md`). Never compress code, URLs, commands, secrets.
- Global memory: `mem context "tab-archive: <task>"` first; record verified milestones under project tab-archive. No worktrees.
