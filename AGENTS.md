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
- V1 metadata only. No secrets, forms, body text, transcripts. Official Notion API. No bulk-close or existing-tab sweep.
- Mock Chrome E2E passed. **Live Notion API write/close NOT verified** without owner-created scoped integration token.
- Production extension loaded in isolated Chrome. Real Notion API returned 401 for deliberately invalid test token; auto-save stayed OFF.
- Chrome 137+ branded ignores `--load-extension`. Isolated launcher uses Chrome for Testing; never load user Chrome profile.

## References
- Spec: `docs/superpowers/specs/2026-10-26-tab-archive-v1-design.md`
- Memory: `docs/agent-memory.md`
- Notion project: https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825
- Notion archive: https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1
