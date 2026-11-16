# KeyCat — REST API Contract v1 (design draft)

> **Version:** 1.0 · **Date:** 15/11/2026 · **State:** PROPOSED / not implemented OpenAPI.  
> **Base path:** `/v1` (when deployed via same-origin reverse proxy, external browser route may be `/api/v1`; proxy strips `/api`).  
> **References:** [`requirements.md`](./requirements.md) FR-01…FR-10 · [`architecture.md`](./architecture.md) · [`database.md`](./database.md).  
> **Caution:** Example values remain illustrative unless covered by approved D-01, D-02, D-04, D-05, A-03 or Auth scope of D-08 in `decision-log.md`. Other decisions remain pending. This document is an API design, **not generated Swagger/OpenAPI YAML**.

## 1. API-wide conventions

| Aspect | Contract [PROPOSED unless PRD locked] |
|---|---|
| Transport | HTTPS in production, JSON UTF-8, ISO8601 UTC timestamps |
| Authentication | `Authorization: Bearer <access_token>`; refresh token via HttpOnly Secure cookie (SameSite per deployed topology) |
| Authorization | Guards: Guest/Public, Member verified+ACTIVE for Start, Admin for `/admin`; owner checks for private resources |
| Success envelope | `{ "data": ..., "meta": { "requestId": "..." } }`; paginated `meta` includes `nextCursor`, `hasMore` |
| Error envelope | `{ "error": { "code": "...", "message": "...", "details": ..., "requestId": "..." } }` |
| IDs | UUID (format validation) |
| Filtering/sorting | Explicit allowlisted fields; no raw SQL order or freeform query fragments |
| Pagination | Cursor/limit for large lists; CORE catalog/history/progress currently default to 20 and allow 1–100 items |
| Time windows | `all_time/weekly/monthly` only when period boundary/timezone approved [D-03] |
| Timeouts/rate limits | Attempt 30 minutes; Auth login 10/15 minutes, resend/forgot 3/hour per email+IP [D-05/D-08]. Other limits TBD. |
| Idempotency | Header `Idempotency-Key` on finish/abandon and sensitive moderation where needed |
| Versioning | URI major `/v1`; immutable `contentVersionId`, `scoringVersion`, `typingCoreVersion` pinned per attempt |
| Unsupported features | No Guest practice, lesson unlock, placement, OAuth, AI or playable Balloon/Space endpoints in MVP |

### 1.1. Examples of envelopes

```json
{
  "data": { "id": "11111111-1111-4111-8111-111111111111", "title": "Home Row" },
  "meta": { "requestId": "req_example" }
}
```

```json
{
  "error": {
    "code": "EMAIL_UNVERIFIED",
    "message": "Vui lòng xác minh email trước khi bắt đầu luyện tập.",
    "details": { "action": "VERIFY_EMAIL" },
    "requestId": "req_example"
  }
}
```

**Privacy:** Public APIs never return `passwordHash`, refresh token hashes, raw event logs, other owners' private results, moderation-only source details or audit fields.

### 1.2. HTTP status and error mapping

| HTTP | Typical code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_FILTER`, `INVALID_MODE`, `INVALID_EVENT_LOG` | Bad shape/syntax/event proof |
| 401 | `AUTH_REQUIRED`, `AUTH_INVALID`, `AUTH_EXPIRED` | Missing/invalid login |
| 403 | `FORBIDDEN`, `EMAIL_UNVERIFIED`, `OWNERSHIP_REQUIRED`, `UNSUPPORTED_DEVICE` | Authorized identity but fails policy; **not** new unlock mechanism |
| 404 | `NOT_FOUND`, `CONTENT_UNPUBLISHED` | Missing/hidden/not published; can conceal private existence |
| 409 | `EMAIL_EXISTS`, `TEMPLATE_VERSION_CONFLICT`, `ATTEMPT_ALREADY_FINALIZED`, `IDEMPOTENCY_CONFLICT`, `REVIEW_CONFLICT` | Conflict/current state changed |
| 410 | `CONTENT_UNAVAILABLE`, `ATTEMPT_EXPIRED` | Archived/expired resource if endpoint policy uses 410 |
| 413 | `EVENT_LOG_TOO_LARGE`, `PAYLOAD_TOO_LARGE` | Config cap exceeded |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Invalid upload |
| 422 | `POLICY_MISMATCH`, `TEMPLATE_INVALID_CONTENT`, `INVALID_SCORING_INPUT` | Semantic validation fails |
| 423 | `ACCOUNT_SUSPENDED` | Suspended account (alternative 403; choose consistently) |
| 429 | `RATE_LIMITED` | Too many attempts/submissions |
| 500/503 | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` | Unexpected/provider outage; no secrets in response |

**[PROPOSED]** HTTP 403 vs 423 for suspended accounts and 404 vs 410 for archived records must be chosen consistently in implementation; business outcome stays the same. **Never emit `LESSON_LOCKED`**: lessons are not gated by prerequisites.

## 2. Authentication & roles

| Rule | API behavior |
|---|---|
| Guest | Public landing/static i18n handled by web; allowed auth endpoints; Explore metadata optional [D-06]; **POST attempt = 401** |
| Member | Authenticated read catalog/profile/own data; **Start requires verified email + ACTIVE account + supported device/policy** |
| Admin | Member rights + admin endpoints; role checked server-side, audit sensitive writes |
| Owner | Only can view/change own private templates, own attempt/result/settings; Admin access only when operationally authorized |
| Suspended | No new attempts, refresh revoked; login/refresh blocked per policy |
| Refresh | Rotate server-side, cookie-only token; replays/reuse rejected/revoked |

### 2.1. Auth endpoints — FR-02

| Method | Endpoint | Auth | Request core | Response core |
|---|---|---|---|---|
| POST | `/auth/register` | Guest | `email, username, password` | 201 account status + verify required; no token before policy satisfied |
| POST | `/auth/verify-email` | Guest | `token` | verification success (`verifiedAt`) |
| POST | `/auth/resend-verification` | Guest | `email` | generic accepted; throttled |
| POST | `/auth/login` | Guest | `email, password` | access token, sanitized `user`; set refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | no JSON body | rotate refresh cookie + access token |
| POST | `/auth/logout` | Auth/refresh cookie | optional session scope TBD | revoke current session; clear refresh cookie |
| POST | `/auth/forgot-password` | Guest | `email` | generic accepted (avoid enumeration) |
| POST | `/auth/reset-password` | Guest | `token,newPassword` | success, invalidate reset token/sessions by policy |
| GET | `/me` | Member | — | profile, roles, verify/status, settings summary |
| PATCH | `/me` | Member owner | whitelisted `displayName, timezone, avatarUrl?` | sanitized profile |
| POST | `/me/password` | Member owner | `currentPassword,newPassword` | success; session rotation policy TBD |
| GET | `/me/settings` | Member owner | — | `uiLanguage, theme, typingFont, fontSize, showKeyboard, showHands, soundEnabled` |
| PATCH | `/me/settings` | Member owner | subset of allowed settings | validated settings |

**Validation:** normalized unique email, Argon2id password 15–128 characters, verify 24 hours, reset 30 minutes, access 15 minutes, refresh maximum 7 days/idle 24 hours [A-03/D-08]; generic response for resend/forgot; suspended users cannot login/refresh and unverified users cannot Start. `role` is never accepted in registration/profile patch. `avatarUrl` must not permit arbitrary SSRF links without validation; media upload optional, see section 7.

**[PROPOSED]** Example register:

```json
{ "email": "learner@example.com", "username": "learner01", "password": "<user-provided-password>" }
```

Response shape:

```json
{ "data": { "id": "uuid", "email": "learner@example.com", "status": "ACTIVE", "emailVerified": false, "verificationRequired": true }, "meta": { "requestId": "req_example" } }
```

**Note:** `ACTIVE` + unverified account may exist, but Start still requires both ACTIVE and verified. Account status modeling and verification status are separate checks.

## 3. Courses / Lessons — FR-03

| Method | Endpoint | Auth | Query/body | Response |
|---|---|---|---|---|
| GET | `/courses` | Member | `cursor?, limit?, status?` (status exposed = published only) | course summaries, cursor |
| GET | `/courses/:courseId/sections` | Member | `cursor?, limit?` | sections ordered by `orderIndex` |
| GET | `/lessons` | Member | `courseId?, sectionId?, lessonType?, cursor?, limit?` | published/active lessons ordered by course ordinal; progress summary |
| GET | `/lessons/:lessonId` | Member | — | title, type, goals, available state, targetId, best progress; no private draft text |
| GET | `/me/progress` | Member owner | `courseId?,cursor?,limit?` | best Lesson stats + completion summary |

**[LOCKED–PRD]** Starting any published lesson is allowed independent of other lessons. `courseOrdinal` is an ordering key, not an unlock requirement. `GET /lessons` never adds `locked`/prerequisite flags. No `placement` endpoints.

Example list item:

```json
{
  "id": "uuid", "courseId": "uuid", "sectionId": "uuid",
  "title": "Keys F & J", "lessonType": "KEY_DRILL", "courseOrdinal": 1,
  "goalWpm": null, "minAccuracy": null,
  "practiceTargetId": "uuid", "best": { "stars": 3, "effectiveWpm": 22.5 }
}
```

`null` goals in this example remain illustrative; valid published lessons follow approved D-01. The six approved sample lessons use goalWpm 20, minAccuracy 90% and minPassWpm 16 [D-04].

## 4. Practice/typing — FR-04, FR-05

### 4.1. Endpoint matrix

| Method | Endpoint | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/practice/attempts` | Member, **verified+ACTIVE** | `targetId, requestedMode` | 201 frozen snapshot, `attemptId`, expiry, rules |
| POST | `/practice/attempts/:attemptId/finish` | Owner, valid attempt | event log, `Idempotency-Key` header | official result + eligibility |
| POST | `/practice/attempts/:attemptId/abandon` | Owner | partial proof when required + idempotency | status `ABANDONED`, no ranked score |
| GET | `/practice/attempts/:attemptId` | Owner or operational Admin | — | state, official result OR partial summary; do not expose private proof publicly |
| GET | `/me/history` | Member owner | `mode?, status?, from?, to?,cursor?,limit?` | recent attempts with result summaries |
| GET | `/me/stats` | Member owner | `from?,to?` | chart buckets, total active duration, WPM/accuracy derived from verified data |
| GET | `/speed-test/configs` | Member | `mode?` | allowed TIME/WORDS presets/config target IDs |
| GET | `/games` | Member | — | Speed Test available; advanced games not runnable; no fake playable links |

**[APPROVED D-02]** Speed presets: TIME 60/120 seconds, WORDS 25/50/100 words. A ranked result must complete its preset without focus loss. Comparison groups require the same mode, preset, punctuation flag, numbers flag and word pool version.

### 4.2. Start attempt

```http
POST /v1/practice/attempts
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{ "targetId": "uuid", "requestedMode": "LESSON" }
```

Response **illustrative contract**:

```json
{
  "data": {
    "attemptId": "uuid",
    "targetId": "uuid",
    "mode": "LESSON",
    "status": "READY",
    "contentVersionId": "uuid",
    "contentHash": "sha256:example",
    "content": { "kind": "TEXT", "text": "asdf jkl;" },
    "configSnapshot": { "keyboardLayout": "US_QWERTY", "policy": {} },
    "scoringVersion": "TBD_AFTER_D01",
    "typingCoreVersion": "TBD",
    "expiresAt": null
  },
  "meta": { "requestId": "req_example" }
}
```

`expiresAt: null` is an outdated illustrative value; implemented Start must return a 30-minute expiry [D-05]. `content.text` for Speed is reconstructed from immutable `wordPoolVersion`, `generatorVersion` and per-attempt server-pinned `seed`; the same snapshot is used for server replay. The server must not trust a client-provided contentVersion/scoring rule, nor accept client `score` as truth. Start accepts an optional `deviceSupported` boolean claim; `false` is rejected with `UNSUPPORTED_DEVICE`. This is a capability signal, not proof of physical hardware.

**Start checks:** valid auth, verified, ACTIVE, device eligibility policy; target kind matches mode; published Lesson or owner/private/approved version; no prerequisite check; exact version pinned. Client device assertion is not proof of physical keyboard; use feasible capability/eligibility rules without claiming perfect hardware attestation.

### 4.3. Event proof and Finish

**Event model [PROPOSED, follows v3.0]:** `eventLogVersion` + array events with `seq`, `kind` (`INSERT`,`BACKSPACE`,`PAUSE`,`RESUME`,`TIMEOUT`), `char?`, `activeTimeMs`, `shift?`, `capsLock?`. `keydown` alone insufficient for arbitrary text input; browser's composition/IME must be handled defensively. For MVP unverified IME/mobile input is ineligible for ranked results. `Tab` interception requires focus and Escape affordance.

For a simple `INTRO` lesson, Finish uses `{ "eventLogVersion": 2, "acknowledged": true }`; it creates a completed unranked result with no WPM or accuracy. A typing proof cannot acknowledge an INTRO. For Speed, a completed result has `score`, `stars` and `passed` set to null; `comparisonGroup` identifies the approved D-02 mode/preset/flags/word-pool scope.

```http
POST /v1/practice/attempts/{attemptId}/finish
Idempotency-Key: request-unique-key
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "eventLogVersion": 1,
  "events": [
    { "seq": 1, "kind": "INSERT", "char": "a", "activeTimeMs": 0, "shift": false, "capsLock": false },
    { "seq": 2, "kind": "INSERT", "char": "s", "activeTimeMs": 430, "shift": false, "capsLock": false }
  ]
}
```

Illustrative **response schema** (numbers NOT calculated from this tiny log):

```json
{
  "data": {
    "attemptId": "uuid", "status": "COMPLETED",
    "result": {
      "verified": true, "eligibleForRanking": true,
      "effectiveWpm": 28.3, "firstTryAccuracy": 97.2,
      "score": 82, "stars": 4, "passed": true,
      "durationMs": 60000, "scoringVersion": "example"
    }
  },
  "meta": { "requestId": "req_example" }
}
```

**Consistency requirements:**

1. `Idempotency-Key` required; same `(attemptId, FINISH, key, request hash)` returns stored result, not another finalization.
2. Same key + **different** body hash → `409 IDEMPOTENCY_CONFLICT`. Different key after terminal → `409 ATTEMPT_ALREADY_FINALIZED` (or return existing only if policy explicitly permits, never recalculate).
3. Server validates owner/state/expiry, event sequence monotonicity, relative times, payload cap, content hash, scoring version and whitelist; rejects/ineligibles tampered input.
4. Server replay computes authoritative `effectiveWpm`/`firstTryAccuracy`, separate `score/stars/passed` for Lesson per **D-01**; Speed may return null for Lesson-specific fields.
5. One DB transaction commits terminal result, best progress, play events and idempotency saved response. No duplicate score from Backspace/finish replay.
6. Offline response lost → browser may retry **identical** attempt/key/hash within D-05 TTL; after expiry, no backdated ranked score.
7. Preview/time-series UI data are provisional; no per-keystroke network call.

### 4.4. Abandon / expired / invalid

`POST .../abandon` returns `status: ABANDONED` and optional partial metrics **not ranked**. Expired attempts return `ATTEMPT_EXPIRED`/EXPIRED on new finalization. `FAILED` vs `COMPLETED but passed=false` follows content/mode-specific policies; do not conflate. `INTRO` ack-only completion requires separate proof version and server validator, not fabricated WPM.

## 5. Templates and moderation — FR-07, FR-08, FR-10

### 5.1. Owner-facing endpoints

| Method | Endpoint | Auth | Request/query | Response |
|---|---|---|---|---|
| GET | `/templates` | Member owner | `type?,status?,sort?(createdAt),cursor?,limit?` | own templates incl PRIVATE/PENDING/REJECTED |
| POST | `/templates` | Member | `title,type,content,gameTypeKey?` | 201 private draft + content version |
| GET | `/templates/:templateId` | Owner; or public approved version under public policy | — | owner sees draft and published pointers; others only approved public info |
| PATCH | `/templates/:templateId` | Owner | title/content patch + `expectedVersionId` | new draft version; previous public version unchanged |
| DELETE | `/templates/:templateId` | Owner | — | archive/soft-delete by policy; never destroy old historical attempt |
| POST | `/templates/:templateId/clone` | Member + source permission | `title?` | new owner private draft; source/license validation |
| POST | `/templates/:templateId/submit-review` | Owner | `contentVersionId` | pending submission exact version |
| POST | `/templates/:templateId/report` | Member | `reasonCode,description?` | report accepted after rate limit |

**[LOCKED–PRD]** `TEXT` = text content, `GAME_CONTENT` = **content-only** (words/quotes/whitelisted presets), cannot modify engine, scoring, spawn rules or supply JS. **[PROPOSED A-05]** because only Speed Test runs in MVP, permit GAME_CONTENT only for compatible Speed Test data; future Balloon/Space game types cannot be started. Need PO confirmation, not a silently added product restriction.

Example create TEXT:

```json
{ "title": "Từ vựng CNTT", "type": "TEXT", "content": { "text": "server client network" } }
```

Example response:

```json
{
  "data": {
    "id": "uuid", "creatorId": "uuid", "title": "Từ vựng CNTT",
    "type": "TEXT", "status": "DRAFT_PRIVATE", "visibility": "PRIVATE",
    "draftContentVersionId": "uuid", "publishedContentVersionId": null
  },
  "meta": { "requestId": "req_example" }
}
```

**Version check:** PATCH creates new immutable draft version. Reject malformed text, disallowed HTML/script, unlicensed source if shared, excessive length [D-04], unauthorized owner, and disallowed GAME_CONTENT keys.

### 5.2. Explore / public catalog

| Method | Endpoint | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/explore/templates` | Member; Guest metadata only if D-06 allows | `type?,sort?(newest/oldest/popular),cursor?,limit?` | **approved published** template summaries |
| GET | `/explore/templates/:templateId` | Member; Guest metadata if D-06 allows | — | public approved version, author, attribution, verified starts/completions |

**No** private, pending, rejected, hidden or newer unapproved draft version in public response. Viewing detail **does not count** as starting/completing a template. Only valid Start creates STARTED; official verified completion creates COMPLETED. Guest can click sign-in CTA but cannot Start.

### 5.3. Admin review endpoints

| Method | Endpoint | Auth | Request/query | Response |
|---|---|---|---|---|
| GET | `/admin/templates/review-queue` | Admin | `status=PENDING_REVIEW,cursor?,limit?` | submission id, exact `contentVersionId`, source and metadata |
| GET | `/admin/templates/:id/reviews/:reviewId` | Admin | — | full submitted immutable version + review status |
| POST | `/admin/templates/:id/decision` | Admin | `reviewId, contentVersionId, decision, reason?, expectedStatus` | approved/rejected exact version; audit id |
| POST | `/admin/templates/:id/hide` | Admin | `reason` | hidden and audit |
| GET | `/admin/templates/reports` | Admin | `status?,cursor?,limit?` | reports list |
| PATCH | `/admin/templates/reports/:reportId` | Admin | `status,notes?` | moderated report + audit |

Example review decision:

```json
{
  "reviewId": "uuid", "contentVersionId": "uuid",
  "decision": "APPROVE", "expectedStatus": "PENDING_REVIEW",
  "reason": null
}
```

If two Admins decide concurrently or `contentVersionId` does not match pending submission → `409 REVIEW_CONFLICT` or `TEMPLATE_VERSION_CONFLICT`. After approval only that content version goes public. Subsequent edit creates new private draft and requires another submission. Existing published version behavior is **[PENDING D-07]**.

## 6. Leaderboards — FR-08

| Method | Endpoint | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/leaderboards` | Member; Guest subject to D-06 | `boardKey,period?,speedConfigId?,cursor?,limit?` | position, user, metric, tie-break info, updatedAt |

**Supported board keys:** `LESSONS_TOTAL`, `SPEED_TEST`, `CONTRIBUTORS`, `GAMES_TOTAL` (empty/no games in MVP). **[LOCKED–PRD]** never merge their metrics.

| Board | Source & ranking metric | Guardrails |
|---|---|---|
| LESSONS_TOTAL | Sum best score for each published Lesson for each user | Verified outcomes only, no repeat farming; weekly/monthly best computed inside selected period, not all-time projection |
| SPEED_TEST | Best verified effective WPM | Compare only same compatible Speed mode/config/version [D-02]; first-try accuracy tie-break as proposed in v3.0, final D-03 |
| CONTRIBUTORS | Unique distinct verified users who complete an author's public templates | Exclude author self-play, views, invalid/private/removed attempts |
| GAMES_TOTAL | No playable advanced games in MVP | Empty / coming soon; never copy Speed score |

**[PENDING D-03]** precise `period` enum/timezone boundaries, tie-break and user rank position policy; do not hardcode a weekly UTC default without approval. If config/period unsupported return 400 `INVALID_FILTER` rather than mixing incomparable data.

Example list envelope:

```json
{
  "data": {
    "boardKey": "SPEED_TEST",
    "scope": { "speedConfigId": "uuid", "period": "all_time" },
    "items": [ { "rank": 1, "user": { "id": "uuid", "username": "demo" }, "effectiveWpm": 71.2, "firstTryAccuracy": 98.4 } ],
    "status": "AVAILABLE"
  },
  "meta": { "requestId": "req_example", "nextCursor": null, "hasMore": false }
}
```

**Note:** `all_time`, speeds and rank are **illustrative**; period support cannot be finalized before D-03. Empty Games example: `{"data":{"boardKey":"GAMES_TOTAL","items":[],"status":"COMING_SOON"},"meta":{"requestId":"req_example"}}`.

## 7. Admin content, users, appearance and audit — FR-10

| Method | Endpoint | Auth | Request/query | Response |
|---|---|---|---|---|
| GET / POST | `/admin/courses` | Admin | list filters / course create DTO | course draft / listing |
| PATCH | `/admin/courses/:id` | Admin | approved fields | updated draft metadata |
| GET / POST | `/admin/sections` | Admin | courseId / section DTO | sections |
| PATCH | `/admin/sections/:id` | Admin | order/title | updated section |
| GET / POST | `/admin/lessons` | Admin | filter / lesson DTO | lesson metadata draft |
| PATCH | `/admin/lessons/:id` | Admin | content + policy draft DTO | new draft version/reference |
| POST | `/admin/lessons/:id/publish` | Admin | `contentVersionId, expectedStatus?` | published immutable pointer + audit |
| GET / POST | `/admin/speed-configs` | Admin | mode/filter / whitelisted config | config draft/list |
| PATCH | `/admin/speed-configs/:id` | Admin | allowed preset/pool changes | new draft version/config |
| POST | `/admin/speed-configs/:id/publish` | Admin | specific config/contentVersion | publish + audit |
| GET | `/admin/users` | Admin | `status?,query?,cursor?,limit?` | sanitized users list |
| PATCH | `/admin/users/:id/status` | Admin | `status,reason` | status change + refresh revoke + audit |
| GET / POST / PATCH | `/admin/themes` and `/admin/themes/:id` | Admin | whitelist theme tokens | validated theme config |
| GET / POST / PATCH | `/admin/banners` and `/admin/banners/:id` | Admin | title/image/approved target URL/status | banner config |
| GET / PATCH | `/admin/site-settings` | Admin | allowlisted key & valid value | settings + audit |
| GET | `/admin/audit-logs` | Admin | `actorId?,action?,from?,to?,cursor?,limit?` | sanitized append-only logs |

**Version policy:** publish creates/points to immutable approved content version; old attempts pinned to old version do not change. Admin content edits **never** write to historical scored results. Admin cannot promote own public registration to ADMIN via client `role`. Cannot suspend the last authorized Admin without safe policy (design recommendation from v3.0). Site settings cannot be used to bypass auth or directly override versioned scoring.

**Media [optional, needs limits D-08]:** if avatar/banner upload enabled, propose `POST /me/avatar` and `POST /admin/banners/:id/image` with validated MIME, size, object storage; **not mandatory as operational endpoint until asset handling confirmed**. No arbitrary remote URL uploads without SSRF protection.

## 8. Filtering / pagination contract

| Endpoint type | Allowed filters | Sort | Cursor base |
|---|---|---|---|
| `/lessons` | `courseId`, `sectionId`, `lessonType` | stable `courseOrdinal ASC,id ASC` | `(courseOrdinal,id)` |
| `/me/history` | `status`, `mode`, `from/to` | `createdAt DESC,id DESC` | `(createdAt,id)` |
| `/templates` | `type`,`status` | `createdAt DESC,id DESC` | `(createdAt,id)` |
| `/explore/templates` | `type` | `newest`, `oldest`, `popular` (only whitelist) | sort value + stable id |
| `/leaderboards` | `boardKey`, approved `period`, config scope | metric DESC + approved tie-break | rank keys + stable user id |
| `/admin/users`, audit | status/query/action/date | stable timestamp/id | `(createdAt,id)` |

**[PROPOSED]** `nextCursor` opaque base64url encoding of immutable paging keys+filter/sort hash; server validates cursor matches same filter/sort, never trusts raw SQL fragments. `limit` defaults/max **TBD**; paginate with empty `items: []`, `nextCursor: null`, `hasMore: false`. Errors: invalid cursor/unsupported order → 400; content hidden → 404, not empty placeholder if direct unauthorized fetch.

**Dates:** use ISO 8601 UTC on API. User timezone only affects display. Leaderboard period boundary **D-03**, so API must not silently infer timezone from client for official rank.

## 9. Validation, failure states and edge cases by feature

| Feature | Validation | Error / Empty / Edge behavior |
|---|---|---|
| Auth | email, unique, password, verify single-use, TTL, rate-limit | Generic reset accepted; 401 wrong password; 403 email unverified on Start; 423/403 suspended; refresh reuse revoked |
| Course/Lesson | published/active, course/section match, valid ordinal | Unpublished 404; no results empty page; no locked lesson error |
| Practice Start | verified+ACTIVE, owner/published target, supported device/mode | Guest 401; unsupported device 403; archived 404/410; rejected template not Startable |
| Typing proof | seq increasing, times monotonic, char/policy, allowed events, size cap, expiry | 400/413/422 invalid; no official ranked score; Backspace doesn't reset first-try |
| Finish | own attempt, nonterminal, same snapshot, `Idempotency-Key` | duplicate same hash returns same response; collision 409; expired 410; race only one result |
| Speed | TIME/WORDS preset allowlist, same config/seed for replay | changed config mid-attempt requires new attempt; incompatible rank groups separate |
| Dashboard | owner + authorized range | no practice => zero/empty with clear label, never fake scores; failed fetch offers Retry |
| Template | owner, type whitelist, length/license, no executable config | bad GAME_CONTENT 422; version conflict 409; draft not in Explore |
| Moderation | Admin, exact pending version, expected status | concurrent decisions 409; rejected includes reason; public v1/v2 per D-07 |
| Explore | approved published only, allowed sort | no approved templates => empty; GET view does not increase usage |
| Rankings | verified+eligible, mode policy, period/config match | empty Games; invalid filter 400; self-play excluded, no metric mixing |
| Profile | valid theme/font/locale, reauth to change password | 422 invalid settings; no overwrite of old valid values |
| Admin | role, valid content, protected actor, audit | Member 403; last-admin lockout blocked per proposed policy; mutation audit required |

### 9.1. Offline / async UI states

`idle → loading → success/empty/error`, and for Finish `running → submitting → confirmed / pending-retry / expired / rejected`. Browser must not show provisional results as official if server is unreachable. Retry must reuse original attempt and key+payload (within D-05 TTL). For E2E, test network drop after DB commit but before HTTP response.

### 9.2. Data safety and error response

- API error includes machine code, localized UI maps code to VI/EN; backend should not expose stack traces or email/token validity to unauthorized callers.
- Structured `requestId` for support; server log includes minimal metadata, not full typing proof or passwords.
- For private resources, return 404 or 403 consistently to limit enumeration; contract should document exact choice before implementing clients.
- Prevent XSS by rendering TEXT/quote as text, not unsafe HTML, and whitelisting attributes for themes/banners. Use schema validation and query binding via ORM.

## 10. Rate limiting, security, CORS, secrets

- **Auth:** server-only password hash (Argon2id/bcrypt), login/verify/reset rate limit, rotating refresh hash, short-lived access token, bearer guard; refresh/logout need CSRF/origin protections consistent with cookie mode.
- **CORS:** prefer same-origin `/api/v1`; on cross-origin configure explicit origin allowlist, `credentials` only when needed; never wildcard with cookies.
- **Secrets:** API env/secret store for JWT signing, DB URL, SMTP creds, object storage keys; frontend environment holds **only public config**. `.env.example` contains placeholders, never real keys.
- **Privacy:** no collection of keyboard input outside practice; raw proof cap/retention D-05; don't return raw logs in leaderboard/history responses.
- **Abuse:** rate-limit templates/reports; file MIME/size validation D-08; sanitize external links; admin audit for sensitive writes.

## 11. Contract testing & implementation gate

**Contract and E2E test set:**

1. Guest POST Start → 401; unverified/blocked member → appropriate 403/423; published final Lesson Start succeeds without prerequisite.
2. Start v1, publish v2, finish v1 → server verifies with v1 snapshot and unchanged historical result.
3. Backspace farm loops do not increase official score; first-try mistakes persist.
4. Finish twice same key/hash → same official result; changed hash or racing keys → no duplicated progress/ranking.
5. Speed TIME vs WORDS/incompatible configs separated; never merge with Games.
6. Template created private not on Explore; exact v1 approved, v2 draft invisible; concurrent Admin decisions 409.
7. Views don't increase play count; self-play does not increase contributor unique players.
8. User A GET result from B denied; Member Admin mutation forbidden; suspended account cannot Start/refreshed auth.
9. Invalid proof sequence/timing/payload cap → not ranked; offline retry after expiry explicit error.
10. No history/Explore/Games results → documented empty state; loading and 5xx retry UX tested.

**Before writing source code:** approve stack/deployment A-01…A-05 and PRD D-01…D-11 applicable to released functionality; generate actual OpenAPI 3.1 from NestJS DTO/Swagger and compare contract snapshots to this design. Do not claim this Markdown is machine-readable OpenAPI.

## 12. Coverage and out-of-scope check

| PRD | Endpoints | Notes |
|---|---|---|
| FR-01 | Frontend routes + `/me/settings`, `/admin/themes` | Locale/theme UI primarily frontend |
| FR-02 | `/auth/*`, `/me/password` | Verified+ACTIVE enforcement |
| FR-03 | `/courses`, `/lessons`, `/me/progress` | No unlock |
| FR-04 | `/practice/attempts*` | Server replay/idempotency |
| FR-05 | `/speed-test/configs`, `/games` | Only playable Speed Test |
| FR-06 | `/me/stats`, `/me/history`, `/me/progress` | Owner-only |
| FR-07 | `/templates*` | TEXT/GAME_CONTENT and version review |
| FR-08 | `/explore/templates`, `/leaderboards`, reports | Four separate boards, Games empty |
| FR-09 | `/me`, `/me/settings`, `/me/password` | Upload optional |
| FR-10 | `/admin/*` | Role guard, exact version, audit |

**Explicitly no MVP endpoint:** `/ai/*`, `/auth/google`, `/auth/apple`, `/games/balloon/start`, `/games/space/start`, `/practice/guest/*`, `/lessons/:id/unlock`, `/placement/*`, `/admin/game-plugins/*`. These are [EXT] or excluded by PRD. Adding them is a product scope change.
