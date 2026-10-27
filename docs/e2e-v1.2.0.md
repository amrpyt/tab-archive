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

## Main Chrome rollout verified, 2026-10-27

- Read-only inspection of the main Chrome extension manager identified **one** `تاباتي | أرشيف نوشن` card, initially `1.1.0`, with `Loaded from: ~\AppData\Local\Tabati\production-v1.1.0`.
- Created a backup of the original installed extension under `%LOCALAPPDATA%\caveman-compress\backups\tab-archive\2026-10-27-v1.2\production-v1.1.0`.
- Copied the updated `extension/` files **into the same existing installation directory**; all 16 file hashes matched the source. Never accessed or migrated Chrome profile storage, Notion token, or tab contents.
- Used the **specific Tabati card's** Chrome Extensions **Reload** control; the same card immediately displayed **version `1.2.0`** and **`On, extension enabled`**. One Tabati card remained in main Chrome; no second unpacked copy was installed.
- Did not press preview/enroll in main Chrome, trigger a scan, close any tab, or restart Chrome. Connection/enabled archiving status **inside the popup was not inspected** (manager enabled state alone does not imply live Notion connection).
- Release v1.2.0 uploaded to the **private** repo: `https://github.com/amrpyt/tab-archive/releases/tag/v1.2.0`. ZIP contained 16 production files; SHA256: `01B7B8AA7A7011D8F123F081196C1985914DF62EEC5EAA6CCF82E3A92B261CA7`.
