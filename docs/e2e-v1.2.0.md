# Tabati v1.2.0 — focused acceptance, 2026-10-27

## Verified

- Isolated Chrome for Testing (not the user's main Chrome) loaded Manifest V3 version `1.2.0`.
- With a disposable, nonfunctional test token entered via an internal **test-only** configuration (no live Notion call), the popup counted **2** potentially eligible pre-existing tabs on preview. Preview did not close/enroll.
- A normal click on **ضم أول ١٠ تبويبات** enrolled 2 old test tabs. MDN and Example Domain stayed open; pinned Example.org was not enrolled or closed.
- A real `GET_METADATA` message in MDN returned clean metadata with a title and description; did not send HTML. Example.com returned title, no description.
- Arabic RTL and English LTR controls visibly worked. The test authorization was disconnected after testing; final isolated status: `enabled=false`, `hasToken=false`, `pending=0`.
- Node regression suite **42/42 pass**. Safety scenario: an iframe injected while a Notion write is in flight prevents closure of an enrolled old tab after API acknowledgment. `node --check` and `git diff --check` checked at release.

## Not verified in v1.2.0

- A new Notion row containing `وصف مختصر` from a real public page (isolated profile no longer had live Notion authorization).
- Real offline/retry for Chrome service worker (previous CDP offline test does not affect the worker).
- All possible unsaved drafts of complex SPA sites; guard intentionally fails closed where state is uncertain.

## Production safety boundary

- Do not use the user's existing Chrome tabs for destructive tests; do not automatically import old tabs or expose/copy any tokens.
- Updating unpacked Chrome installation must retain the **same extension ID/path** to preserve its profile-local state; do not load a second copy from another folder.
