# Tab Archive — V1 product + architecture spec

Status: **V1 implemented; 26/26 regression tests, isolated Chrome true 5-minute idle/close with fake Notion API, duplicate/retry/protections/restart verified. Real Notion API write/close NOT verified: owner-scoped integration token missing.** Date: 2026-10-26. Owner authorized execution without extra review.

## Outcome
User has ~145 Chrome tabs across unrelated topics. Opening useful links should require zero manual bookmarking. Within approximately 5 minutes **after a tab stops being selected**, V1 archives its link into existing Notion DB, labels it, and closes the exact same tab only on confirmed successful save. Saved links remain in Notion after reopening.

## Scope / staged delivery

### V1 — ship first
1. Chrome Manifest V3 extension, initial setup for a Notion archive database.
2. Default idle threshold 5 minutes (editable). Check at ~30–60 second cadence, best-effort; Chrome can delay alarms.
3. Save `العنوان` (title), `الرابط` (URL), `النوع` (YouTube/article/site/other), `التصنيف` (coding/AI/religion/design/work/other), `الوسوم` (small deterministic labels), optional short description and last-active time.
4. Auto-close **only after Notion confirms the entry**. Preserve tab when API fails. Retry later without duplicate creation.
5. Exception list, pause/resume, simple popup: enabled/paused, timeout, exceptions, connection, count of pending/failed saves, link to Notion archive.
6. Search/restore uses existing Notion archive table + gallery. Reopening does not delete entries.

### V2 — explicitly deferred
Page-body extraction, YouTube transcripts + timestamps, embeddings, local Google text model, Qdrant, semantic/hybrid search, smart AI tagging, AI summaries, VPS service. Do not let any V2 work block V1.

## Proposed approaches

| Approach | Pros | Costs | Decision |
| --- | --- | --- | --- |
| Install off-the-shelf Tab Wrangler | Fast existing idle close | No native Notion record-first workflow | Not suitable for exact V1 |
| Fork nTabs / Vaultab and add idle logic | Existing parts | More code/UI than needed, licenses to audit | Consider reuse of verified pieces |
| Minimal MV3 + official Notion API | Few moving parts; existing Notion DB; no VPS | One-time token setup; API retry logic | **Recommended V1** |

No framework, backend, vector DB, message broker, or AI dependency for V1. Re-evaluate existing code/libraries before implementing.

## Detailed behavior

**Idle semantics.** Browser `Tab.lastAccessed` is last activation in tab's own window (Chrome 121+). Use this with created/updated tab observation to avoid immediate archiving of a new background tab. For each eligible tab, countdown begins when it is no longer selected; the tab selected in each window is protected. Browser alarm checks periodically; delay tolerance up to scheduler delay.

**Protection.** Skip currently active, pinned, audible, incognito, browser-internal (`chrome:`, `about:`, `chrome-extension:`), malformed/non-http(s), and explicitly excluded hostnames. Default-protect sign-in/account, payments and sensitive work areas where identifiable; allow user to edit exclusions. Cannot perfectly detect unsaved forms from tab metadata: do not claim otherwise. Avoid requesting page-content/host access beyond what's necessary for V1.

**Save transaction.** Snapshot tab ID, URL, title, lastAccessed, timestamp. Record pending save durably in `chrome.storage.local`; keep enough metadata to recover after service-worker restart. Use official Notion API on the one preselected data source. Deduplicate by canonical URL (strip known tracking params only; preserve path and meaningful params such as YouTube `v` and time). Search existing archive item before create, serialize in-flight writes by canonical URL, and back off on 429/network/5xx. Never write duplicate on an uncertain response until re-query. After positive Notion acknowledgment, re-read tab and verify ID, URL, idle, unpinned, unsounded, still eligible; close. If navigation/activity changed, **leave open** but saved record remains. On Notion failure or revoked permissions, **leave open**.

**Classification.** Local domain/title heuristics, no model: youtube.com/youtu.be -> YouTube; code/dev tooling -> Coding; AI tooling -> AI; religious material -> Religion; visual design -> Design; other sites -> Work or Other using a small editable site-rule map. Allow corrections in Notion. Unknown -> Other; avoid confident inferred tags from limited metadata.

**Integration.** One-time internal Notion integration token with permission only to the archive data source. Keep in extension local storage, never source control, console output, or exported backups. Provide a connection test and helpful Arabic error. Notion chat connector is *not* the extension's runtime integration. Prefer an official OAuth flow later if external/public distribution is requested; personal V1 accepts manual setup.

**Privacy.** Metadata of saved tabs leaves the browser for the user's Notion workspace. Do not archive incognito. Reject sensitive URLs with password/token-bearing query components; skip rather than leak. No browsing-history upload. Local pending storage expires only after verified durable save; expose failures clearly.

## Acceptance checks (must run before declaring V1 done)
1. Open ordinary webpage; switch away; after about 5 min, exactly one Notion entry; original tab closed only after verification.
2. No network / Notion 429 / invalid token / permissions revoked: tab remains; error visible; recovery retry works; no duplicate row.
3. Active, pinned, audible, private, browser-internal, and excluded site: no auto-close.
4. Re-activate or navigate a tab while Notion request pending: tab stays open.
5. Reopen archived tab: Notion entry retained. Save same URL again: no duplicate.
6. YouTube, coding, religion, unknown URL create correct source/category or safely fall back to Other.
7. Restart Chrome/extension with pending item: no data loss, retry eventually after reconnect.
8. Test multi-window tabs, group tabs, pause/resume, configurable timeout; verify first-run UX on real Chrome.

## Rollout and remaining decisions
- First-run must ask for Notion token/database permission; owner to grant during actual setup. No token in docs.
- No auto-closing the user's existing backlog on first install. Only observe tabs opened after enablement until the owner explicitly opts into importing old tabs. Trial with 3–5 disposable tabs, then wider rollout.
- Exact set of default excluded domains and category rules can be tuned after hands-on trial.
- Owner directly authorized execution on 2026-10-26, superseding the former review gate. Plan at `docs/superpowers/plans/2026-10-26-v1.md`; implementation built. Before activating on the owner's Chrome, connect Notion and run 3–5 disposable-tab live checks with the integration token entered only in the extension UI.
