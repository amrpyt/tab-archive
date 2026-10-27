# Tab Archive — agent rules (Caveman Compress)

## Priority
- V1: tab background 5 min -> save metadata in Notion -> confirm -> recheck unchanged/clean -> close. Search/reopen via Notion.
- V2 only: embeddings, semantic search, transcript/timestamps, vector DB, AI tagging, page text. No V2 during V1.
- User UI/docs: Egyptian Arabic, Caveman, <=20 words/sentence. Tech detail agent-only.

## Workflow
- Each session: `mem context "tab-archive: <task>"`; read `docs/agent-memory.md`, spec, git status, touched code.
- Superpowers specs/plans/TDD; owner authorized V1. Ponytail ultra: smallest safe diff, native APIs, no speculative dependencies.
- Reproduce failures with tests; verify real isolated Chrome. Log decisions/tests in `docs/agent-memory.md`; never secrets/tokens.
- Backups outside repo, under `%LOCALAPPDATA%\caveman-compress\backups\tab-archive\`. No Claude calls.

## Safety & done
- Never close without confirmed Notion write + second tab/form safety check. Failed save -> stay open, retry; deduplicate.
- Skip active/pinned/audible/incognito/restricted/excluded/dirty. Browser restart: `chrome.storage.session` marker clears stale IDs; pause ignores tabs.
- V1 metadata only. No secrets, forms, body text, transcripts. Official Notion API. Existing-tab enrollment is **explicit**, preview-first, at most 10 per click; no automatic sweep or bulk-close. New idle timer for enrolled tabs. Guard any old tab with an iframe, previously edited form, or failed injection; check again before and after Notion I/O.
- Real isolated Chrome E2E passed on 2026-10-27. Actual Notion entries verified independently via Notion data source view. No user Chrome tabs touched.
- Production extension loaded in isolated Chrome. Real Notion API returned 401 for deliberately invalid test token; auto-save stayed OFF.
- Chrome 137+ branded ignores `--load-extension`. Isolated launcher uses Chrome for Testing; never load user Chrome profile.
- 2026-10-27: created real Notion Developer connection `Tab Archive V1 Private` via UI Automation on separate Chrome window. Read/Insert ON; Update OFF. Notion connected it to project parent; archive inherits access.
- 2026-10-27 owner pasted token directly into isolated popup; extension `connected=true`, `enabled=true`. Never read, copy, echo or log token, even with user's consent. Prior token exposure is a known security risk.
- Real idle >5min: `Example Domain` and `JavaScript | MDN` archived with title, URL, category and tags before tabs closed. Notion view verified records; duplicate produced no new row; pinned tab and tab created while paused stayed safe. Local recovery 29/29 tests; real network-drop test NOT verified (CDP offline does not affect extension worker).
- Independent automatic alarm E2E: at 1-minute test idle setting, disposable `example.org/?tabArchiveTest=20261027-auto` was archived and closed by periodic background scan **without** manual `SCAN`; Notion view confirmed row. Restored enabled=true and idleMinutes=5.
- V1.1.0 UI: Arabic RTL + English LTR switching; English category rules normalized to original Notion Arabic values. Prefer `Point R` if user has font installed; fallback bundled OFL IBM Plex Sans Arabic Regular/Medium/SemiBold/Bold, Inter variable for English. The exact Point R font binary/license could not be verified; do not claim it is bundled.
- Isolated Chrome Developer Mode must be enabled for unpacked extension; use Chrome extension manager Reload instead of `chrome.runtime.reload()` in the popup (which may disable unpacked extension).
- Only repeat tests on code changes or new failures; no V2 work.
- v1.2.0 isolated Chrome: explicit enrollment of 2 existing test tabs worked; pinned tab was skipped; both stayed open; metadata read from MDN; EN/AR UI confirmed. Isolated dummy test authorization was disabled and removed. This was **not** a live Notion metadata-write test. Node suite **42/42**, including iframe added while saving. See `docs/e2e-v1.2.0.md`.
- Production Chrome rollout: verified installed v1.1.0 was the unpacked directory `%LOCALAPPDATA%\Tabati\production-v1.1.0`. Backed up, copied 16 matching files in-place, used Tabati-only Reload in Chrome Extensions. One Tabati card showed v1.2.0 **enabled**. Did not touch tabs/profile storage or verify main popup's Notion connection. ZIP hash and GitHub release in `docs/e2e-v1.2.0.md`.

## References
- Spec: `docs/superpowers/specs/2026-10-26-tab-archive-v1-design.md`
- Memory: `docs/agent-memory.md`
- Notion project: https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825
- Notion archive: https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1
