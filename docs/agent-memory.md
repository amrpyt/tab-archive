# Tab Archive — durable agent context

## Owner intent (2026-10-26)
- One job now: any tab user opens and leaves unused for ~5 minutes should save to Notion automatically and close after a successful save.
- Entries organized without human effort. Tags/categories for YouTube, coding, AI, religion, design, work, general sites.
- User can find and reopen links later. Minimal UI. Avoid ADHD reading load: caveman for user-facing text.
- User explicitly deferred ALL embedding models/semantic retrieval/YouTube transcript search to V2.
- Use `ponytail` across project, `using-superpowers` for design/execution, `caveman-compress` for `AGENTS.md`; agent-only depth belongs in local files, not user views.

## Existing assets
- Existing Notion project page: https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825
- Existing Notion archive DB: https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1
- Notion data source ID: `af3460cb-e50f-4799-af0e-bc5a72169e52`.
- Archive properties: `العنوان`, `الرابط`, `النوع`, `التصنيف`, `الوسوم`, `آخر استخدام`, `تاريخ الحفظ`, `وصف مختصر`.
- Workspace directory: `/vibe-coding/03-Personal-Projects/tab-archive` (CoS Local Windows virtual path).
- Repo is newly documented; no extension is installed/built yet. Never claim auto-archive works before end-to-end validation.

## Decisions / assumptions for review
- V1: Chrome Manifest V3 browser extension, `chrome.tabs.Tab.lastAccessed` + `chrome.alarms`, direct Notion official API with a scoped one-time integration token (personal-only MVP). No VPS needed in V1.
- 5-minute idle means background/unselected tab. Active tab protected even if window is untouched. Pinned, audible, private, restricted URLs protected.
- Save only metadata. Automatic classification via local rules based on hostname/title. No hosted AI in V1.
- Token and unsynced records stay in extension local storage, never in repo, logs, exported files or Notion page. Keep Notion integration limited to one archive DB.
- Owner directly authorized implementation on 2026-10-26 without another review or extra approvals; overrides prior spec review gate. Do not request repeated approval.

## Research notes
- Official Chrome `tabs.Tab.lastAccessed`: Chrome 121+; reports last activation in its window: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome alarms approximate timing; do not promise exact 5:00 wall-clock closure: https://developer.chrome.com/docs/extensions/reference/api/alarms
- Official Notion integration instructions: https://www.notion.com/help/create-integrations-with-the-notion-api
- Notion typical API limit ~3 requests/second; handle 429 and Retry-After: https://developers.notion.com/reference/request-limits
- Reuse candidates considered: Tab Wrangler (auto close), Vaultab (collections), nTabs (Notion sync); audit licenses and code before adopting.

## Current status
- V1 implemented 2026-10-26 in `extension/`: `manifest.json`, `core.js`, `engine.js`, `background.js`, `content.js`, `popup.html`, `popup.css`, `popup.js`. No external runtime dependencies, no server.
- Node built-in tests `npm test`: 19/19 passed. Tested retry, 429, unknown-response dedup, dirty forms, tab navigation race, protected tabs, browser restart/session-restore, token boundary, classification, manifest, popup.
- Real isolated Chrome `agent-browser --session tabarchive-v1-smoke --extension <path>`: extension loaded in chrome://extensions, popup rendered, setting `idleMinutes` updated to 2 and persisted after reopening. A real popup-vs-content sender bug was caught and fixed via TDD. Existing user's Chrome profile/tabs untouched.
- Notion schema checked via connected Notion: required fields/data source correct. Live official-API write/auto-close with user's integration token NOT verified; must connect in extension UI and trial 3-5 disposable tabs before enabling broadly.
- Dist ZIP and docs generated for local install. Notion project/archive linked in `README.md`.
- `caveman-compress` CLI tried for `AGENTS.md` but Claude invocation failed (`Claude call failed`); compressed manually per skill rules. Original backup: `%LOCALAPPDATA%\caveman-compress\backups\tab-archive\AGENTS.original.md`.

## Implementation notes
- Node tests mock Chrome APIs and Notion request, *not* proof of live Notion remote permissions. A manual integration token in user's own extension is needed; never request it in chat.
- MV3 Chrome min 121; 1-minute alarm approximates 5-minute threshold. `chrome.storage.local.setAccessLevel('TRUSTED_CONTEXTS')` protects token from content scripts.
- Chrome content script marks input/change in any frame dirty and refuses auto-close. False positives are acceptable; stale unsaved form safety is higher priority.
- Session restore: startup clears tracked tab IDs, so pre-existing tabs never swept. Untouched backlog remains until activated/navigated.
- Background form responder accepts only popup origin for CONFIGURE/CONNECT/STATUS; content scripts can only send DIRTY.
- On 429, `Retry-After` honored; uncertain remote write recovers by URL query instead of creating duplicates.
- Startup protects restored browser tabs for 2 minutes; untouched backlog never auto-enrolls on background page updates. Only user activation after startup can enroll old tabs. New tab URL starts provisional if tab was created before URL known.

## Final permission check 2026-10-26
- User authorized completing setup without repeated review. Notion plugin CAN access project/archive but offers NO API-token creation/retrieval action; its delegated connection cannot authenticate a standalone Chrome extension.
- Inspected available local Notion token env VAR NAMES (without reading any token): `NOTION_TOKEN`, `NOTION_API_KEY`, `NOTION_ACCESS_TOKEN`, `NOTION_SECRET` absent in process/user environments.
- Browser tool exposed ~152 user Chrome tabs, including signed-in Notion pages; tool only allows reading, not clicking/installing. Chrome main process has no remote-debugging channel. Never restart/hijack those tabs to install.
- Isolated Notion integrations browser session did not reach interactive authenticated settings (loading screen). Closed test session. No token obtained, no credential disclosed.
- Added fail-closed sensitivity rules for Outlook, Microsoft mail, banking/admin portals, work dashboards, purchase/customer paths, CSRF/sensitive parameters. `npm test` 19/19 still green.
- Remaining owner-controlled steps: create private Notion integration, share archive with it, paste key directly in installed extension, then run 3–5 disposable-tab live checks. No real Notion save+close claimed yet.
