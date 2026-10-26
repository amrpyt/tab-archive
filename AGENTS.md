# Tab Archive — agent rules

## Priority
- V1: Chrome tab idle 5 min -> Notion save -> close after confirmed save only. Reopen via Notion.
- V2 only: embeddings, semantic search, YouTube transcripts/timestamps, vector DB, AI tagging. Skip during V1.
- User UI/docs: Egyptian Arabic, caveman, <=20 words/sentence. No jargon/filler.

## Workflow
- Each session: `mem context "tab-archive: <task>"`. Read `docs/agent-memory.md`, latest spec, git status, affected code.
- `using-superpowers`: brainstorm -> spec -> writing-plans -> TDD. Owner already authorized V1; no repeat approval.
- `ponytail` ultra throughout. Reuse open source, native browser/Notion APIs. Minimum dependencies/files. No speculative features.
- Nontrivial logic: one meaningful regression check. Real Chrome + failure-path verification.
- Record decisions, blockers, tests in `docs/agent-memory.md`. Memory scoped `tab-archive`; never secrets/tokens.
- Technical detail here and `docs/superpowers/`. Short Notion page.

## Safety & done
- Close only after Notion confirmed save; failure -> keep tab + retry. Recheck ID/URL/activity before close.
- Skip active, pinned, audible, incognito, restricted, excluded tabs. Avoid private/authenticated content/forms.
- V1 metadata only: URL, title, source, category/tags, date. No bodies/transcripts. Official Notion API.
- No bulk close without tested recovery. Preserve existing tabs/sessions/unrelated files.
- First install: never sweep pre-existing backlog without explicit owner opt-in.
- Done only after real Chrome + Notion tests in `docs/superpowers/specs/2026-10-26-tab-archive-v1-design.md` pass.

## References
- Spec: `docs/superpowers/specs/2026-10-26-tab-archive-v1-design.md`
- Memory: `docs/agent-memory.md`
- Notion project: https://app.notion.com/p/40573001a837813f9e18e4d7d81b7825
- Notion archive: https://app.notion.com/p/317f30f5a9cf4e3ea7a8ed034b91e3c1
