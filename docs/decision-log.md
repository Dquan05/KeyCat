# KeyCat decision log

Ngày lập: 15/11/2026. Trạng thái `APPROVED` chỉ áp dụng khi người yêu cầu đã xác nhận rõ; `PENDING` không phải một giá trị mặc định kỹ thuật. Các quyết định D-xx lấy từ [PRD §10](./requirements.md), A-xx từ [Architecture §10](./architecture.md).

| ID | Status | Owner | Date | Rationale / evidence | Affected tasks |
|---|---|---|---|---|---|
| A-01 | APPROVED | Người yêu cầu | 15/11/2026 | Đã duyệt kế hoạch nền tảng React/Vite, NestJS, Prisma/PostgreSQL và pnpm trong hội thoại; stack đã được triển khai. | SET-01, SET-03, DB-01 |
| A-02 | PENDING | PO | — | Đã chọn Supabase managed PostgreSQL; hosting, domain, mail và reverse proxy production chưa chốt. | DEP-01, QA-02 |
| A-03 | APPROVED | Người yêu cầu | 16/11/2026 | Argon2id; access JWT 15 phút trong bộ nhớ; refresh opaque cookie HttpOnly/SameSite=Lax/Secure khi HTTPS, xoay mỗi lần dùng; SMTP adapter. Không bật Google OAuth. | AUTH-01, AUTH-02, AUTH-03, AUTH-04 |
| A-04 | PENDING | PO | — | Chưa duyệt SQL-first leaderboard và storage tùy chọn. | COMM-05, DEP-01 |
| A-05 | PENDING | PO | — | Chưa duyệt phạm vi GAME_CONTENT trong MVP. | COMM-01 |
| D-01 | APPROVED | Người yêu cầu | 16/11/2026 | Score Lesson = round(100 × min(WPM/goalWpm,1.5) × firstTryAccuracy/100), tối đa 150; 5 sao theo hoàn thành, accuracy 90/95%, WPM 80/100% goal; passed theo minAccuracy và minPassWpm; scoringVersion lesson-v1. | DB-02, CORE-04, QA-01 |
| D-02 | APPROVED | Người yêu cầu | 16/11/2026 | TIME 60/120 giây; WORDS 25/50/100 từ. Chỉ ranked khi hoàn tất preset và không mất focus. Chỉ so cùng mode, preset, punctuation/numbers và word pool version. | CORE-06, COMM-05 |
| D-03 | PENDING | PO | — | Chưa chốt khoảng xếp hạng, timezone và tie-break. | COMM-05 |
| D-04 | APPROVED | Người yêu cầu | 16/11/2026 | Seed 6 bài KeyCat tự tạo, 2 mỗi Home/Top/Bottom, 20–240 ký tự/bài, license CC0-1.0; mỗi bài mẫu goalWpm 20, minAccuracy 90%, minPassWpm 16; Template TEXT 20–5000 ký tự in được trên US-QWERTY. | DB-03, COMM-01 |
| D-05 | APPROVED | Người yêu cầu | 16/11/2026 | Attempt TTL 30 phút; retry cùng payload/key trước expiresAt; event log tối đa 10.000 events hoặc 256 KiB; không lưu raw proof sau replay; partial snapshot tối đa 30 ngày; mất focus không đủ điều kiện rank. | DB-02, CORE-03, CORE-05 |
| D-06 | PENDING | PO | — | Chưa chốt quyền Guest xem metadata công khai. | COMM-04, FE-04 |
| D-07 | PENDING | PO | — | Chưa chốt xử lý bản public cũ khi có draft mới. | COMM-03 |
| D-08 | APPROVED (AUTH scope) | Người yêu cầu | 16/11/2026 | Password 15–128 ký tự; verify 24h, reset 30 phút, access 15 phút, refresh tối đa 7 ngày/idle 24h; login 10 lần/15 phút, resend/forgot 3 lần/giờ theo email+IP. Giới hạn upload/template chưa duyệt, không áp dụng cho task Auth. | AUTH-01, AUTH-02, AUTH-04; ADMIN-02 còn pending |
| D-09 | PENDING | PO | — | Chưa chốt profile thiết bị và tải benchmark. | QA-04 |
| D-10 | PENDING | PO | — | Chưa chốt phạm vi release đầu tiên. | DEP-02 |
| D-11 | PENDING | PO | — | Tên KeyCat đang dùng trong repo; brand/domain/legal availability chưa được xác nhận. | DEP-02 |

## Gate enforcement

- Task có gate `PENDING` không được chuyển `IN_PROGRESS` hoặc `DONE` chỉ nhờ decision log này.
- SET-01 được phép hoàn tất theo A-01. SET-02/03/04 không có decision gate bổ sung.
- DB-02 có D-01 và D-05; DB-03 có D-04 đã duyệt ngày 16/11/2026. Các task Auth có A-03 và phần D-08 liên quan Auth đã duyệt; giới hạn asset/template vẫn chờ quyết định riêng trước ADMIN-02/COMM-01.
- Khi có quyết định mới, ghi ngày, rationale, affected tasks, rồi cập nhật PRD/API/architecture nếu contract thay đổi.
