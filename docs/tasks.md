# KeyCat — Development Tasks (Codex-ready Backlog)

> **Phiên bản:** 1.0 · **Ngày:** 15/11/2026 · **Trạng thái:** IN_PROGRESS (xem trạng thái từng task)
> **Nguồn sự thật:** [PRD](./requirements.md) · [Architecture](./architecture.md) · [Database](./database.md) · [REST API](./api-spec.md) · [Roadmap](./roadmap.md).
> **Stack dự kiến:** React/TS/Vite/Tailwind; NestJS/TS; PostgreSQL/Prisma; pnpm workspace; static web + API container + managed PostgreSQL. Chỉ bắt đầu khi A-01/A-02 được duyệt.

## 1. Quy ước giao việc cho Codex

- Mỗi task là **một lần giao việc có ranh giới**; Codex phải đọc `docs/requirements.md`, `docs/architecture.md`, `docs/database.md`, `docs/api-spec.md` cùng mục task ID này trước khi sửa file. Không tự thay đổi đặc tả hoặc mở rộng tính năng.
- **Trạng thái khởi tạo của tất cả task: TODO.** Chỉ người thực hiện cập nhật `IN_PROGRESS`, `BLOCKED`, `IN_REVIEW`, `DONE` sau khi có bằng chứng. Task bị gate chưa duyệt vẫn TODO/BLOCKED; không suy đoán thông số.
- Kích thước tương đối: **S** ≈ nửa ngày; **M** ≈ 1 ngày; **L** ≈ 1–2 ngày làm việc tập trung, *không* phải cam kết thời gian. Nếu vượt một module hoặc quá 2 ngày, chia subtask, không thêm yêu cầu.
- Ưu tiên: **P0** cần cho core/đảm bảo chất lượng hoặc release; **P1** thuộc MVP đầy đủ nhưng triển khai sau core. P1 **không đồng nghĩa loại khỏi MVP**.
- Mỗi task chỉ thay đổi các khu vực cần thiết, giữ backward compatibility khi có API/schema đã dùng; phải nêu tệp được sửa, lệnh chạy và kết quả kiểm thử trong báo cáo hoàn tất.
- Không ghi thẳng API keys/password vào mã; không gửi key logs ngoài vùng practice; dữ liệu/chỉ số realtime client không quyết định điểm chính thức.

## 2. Definition of Done áp dụng cho mọi task

1. Dependencies DONE, các decision gates liên quan **APPROVED** hoặc task chỉ hoàn thiện được phần độc lập, ghi rõ BLOCKED phần còn lại.
2. Thay đổi đúng scope; link issue/task ID và các FR/API/schema liên quan; không thêm endpoint/field/tính năng ngoài phạm vi đã duyệt.
3. Chạy thành công lint, typecheck, test phù hợp, build của phần bị ảnh hưởng; migration/schema có DB constraint test; UI/API có smoke hoặc E2E khi có thể.
4. Acceptance Criteria và các edge case quan trọng được xác minh; có test evidence (lệnh/đầu ra hoặc ảnh demo), xử lý loading/error/empty khi task có UI.
5. Không còn lỗi blocker/P0/P1 do task gây ra; quyền RBAC/ownership được kiểm ở server; log không lộ secrets/PII.
6. Tài liệu và `.env.example` được cập nhật nếu contract/config thay đổi; không commit file `.env` thật. Với migration, có hướng forward/rollback hợp lý.
7. Reviewer (developer tự review khi làm một mình) đối chiếu với PRD và ghi giới hạn còn tồn tại; **không** tự đánh dấu DONE chỉ vì Codex báo thành công.

## 3. Task index

| ID | Task | Tuần | Ưu tiên | Size | Trạng thái |
|---|---|---:|---|:---:|---|
| [GOV-01](#gov-01) | Chốt quyết định chặn triển khai | 1 | P0 | M | DONE |
| [SET-01](#set-01) | Khởi tạo workspace và công cụ chất lượng | 1 | P0 | S | DONE |
| [SET-02](#set-02) | App shell và thiết kế điều hướng | 1 | P0 | M | DONE |
| [SET-03](#set-03) | API skeleton, config và health endpoint | 1 | P0 | S | DONE |
| [SET-04](#set-04) | CI cơ bản + Docker Compose local | 1 | P0 | M | IN_REVIEW |
| [DB-01](#db-01) | Prisma schema cho identity và curriculum | 1 | P0 | M | IN_REVIEW |
| [DB-02](#db-02) | Schema content version, attempt và progress | 1 | P0 | L | IN_REVIEW |
| [DB-03](#db-03) | Seed học liệu nhỏ có bản quyền hợp lệ | 1 | P0 | M | IN_REVIEW |
| [AUTH-01](#auth-01) | Đăng ký + email verification | 1 | P0 | L | IN_REVIEW |
| [AUTH-02](#auth-02) | Login, refresh rotation và logout | 1 | P0 | L | IN_REVIEW |
| [AUTH-03](#auth-03) | Guards, RBAC và ownership | 2 | P0 | M | IN_REVIEW |
| [AUTH-04](#auth-04) | Forgot/reset/change password | 2 | P0 | M | IN_REVIEW |
| [CORE-01](#core-01) | Catalog Course/Section/Lesson API | 1 | P0 | M | DONE |
| [CORE-02](#core-02) | Typing-core reducer và event normalization | 2 | P0 | L | DONE |
| [CORE-03](#core-03) | Start attempt + immutable snapshot | 2 | P0 | M | DONE |
| [CORE-04](#core-04) | Server replay, metrics, scoring | 2 | P0 | L | DONE |
| [CORE-05](#core-05) | Finish/abandon idempotent + progress | 2 | P0 | L | DONE |
| [CORE-06](#core-06) | Speed Test TIME/WORDS API và preset | 2 | P0 | L | DONE |
| [CORE-07](#core-07) | Dashboard, history và result reads | 2 | P0 | M | DONE |
| [FE-01](#fe-01) | Vertical slice Lesson hoàn chỉnh | 2 | P0 | L | DONE |
| [FE-02](#fe-02) | Speed Test UI + settings cơ bản | 3 | P0 | M | DONE |
| [FE-03](#fe-03) | Dashboard/history/profile UI | 3 | P0 | M | DONE |
| [COMM-01](#comm-01) | Schema và API Templates private | 3 | P1 | L | TODO |
| [COMM-02](#comm-02) | Template UI và submit review | 3 | P1 | M | TODO |
| [COMM-03](#comm-03) | Admin moderation workflow | 3 | P1 | L | TODO |
| [COMM-04](#comm-04) | Explore, report và template play counting | 3 | P1 | M | TODO |
| [COMM-05](#comm-05) | 4 leaderboard chính sách SQL riêng | 4 | P1 | L | TODO |
| [ADMIN-01](#admin-01) | Admin quản lý giáo trình và Speed config | 3 | P0 | L | TODO |
| [ADMIN-02](#admin-02) | Admin users, audit, site/theme/banner | 4 | P1 | L | TODO |
| [FE-04](#fe-04) | Explore, ranking và admin integration polish | 4 | P1 | M | TODO |
| [QA-01](#qa-01) | Unit + integration regression toàn bộ core | 4 | P0 | L | TODO |
| [QA-02](#qa-02) | Security & privacy hardening | 4 | P0 | M | TODO |
| [QA-03](#qa-03) | E2E full journeys và UX states | 4 | P0 | L | TODO |
| [QA-04](#qa-04) | Performance probe, bug bash và freeze | 4 | P0 | M | TODO |
| [DEP-01](#dep-01) | Triển khai staging và migration an toàn | 4 | P0 | L | TODO |
| [DEP-02](#dep-02) | Production release/portfolio demo | 4 | P0 | M | TODO |
| [DEP-03](#dep-03) | README, portfolio case study và bằng chứng | 4 | P0 | M | TODO |
| [DEP-04](#dep-04) | Release audit và backlog còn lại | 4 | P0 | S | TODO |

## 4. Chi tiết task (giao trực tiếp cho Codex)

### GOV-01 — Chốt quyết định chặn triển khai

- **Mục tiêu:** Có bộ quyết định đủ rõ cho code/acceptance.
- **Phạm vi thực hiện:** Lập decision log D-01…D-11 và A-01…A-05; chỉ đánh dấu APPROVED khi PO xác nhận; ghi owner/date/rationale/affected tasks. Không tự chốt số liệu.
- **Dependencies:** —.
- **Acceptance Criteria:** Decision log có status cho từng mục; các task gắn gate chưa duyệt không chuyển IN_PROGRESS; PRD/API/architecture được cập nhật nếu có quyết định mới.
- **Test/Verification:** Review trực tiếp với PRD §10 và Architecture §10; kiểm tra từng gate phụ thuộc.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** D-01…D-11; A-01…A-05.
- **Tham chiếu:** PRD §10; Architecture §10.
- **Trạng thái:** DONE. `docs/decision-log.md` có đủ 16 quyết định, owner/date/rationale/affected tasks; chỉ A-01 được ghi APPROVED từ phê duyệt kế hoạch nền tảng. Các gate còn PENDING giữ task liên quan ở TODO. Architecture §10 đã cập nhật A-01; không có quyết định sản phẩm mới để sửa PRD/API.

### SET-01 — Khởi tạo workspace và công cụ chất lượng

- **Mục tiêu:** Tạo repo chạy được từ lần clone đầu.
- **Phạm vi thực hiện:** Monorepo pnpm; apps/web, apps/api, packages/typing-core; TS strict, lint, format, env.example và scripts dev/test/build. Chưa code nghiệp vụ.
- **Dependencies:** GOV-01 (A-01).
- **Acceptance Criteria:** Cài dependencies sạch thành công; web/API khởi động; lint/typecheck/build chạy; không commit secret.
- **Test/Verification:** Fresh clone → install → dev/build/lint/typecheck.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · S · Tuần 1.
- **Decision gate cần PO xác nhận:** A-01.
- **Tham chiếu:** Architecture §2, §4–5.
- **Trạng thái:** DONE. Workspace pnpm, TS strict, lint/format, env example và dev/test/build scripts có đủ; `pnpm install --frozen-lockfile`, lint, typecheck, test, build qua ngày 15/11/2026. Web/API đã được HTTP smoke; `.env` bị gitignore. Fresh clone riêng chưa thực hiện vì repo chưa có commit.

### SET-02 — App shell và thiết kế điều hướng

- **Mục tiêu:** Có UI demo và điều hướng sớm.
- **Phạm vi thực hiện:** React Router, layout public/member/admin, trạng thái loading/error/empty, landing skeleton; routes không giả vờ tính năng EXT hoạt động.
- **Dependencies:** SET-01.
- **Acceptance Criteria:** Các tuyến public/member/admin render được; chưa auth thì protected route đưa tới login; demo không có link game/AI giả.
- **Test/Verification:** Manual nav + component tests cho route guards (UI không thay backend guards).
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-01; Architecture §5.
- **Trạng thái:** DONE. React Router 7, public/member/admin shells, landing, loading/error/empty và login placeholder đã có. Component tests render `/`, `/login`, `/dashboard`, `/lessons`, `/admin`; route guard tests xác nhận Guest tới login, Member bị chặn khỏi admin. Authentication thật thuộc AUTH-01/02.

### SET-03 — API skeleton, config và health endpoint

- **Mục tiêu:** API chạy và gọi được từ browser.
- **Phạm vi thực hiện:** NestJS bootstrap, version prefix /v1, DTO validation, request ID, global error envelope, GET health; cấu hình env fail-fast.
- **Dependencies:** SET-01.
- **Acceptance Criteria:** Health 200; request sai trả error envelope và requestId; thiếu env thiết yếu khởi động báo lỗi; không rò secret.
- **Test/Verification:** HTTP smoke /health, bad request, env negative test.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · S · Tuần 1.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** API §1; Architecture §7.
- **Trạng thái:** DONE. API test xác nhận health 200 với DB, 503 khi DB mất kết nối, 404 có error envelope/requestId, env thiếu/sai báo lỗi; không lộ DATABASE_URL trong response. Nest bootstrap có `/v1`, validation pipe và request ID.

### SET-04 — CI cơ bản + Docker Compose local

- **Mục tiêu:** Build/test lặp lại được trên máy mới.
- **Phạm vi thực hiện:** CI install, lint, typecheck, unit, build; Compose PostgreSQL local; scripts khởi tạo, README dev ngắn.
- **Dependencies:** SET-01, SET-03.
- **Acceptance Criteria:** Pull request/commit được kiểm tra tự động; local DB bật/tắt không làm mất secret trong repo.
- **Test/Verification:** CI green; fresh-machine setup smoke.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** Architecture §8–9.
- **Trạng thái:** IN_REVIEW. Workflow push/PR đã có install, Prisma generate, lint, typecheck, unit/API smoke, build, format; Compose PostgreSQL local đang healthy; README có hướng dẫn. Các lệnh tương ứng chạy thành công tại máy. Chưa thể xác nhận CI green vì repo chưa có Git remote/commit; giữ trạng thái này đến khi workflow chạy thực tế.

### DB-01 — Prisma schema cho identity và curriculum

- **Mục tiêu:** Có DB tối thiểu cho đăng nhập và danh sách bài.
- **Phạm vi thực hiện:** Prisma schema, migration identity (users, refresh_sessions, verification_tokens, user_settings), curriculum (courses, sections, lessons), khóa ngoại/unique/audit fields; constraint bổ sung SQL nếu Prisma không biểu diễn.
- **Dependencies:** SET-03, SET-04.
- **Acceptance Criteria:** Migrate từ DB rỗng; duplicate email/username bị chặn; section thuộc đúng course; migration chạy lại không hỏng.
- **Test/Verification:** Migration reset in test DB; constraint tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** Database §3.1–3.2, §4, §7.
- **Trạng thái:** IN_REVIEW. Prisma schema/migration và SQL CHECK đã tạo; migration áp dụng từ database Docker rỗng, chạy lần hai báo không còn pending; constraint tests email/username và section-course qua. SET-04 vẫn IN_REVIEW vì chưa có CI green, nên chưa đánh dấu DB-01 DONE. Không chạy migration trên Supabase.

### DB-02 — Schema content version, attempt và progress

- **Mục tiêu:** Lưu phiên luyện và kết quả có version, chống trùng.
- **Phạm vi thực hiện:** practice_targets, content_versions, practice_attempts, practice_results, lesson_progress, practice_key_stats, partial snapshots, finalization requests và FKs/CHECK/unique/index. Không triển khai thuật toán tại task này.
- **Dependencies:** DB-01; GOV-01 (D-01,D-05).
- **Acceptance Criteria:** Attempt pin đúng contentVersion; result tối đa một/attempt; owner target đúng một loại; migration clean.
- **Test/Verification:** FK/CHECK/unique tests, concurrent insert test.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 1.
- **Decision gate cần PO xác nhận:** D-01, D-05.
- **Tham chiếu:** Database §3.2–3.3, §4–6.
- **Trạng thái:** IN_REVIEW. Schema và migration DB-02 đã áp dụng trên PostgreSQL Docker local; test FK owner/version, CHECK và insert kết quả đồng thời qua. DB-01 còn IN_REVIEW do SET-04 chưa có CI green; chưa đánh dấu DONE.

### DB-03 — Seed học liệu nhỏ có bản quyền hợp lệ

- **Mục tiêu:** Có nội dung thật để chạy vertical slice.
- **Phạm vi thực hiện:** Seed Course/Section/Lesson Home/Top/Bottom rows và một số bài cơ bản theo số lượng đã duyệt; version hiện hành; nguồn/license và validator. Không tự tạo đủ 685 bài.
- **Dependencies:** DB-01, DB-02; GOV-01 (D-04).
- **Acceptance Criteria:** Seed idempotent; lesson published hiển thị; chọn bài cuối được dù chưa học bài đầu; nguồn học liệu được ghi nhận.
- **Test/Verification:** Seed twice + catalog API fixture tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** D-04.
- **Tham chiếu:** PRD FR-03; Database §3.2; v3 §8.3.
- **Trạng thái:** IN_REVIEW. Seed 6 bài gốc CC0-1.0, 2 bài mỗi Home/Top/Bottom với ngưỡng 20/90/16; seed hai lần không nhân bản và bài cuối published không có prerequisite. Catalog API fixture chưa thể chạy vì CORE-01 ngoài phạm vi, nên chưa xác minh hiển thị qua API.

### AUTH-01 — Đăng ký + email verification

- **Mục tiêu:** Guest tạo tài khoản và xác minh an toàn.
- **Phạm vi thực hiện:** Register DTO, hash password, verification token một lần, gửi mail qua adapter, resend giới hạn; UI register/verify liên kết API.
- **Dependencies:** DB-01, SET-03; GOV-01 (D-08,A-03).
- **Acceptance Criteria:** Email trùng báo lỗi; token sai/hết hạn không verify; chưa verify không thể Start; không lộ token/password trong log.
- **Test/Verification:** Integration register/verify/replay token + E2E happy path.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 1.
- **Decision gate cần PO xác nhận:** D-08, A-03.
- **Tham chiếu:** PRD FR-02; API §2.
- **Trạng thái:** IN_REVIEW. Register, Argon2id, verify token một lần, resend rate limit, SMTP adapter và UI đã có; integration test duplicate/replay/guard qua. Chưa kiểm thử gửi email thật và E2E trình duyệt; Start API thuộc CORE-03 chưa có.

### AUTH-02 — Login, refresh rotation và logout

- **Mục tiêu:** Phiên đăng nhập hoạt động ổn định.
- **Phạm vi thực hiện:** Login API; access JWT + refresh opaque HttpOnly cookie, rotation/revoke, logout; frontend session restore, lỗi hết hạn.
- **Dependencies:** AUTH-01; GOV-01 (D-08,A-03).
- **Acceptance Criteria:** Login sai không cấp token; refresh cũ không tái dùng; logout vô hiệu phiên; F5 đúng trạng thái đăng nhập.
- **Test/Verification:** Auth integration + browser cookie/security tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 1.
- **Decision gate cần PO xác nhận:** D-08, A-03.
- **Tham chiếu:** PRD FR-02; API §2; Architecture §7.
- **Trạng thái:** IN_REVIEW. Login JWT, refresh cookie rotation/reuse revoke, logout và session restore UI đã có; HTTP integration kiểm cookie và Origin, frontend test kiểm refresh sau reload/dedup. Chưa có browser F5/cookie security E2E trên deployment thật.

### AUTH-03 — Guards, RBAC và ownership

- **Mục tiêu:** Mọi luồng riêng tư được bảo vệ tại server.
- **Phạm vi thực hiện:** Auth guard cho Member ACTIVE/verified khi Start, Admin guard, owner authorization cho attempts/templates/history; status suspended xử lý.
- **Dependencies:** AUTH-02.
- **Acceptance Criteria:** Guest Start bị 401; unverified bị 403; member không đọc kết quả người khác; member không gọi admin; suspend chặn phiên mới.
- **Test/Verification:** API integration matrix 401/403/404/423 policy.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 2.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD §2, §6; API §1–2.
- **Trạng thái:** IN_REVIEW. Access/Start/Admin guard và owner policy helper đã có, test service cho unverified/suspended/owner; Start, result và admin API ngoài phạm vi chưa có nên chưa thể chạy ma trận HTTP 401/403/404/423 đầy đủ.

### AUTH-04 — Forgot/reset/change password

- **Mục tiêu:** Khôi phục và thay đổi thông tin đăng nhập.
- **Phạm vi thực hiện:** Forgot/reset bằng token một lần, re-auth đổi mật khẩu, thu hồi phiên theo chính sách duyệt; UI trạng thái invalid/expired.
- **Dependencies:** AUTH-02; GOV-01 (D-08).
- **Acceptance Criteria:** Reset token không dùng 2 lần; password cũ không đăng nhập sau reset; gửi mail thất bại có thông báo an toàn; không lộ tài khoản tồn tại nếu policy yêu cầu.
- **Test/Verification:** Integration + E2E reset, rate/expiry edge cases.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 2.
- **Decision gate cần PO xác nhận:** D-08.
- **Tham chiếu:** PRD FR-02, FR-09; API §2.
- **Trạng thái:** IN_REVIEW. Forgot/reset/change password, token một lần, revoke phiên và UI đã có; integration test reset/reuse/mail failure qua. Chưa có E2E email/trình duyệt và expiry edge case thực tế.

### CORE-01 — Catalog Course/Section/Lesson API

- **Mục tiêu:** Member duyệt giáo trình không khóa bài.
- **Phạm vi thực hiện:** GET courses/sections/lessons/detail; filter và cursor ổn định; chỉ nội dung published/active.
- **Dependencies:** DB-03, AUTH-02.
- **Acceptance Criteria:** Member đọc được Lesson bất kỳ đã publish; unpublish không bị lộ; invalid cursor/filter báo 400.
- **Test/Verification:** API integration 200/400/404; query sorting test.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 1.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-03; API §3.
- **Trạng thái:** DONE. GET courses/sections/lessons/detail có allowlist filter, cursor ổn định và chỉ trả Lesson PUBLISHED/ACTIVE thuộc Course PUBLISHED; HTTP integration trên PostgreSQL test kiểm 200/400/404, thứ tự Section và bài cuối chọn tự do.

### CORE-02 — Typing-core reducer và event normalization

- **Mục tiêu:** Có typing engine testable, không phụ thuộc UI.
- **Phạm vi thực hiện:** Reducer typed positions, cursor, first-try attempts, Backspace/Shift/Tab rules, timer/pause states, format event log; no DOM/React import.
- **Dependencies:** SET-01; GOV-01 (D-05).
- **Acceptance Criteria:** Gõ/backspace không xóa first-try history; Tab không chặn navigation ngoài vùng; timing monotonic theo policy; không bắt phím ngoài practice.
- **Test/Verification:** Unit/property tests, keyboard event fixtures, edge cases.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 2.
- **Decision gate cần PO xác nhận:** D-05.
- **Tham chiếu:** PRD FR-04; Architecture §4.1, §6.
- **Trạng thái:** DONE. `typing-core` thuần TS có reducer, first-try history, timer/pause, Tab/Shift focus policy, replay, metrics/scorer versioned và generator Speed; 7 unit/property tests qua, gồm 100 trace sửa lỗi sinh tự động.

### CORE-03 — Start attempt + immutable snapshot

- **Mục tiêu:** Mở phiên luyện chính thức từ bài được phép.
- **Phạm vi thực hiện:** POST attempts: auth/device/target/version/rules/expiry; create attempt; trả snapshot xác định.
- **Dependencies:** CORE-01, DB-02, AUTH-03.
- **Acceptance Criteria:** Guest/unverified/unsupported bị chặn; published lesson bất kỳ Start được; sửa lesson sau Start không thay snapshot phiên đang chạy.
- **Test/Verification:** Integration/API smoke + version pin tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 2.
- **Decision gate cần PO xác nhận:** D-05.
- **Tham chiếu:** PRD FR-04; API §4.
- **Trạng thái:** DONE. Start kiểm auth/verified/target/mode, từ chối device claim không hỗ trợ, pin content/config/scoring version và TTL 30 phút; HTTP integration kiểm Guest/unverified, published lesson cuối, INTRO, Speed và v1 vẫn Finish sau khi pointer chuyển v2.

### CORE-04 — Server replay, metrics, scoring

- **Mục tiêu:** Backend tạo kết quả chính thức từ proof.
- **Phạm vi thực hiện:** Replay event log qua typing-core, validate sequence/time/size, effectiveWpm/firstTryAccuracy, policy điểm/sao/passed có version, eligibility.
- **Dependencies:** CORE-02, CORE-03; GOV-01 (D-01,D-05).
- **Acceptance Criteria:** Client score bị bỏ qua; a←a lặp không farm; invalid event không ranked; divide-by-zero an toàn; result lịch sử không đổi theo version mới.
- **Test/Verification:** Unit golden cases + API invalid proof cases.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 2.
- **Decision gate cần PO xác nhận:** D-01, D-05.
- **Tham chiếu:** PRD FR-04; API §4; Database §3.3.
- **Trạng thái:** DONE. Server bỏ qua client score, giới hạn 10.000 events/256 KiB, kiểm sequence/time/state, replay snapshot đã pin và chấm `lesson-v1`; unit/property + HTTP invalid proof/version pin qua, zero-duration không chia 0 và không ranked.

### CORE-05 — Finish/abandon idempotent + progress

- **Mục tiêu:** Kết thúc phiên không tạo kết quả/điểm trùng.
- **Phạm vi thực hiện:** Finish/abandon with Idempotency-Key, row lock/transaction, best-per-lesson projection, partial snapshot, offline retry TTL theo policy.
- **Dependencies:** CORE-04, DB-02.
- **Acceptance Criteria:** Hai finish cùng key trả cùng result; hai finish khác key không tạo hai result; abandon không ranked; retry không nhân đôi progress.
- **Test/Verification:** Concurrent integration + network retry simulation.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 2.
- **Decision gate cần PO xác nhận:** D-05.
- **Tham chiếu:** PRD FR-04/06; API §4; Database §6.
- **Trạng thái:** DONE. Finish/abandon dùng row lock và transaction, idempotency key/hash, retry SQL serialization, lưu result/progress một lần, abandon không ranked; partial snapshot không được trả sau 30 ngày và được dọn vật lý mỗi giờ. HTTP integration kiểm retry cùng/khác key, hai Finish đồng thời 200/409, best lesson không giảm, expired 410 và partial cleanup.

### CORE-06 — Speed Test TIME/WORDS API và preset

- **Mục tiêu:** Speed Test là game duy nhất chạy trong MVP.
- **Phạm vi thực hiện:** Cấu hình versioned TIME/WORDS, punctuation/numbers, deterministic seed/word pool, start/finish; bảo vệ ranh giới mode.
- **Dependencies:** CORE-05; GOV-01 (D-02,D-04).
- **Acceptance Criteria:** TIME kết thúc theo thời gian, WORDS theo số từ; đổi config cần attempt mới; không cộng score Speed vào Lesson; Balloon/Space không chạy.
- **Test/Verification:** Integration deterministic generator + E2E 2 modes.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 2.
- **Decision gate cần PO xác nhận:** D-02,D-04.
- **Tham chiếu:** PRD FR-05; API §4.
- **Trạng thái:** DONE. D-02 duyệt ngày 16/11/2026: TIME 60/120, WORDS 25/50/100; seed local tạo 20 tổ hợp flags, snapshot pin pool/seed/config, generator deterministic và comparisonGroup đúng mode/preset/flags/pool. Unit generator và HTTP start→finish cả TIME/WORDS qua; Speed score/stars/passed NULL, không cập nhật Lesson. Browser E2E đã bổ sung trong FE-02.

### CORE-07 — Dashboard, history và result reads

- **Mục tiêu:** Hiển thị tiến độ từ dữ liệu chính thức.
- **Phạm vi thực hiện:** GET /me/history, /me/stats, result owner; chart aggregate; best lesson; weak-key summary nếu sẵn từ proof.
- **Dependencies:** CORE-05.
- **Acceptance Criteria:** History có completed/abandoned đúng trạng thái; score abandoned=0; người mới thấy empty state; không lộ dữ liệu user khác.
- **Test/Verification:** Query integration + snapshot tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 2.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-06; API §4.
- **Trạng thái:** DONE. GET history/stats/progress và owner attempt đọc result verified, chart theo ngày, best Lesson, weak-key khi đủ mẫu; HTTP integration kiểm completed/abandoned/expired, score abandoned=0, empty state, owner isolation và INTRO không kéo thấp WPM trung bình.

### FE-01 — Vertical slice Lesson hoàn chỉnh

- **Mục tiêu:** Có demo đầu-cuối: login → lesson → gõ → kết quả.
- **Phạm vi thực hiện:** Lessons list/detail, practice UI, keyboard hint, realtime provisional WPM/accuracy, result/retry; tích hợp API, loading/error/empty.
- **Dependencies:** SET-02, AUTH-02, CORE-03, CORE-05.
- **Acceptance Criteria:** Từ trình duyệt có thể hoàn tất một bài; result server là official; F5/mất kết nối xử lý theo policy; thiết bị không hỗ trợ có thông báo.
- **Test/Verification:** Playwright happy+failure path + desktop manual typing.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 2.
- **Decision gate cần PO xác nhận:** D-05.
- **Tham chiếu:** PRD FR-03/04; Architecture §5–6.
- **Trạng thái:** DONE. Browser có Lessons list/detail, Start, typing-core preview, keyboard hint, INTRO acknowledgement, Finish/result/retry và abandon. Attempt đang chạy khôi phục sau F5; Finish mất phản hồi giữ nguyên payload/key để retry trong TTL; kết quả chỉ đọc từ server. Playwright kiểm happy path, F5, mất phản hồi, thiết bị nhỏ; thêm một lượt Chromium với frontend, API và PostgreSQL test thật đã tạo result verified. CORE HTTP regression qua.

### FE-02 — Speed Test UI + settings cơ bản

- **Mục tiêu:** Member chạy được TIME/WORDS trên web.
- **Phạm vi thực hiện:** Chọn mode/preset, optional punctuation/numbers, timer, kết quả; UI Light/Dark/VI-EN, font/keyboard hints trong practice.
- **Dependencies:** FE-01, CORE-06.
- **Acceptance Criteria:** Chuyển mode áp config đúng; không cho đổi giữa attempt; không có nút Balloon/Space giả; setting không đổi text đang gõ khi đổi locale UI.
- **Test/Verification:** E2E both modes + UI setting tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 3.
- **Decision gate cần PO xác nhận:** D-02.
- **Tham chiếu:** PRD FR-01/05/09.
- **Trạng thái:** DONE. Chọn TIME/WORDS và preset/flags từ config PUBLISHED; practice dùng snapshot bất biến. Theme, VI/EN, font và gợi ý bàn phím áp dụng theo settings; đổi ngôn ngữ không đổi text attempt. Playwright kiểm cả hai mode, cờ punctuation, lưu appearance qua reload và text pin; không có lối chạy Balloon/Space.

### FE-03 — Dashboard/history/profile UI

- **Mục tiêu:** Member xem tiến độ và quản lý hồ sơ.
- **Phạm vi thực hiện:** Dashboard chart/recent, history pagination, result/retry, profile update, settings persistence; avatar tùy chọn theo quyết định.
- **Dependencies:** CORE-07, AUTH-04, SET-02.
- **Acceptance Criteria:** Fresh account empty state; dữ liệu hiển thị từ API; settings giữ sau login lại; lỗi mạng có retry.
- **Test/Verification:** E2E dashboard empty/with-data + settings persistence.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 3.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-06/09; API §4.
- **Trạng thái:** DONE. Dashboard/chart/recent, history cursor pagination, result/retry, profile và settings dùng API owner; thêm PATCH /me và GET/PATCH /me/settings theo contract với validation. Playwright kiểm empty state và retry lỗi mạng; HTTP integration xác nhận settings hợp lệ được giữ sau đăng nhập lại, input sai không ghi đè giá trị cũ.

### COMM-01 — Schema và API Templates private

- **Mục tiêu:** Member tạo và dùng nội dung riêng.
- **Phạm vi thực hiện:** Tables custom_templates, template review related version pointers; CRUD/clone TEXT, GAME_CONTENT content-only validation; practice owner; tạo migration additive.
- **Dependencies:** DB-02, AUTH-03; GOV-01 (D-04,A-05).
- **Acceptance Criteria:** Chỉ owner sửa/preview; script/game-rule field bị 422; sửa tạo draft version mới; dữ liệu version cũ giữ nguyên.
- **Test/Verification:** DB constraint + API owner/validation tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · L · Tuần 3.
- **Decision gate cần PO xác nhận:** D-04, A-05.
- **Tham chiếu:** PRD FR-07; Database §3.4; API §5.
- **Trạng thái:** TODO.

### COMM-02 — Template UI và submit review

- **Mục tiêu:** User tạo, sửa và gửi bản nội dung cụ thể.
- **Phạm vi thực hiện:** My Templates list/create/edit/clone, status, submit exact contentVersion; trạng thái Private/Pending/Rejected.
- **Dependencies:** COMM-01, SET-02.
- **Acceptance Criteria:** Không submit version đã thay mà không xác nhận; danh sách lọc/sort, empty states; không tự public ngay khi submit.
- **Test/Verification:** E2E create→edit→submit + invalid content.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · M · Tuần 3.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-07; API §5.
- **Trạng thái:** TODO.

### COMM-03 — Admin moderation workflow

- **Mục tiêu:** Admin duyệt đúng version và có audit.
- **Phạm vi thực hiện:** Review queue/detail, approve/reject/hide, atomic pointer update, conflict handling, audit trail; UI admin tối thiểu.
- **Dependencies:** COMM-01, AUTH-03; GOV-01 (D-07).
- **Acceptance Criteria:** Pending không public; admin duyệt v1 thì v2 draft không public; 2 admin duyệt đồng thời chỉ 1 quyết định thành công; reason logged.
- **Test/Verification:** Concurrent integration + E2E review flow.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · L · Tuần 3.
- **Decision gate cần PO xác nhận:** D-07.
- **Tham chiếu:** PRD FR-08/10; API §5.
- **Trạng thái:** TODO.

### COMM-04 — Explore, report và template play counting

- **Mục tiêu:** Member khám phá mẫu đã duyệt an toàn.
- **Phạm vi thực hiện:** Explore GET, detail/filter/sort/cursor, report API/UI; template_play_events counts on valid start/verified finish.
- **Dependencies:** COMM-03, CORE-05; GOV-01 (D-06).
- **Acceptance Criteria:** Private/pending hidden; GET view không tăng play; self-play không tăng contributor; Guest chỉ xem phạm vi đã duyệt.
- **Test/Verification:** API visibility and counter tests + E2E discovery.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · M · Tuần 3.
- **Decision gate cần PO xác nhận:** D-06.
- **Tham chiếu:** PRD FR-08; API §5.
- **Trạng thái:** TODO.

### COMM-05 — 4 leaderboard chính sách SQL riêng

- **Mục tiêu:** Xếp hạng minh bạch, không farm.
- **Phạm vi thực hiện:** Lessons best-per-lesson; Speed best comparable config; Contributors distinct verified completed users; Games empty; period/tie-break theo PO.
- **Dependencies:** COMM-04, CORE-06, CORE-07; GOV-01 (D-02,D-03).
- **Acceptance Criteria:** Không cộng nhiều lần cùng Lesson; không trộn SPEED với GAMES; scope time/config đúng; empty Games không giả dữ liệu.
- **Test/Verification:** SQL integration seeded ranking fixtures, anti-farm tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · L · Tuần 4.
- **Decision gate cần PO xác nhận:** D-02,D-03.
- **Tham chiếu:** PRD FR-08; API §6.
- **Trạng thái:** TODO.

### ADMIN-01 — Admin quản lý giáo trình và Speed config

- **Mục tiêu:** Admin cập nhật nội dung mà không sửa lịch sử.
- **Phạm vi thực hiện:** Admin CRUD course/section/lesson/speed config; draft/publish immutable version; minimal admin UI; audit actions.
- **Dependencies:** CORE-01, CORE-06, AUTH-03.
- **Acceptance Criteria:** Member không truy cập; publish invalid từ chối; attempt cũ vẫn cùng version và result; course ordinal đúng, không unlock.
- **Test/Verification:** Role tests, publish version regression, admin E2E.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 3.
- **Decision gate cần PO xác nhận:** D-01,D-02,D-04.
- **Tham chiếu:** PRD FR-10; API §7.
- **Trạng thái:** TODO.

### ADMIN-02 — Admin users, audit, site/theme/banner

- **Mục tiêu:** Đủ công cụ vận hành trong phạm vi MVP.
- **Phạm vi thực hiện:** Suspend/restore users + refresh revoke, audit browse, allowlisted site settings, theme/banner metadata; avatar/banner upload chỉ nếu bật; UI tối thiểu.
- **Dependencies:** ADMIN-01, AUTH-03; GOV-01 (D-08).
- **Acceptance Criteria:** Member bị suspend không Start; không mất admin cuối; nhật ký hành động nhạy cảm; URL/banner và theme tokens validate; không lộ secrets.
- **Test/Verification:** Admin E2E + permission/security tests.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · L · Tuần 4.
- **Decision gate cần PO xác nhận:** D-08.
- **Tham chiếu:** PRD FR-10; API §7.
- **Trạng thái:** TODO.

### FE-04 — Explore, ranking và admin integration polish

- **Mục tiêu:** Các màn hình MVP kết nối API thật.
- **Phạm vi thực hiện:** Leaderboard tabs, Games empty, review/report views, trạng thái loading/error/empty, navigation, responsive đọc trên mobile.
- **Dependencies:** COMM-04, COMM-05, ADMIN-02.
- **Acceptance Criteria:** Các màn không mock data thành công; Guest không Start; mobile không chấm bằng virtual keyboard; các route EXT không khả dụng.
- **Test/Verification:** Playwright user/admin smoke + mobile read-only manual.
- **Ưu tiên / Độ khó / Kế hoạch:** P1 · M · Tuần 4.
- **Decision gate cần PO xác nhận:** D-06.
- **Tham chiếu:** PRD FR-08/10; Architecture §5.
- **Trạng thái:** TODO.

### QA-01 — Unit + integration regression toàn bộ core

- **Mục tiêu:** Phát hiện regression vào chấm điểm, auth, versioning.
- **Phạm vi thực hiện:** Bao phủ typing reducer, scoring, auth, version pin, idempotency, owner/mode, validation; test fixtures chính thức theo PO.
- **Dependencies:** CORE-05, CORE-06, AUTH-04.
- **Acceptance Criteria:** Test case core trong PRD/Architecture pass; không có bài test bỏ qua không giải thích; CI xanh.
- **Test/Verification:** Vitest + DB integration + coverage report (không gán % tự ý).
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 4.
- **Decision gate cần PO xác nhận:** D-01,D-02,D-05.
- **Tham chiếu:** PRD §6/9; Architecture §8.
- **Trạng thái:** TODO.

### QA-02 — Security & privacy hardening

- **Mục tiêu:** Đảm bảo cơ sở an toàn trước public demo.
- **Phạm vi thực hiện:** Rate limit theo policy, CORS/CSRF theo topology, sanitization/XSS, env/secret scanning, PII log redaction, upload validation nếu bật.
- **Dependencies:** AUTH-03, COMM-03, ADMIN-02.
- **Acceptance Criteria:** Không truy cập cross-owner; CORS origin trái phép chặn; cookie flags đúng; log không chứa credentials/event proof ngoài phạm vi.
- **Test/Verification:** Security integration matrix, dependency audit, manual threat checklist.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 4.
- **Decision gate cần PO xác nhận:** D-05,D-08,A-02.
- **Tham chiếu:** PRD NFR §7; Architecture §7; API §10.
- **Trạng thái:** TODO.

### QA-03 — E2E full journeys và UX states

- **Mục tiêu:** Kiểm chứng luồng Guest/Member/Admin.
- **Phạm vi thực hiện:** E2E register→verify→lesson→result; speed; template→moderation→explore; auth errors/empty/network; accessibility keyboard focus.
- **Dependencies:** FE-04, QA-01.
- **Acceptance Criteria:** Các journey thành công; không có lỗi P0/P1 mở; focus Esc/Tab đúng; EXT không hiển thị như đã hoạt động.
- **Test/Verification:** Playwright CI suite + exploratory desktop check.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 4.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD FR-01…FR-10, §9.
- **Trạng thái:** TODO.

### QA-04 — Performance probe, bug bash và freeze

- **Mục tiêu:** Xác định thực tế hiệu năng, chốt release.
- **Phạm vi thực hiện:** Đo FPS khi gõ và API p95 trên profile/tải được duyệt; sửa lỗi ưu tiên; freeze scope; ghi known issues không che giấu.
- **Dependencies:** QA-03; GOV-01 (D-09).
- **Acceptance Criteria:** Có số đo và điều kiện test; không claim 60fps/p95 trước đo; blocker closed hoặc release NO-GO.
- **Test/Verification:** Lighthouse/manual performance capture + API load smoke + release checklist.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 4.
- **Decision gate cần PO xác nhận:** D-09.
- **Tham chiếu:** PRD NFR §7; Architecture §8–9.
- **Trạng thái:** TODO.

### DEP-01 — Triển khai staging và migration an toàn

- **Mục tiêu:** Staging truy cập được và có kiểm thử.
- **Phạm vi thực hiện:** Chọn hosting từ phê duyệt, config env, HTTPS, frontend/API/managed Postgres, migration step, mail provider; health and rollback plan.
- **Dependencies:** SET-04, DB-02, AUTH-02; GOV-01 (A-02).
- **Acceptance Criteria:** Staging health 200; register/verify/practice smoke; cookie đúng domain; migration không mất dữ liệu; không public secret.
- **Test/Verification:** Deploy smoke + migrate from clean staging DB + rollback drill.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · L · Tuần 4.
- **Decision gate cần PO xác nhận:** A-02,D-08.
- **Tham chiếu:** Architecture §9; API §1.
- **Trạng thái:** TODO.

### DEP-02 — Production release/portfolio demo

- **Mục tiêu:** Có URL demo đáng tin cậy.
- **Phạm vi thực hiện:** Deploy bản đạt Go/No-Go, seed sample hợp lệ, demo account phân quyền an toàn, monitor lỗi, kiểm tra branded routes.
- **Dependencies:** DEP-01, QA-04.
- **Acceptance Criteria:** Public URL HTTPS; trải nghiệm core chạy; không public admin credential; lỗi deployment có phương án rollback.
- **Test/Verification:** Postdeploy smoke Guest/Member/Admin, mobile read-only sanity.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 4.
- **Decision gate cần PO xác nhận:** D-11.
- **Tham chiếu:** PRD §9; Architecture §9.
- **Trạng thái:** TODO.

### DEP-03 — README, portfolio case study và bằng chứng

- **Mục tiêu:** Người tuyển dụng và Codex hiểu được dự án.
- **Phạm vi thực hiện:** README: vấn đề/giải pháp, stack, setup, env.example, scripts, demo, screenshots, kiến trúc, ERD/API links, test evidence, limitations, decisions.
- **Dependencies:** DEP-02, QA-03.
- **Acceptance Criteria:** Fresh clone theo README chạy được; không claim tính năng chưa làm; link demo/repo/docs chính xác; screenshot không chứa dữ liệu thật.
- **Test/Verification:** Peer-style README walkthrough + link check.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · M · Tuần 4.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD §9; Architecture §11.
- **Trạng thái:** TODO.

### DEP-04 — Release audit và backlog còn lại

- **Mục tiêu:** Kết thúc sprint minh bạch.
- **Phạm vi thực hiện:** Đối chiếu FR-01…10, các Should Have, quyết định và test; trạng thái DONE/BLOCKED/DEFERRED chỉ theo thực tế; ghi debt và release notes.
- **Dependencies:** QA-04, DEP-03.
- **Acceptance Criteria:** Có traceability với bằng chứng; thiếu Should Have => chưa tuyên bố đủ MVP v3; release scope thay đổi cần PO duyệt.
- **Test/Verification:** Review checklist + demo sign-off.
- **Ưu tiên / Độ khó / Kế hoạch:** P0 · S · Tuần 4.
- **Decision gate cần PO xác nhận:** —.
- **Tham chiếu:** PRD §8–11.
- **Trạng thái:** TODO.

## 5. Bộ hướng dẫn giao từng task cho Codex

Dùng mẫu sau; thay ID theo task, không ghép nhiều ID vào một lượt nếu chưa có lý do:

```text
Bạn là coding agent cho KeyCat. Hãy thực hiện DUY NHẤT task <TASK-ID> trong docs/tasks.md.
Trước khi sửa code: đọc docs/requirements.md, docs/architecture.md, docs/database.md,
docs/api-spec.md, docs/roadmap.md và mục task được chỉ định; liệt kê dependencies và decision gate.
Nếu gate chưa duyệt: không tự chọn default, chỉ làm phần độc lập hoặc báo BLOCKED.
Giữ đúng các quyết định đã chốt; không thêm feature, không tạo microservice/Redis/queue.
Triển khai từng thay đổi tối thiểu có test, chạy lint/typecheck/test/build liên quan.
Báo cáo: (1) file đã sửa, (2) AC đạt/chưa đạt, (3) lệnh test+kết quả,
(4) rủi ro/điểm còn chặn, (5) hướng kiểm thử thủ công.
Không tự chỉnh trạng thái task thành DONE nếu không có bằng chứng kiểm chứng.
```

## 6. Không có trong backlog MVP

- Không Guest Practice/Guest Speed Test, không lesson prerequisite/unlock hoặc placement test.
- Không AI, OAuth/MFA, Balloon Pop/Space Shooter playable, mobile/IME-scored typing, keyboard layouts ngoài US QWERTY.
- Không Redis/queue/microservices/Kubernetes, không build game engine plugin trong MVP.
- Không tự giảm 10 phân hệ hoặc cắt Should Have khỏi MVP v3.0; mọi release rút gọn cần quyết định D-10 của PO.
