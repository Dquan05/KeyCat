# KeyCat — Product Requirements Document (PRD)

> **Sản phẩm:** KeyCat — Nền tảng luyện gõ phím trực tuyến  
> **Phiên bản PRD:** 1.0 (bản dự thảo để phê duyệt)  
> **Ngày:** 15/11/2026  
> **Trạng thái:** Draft / chưa phê duyệt triển khai  
> **Tài liệu nền:** `TYPEPAW_PHAN_TICH_THIET_KE_V3.md`, `TYPEPAW_PHAN_TICH_THIET_KE_V3.docx` và Project Brief đã thống nhất. **KeyCat** thay thế hoàn toàn tên làm việc TypePaw; không thay đổi nghiệp vụ bởi việc đổi tên.  
> **Phạm vi:** Yêu cầu sản phẩm và tiêu chí nghiệm thu; **không** thiết kế database, API chi tiết hay viết code.

## 1. Mục tiêu, phạm vi và quy ước

### 1.1. Tổng quan

KeyCat là website luyện gõ phím 10 ngón, gồm giáo trình có cấu trúc, giao diện luyện gõ trực quan, Speed Test, theo dõi hiệu suất, mẫu luyện tập cá nhân/cộng đồng và quản trị. Sản phẩm hướng đến người mới học gõ, học sinh/sinh viên, người làm việc trên máy tính và người muốn cải thiện tốc độ/độ chính xác.

**Giá trị cốt lõi:** giúp người dùng luyện tập có định hướng, nhận phản hồi tức thời, đánh giá tiến bộ có thể kiểm chứng và lựa chọn nội dung phù hợp nhu cầu.

### 1.2. Mục tiêu sản phẩm và kết quả MVP

- Người dùng đã xác minh tài khoản có thể hoàn thành một vòng khép kín: **chọn bài → luyện gõ → nhận kết quả chính thức → xem lại tiến độ/lịch sử**.
- Cung cấp Speed Test theo thời gian hoặc số từ, với kết quả và bảng xếp hạng theo điều kiện riêng.
- Người dùng tạo Template riêng; chỉ phiên bản được Admin chấp thuận mới xuất hiện công khai.
- Các quyền Member/Admin, phiên luyện, kết quả, nội dung xuất bản và bảng xếp hạng được kiểm soát nhất quán.
- Có thể nghiệm thu các luồng chính bằng tình huống kiểm thử, bao gồm lỗi/ngoại lệ, không chỉ bằng giao diện đẹp.

**Không tuyên bố:** đã có lượng người dùng, hiệu quả học tập được chứng minh hay hệ thống chống gian lận tuyệt đối; các yếu tố đó chưa được kiểm chứng.

### 1.3. Ranh giới quyết định đã chốt

1. **Bắt buộc đăng nhập và email đã xác minh** mới được bắt đầu bất kỳ phiên luyện/chấm điểm nào. Guest chỉ xem nội dung được phép, không có Guest Speed Test/guest claim.
2. **Không khóa bài học.** Người dùng chọn tự do bất kỳ Lesson đã xuất bản và đang hoạt động; thứ tự khóa/chương/bài chỉ mang ý nghĩa hướng dẫn.
3. **Game trong MVP chỉ là Speed Test** (TIME và WORDS). Balloon Pop, Space Shooter và game engine mới nằm ngoài MVP.
4. **Template có hai loại:** `TEXT` và `GAME_CONTENT`. Loại thứ hai chỉ thay nội dung đầu vào/tùy chọn cho phép, không cho sửa luật game, scoring hay mã nguồn.
5. **Public Template cần Admin duyệt đúng phiên bản**; chưa duyệt không được xuất hiện ở Explore.
6. Có bốn bảng xếp hạng logic **Lessons / Games / Speed Test / Contributors**, không trộn chỉ số. Games board có trạng thái chưa có dữ liệu/sắp ra mắt trong MVP.
7. **Không tích hợp AI trong MVP.** Chỉ xác định điểm mở rộng trên tài liệu.
8. **Desktop-first, bàn phím vật lý US QWERTY.** Mobile có thể xem nội dung, không có phiên luyện được chấm điểm bằng bàn phím ảo trong MVP.
9. Có giao diện **VI/EN**, Light/Dark. Ngôn ngữ giao diện độc lập với ngôn ngữ văn bản và layout bàn phím.
10. Thành tích chính thức được **server xác minh từ bằng chứng sự kiện luyện gõ**; số liệu realtime phía trình duyệt chỉ mang tính tạm thời.

### 1.4. Quy ước tài liệu

- **MVP:** thuộc phạm vi phiên bản đầu tiên đã chốt theo đặc tả v3.0.
- **EXT:** ngoài MVP; không được coi là chức năng đang hoạt động.
- **Must / Should / Could / Won't:** ưu tiên MoSCoW. **Must** và **Should** trong bảng phạm vi bên dưới đều thuộc *MVP đã chốt* trừ khi ghi `EXT`; **Should** biểu thị mức ưu tiên triển khai tương đối, không có nghĩa tự động hoãn sang sau MVP.
- **AC:** Acceptance Criteria, viết theo Given/When/Then; các thuật ngữ `attempt` (phiên luyện), `verified` (được kiểm tra hợp lệ), `version` (phiên bản nội dung) là thuật ngữ nghiệp vụ, không phải yêu cầu cấu trúc dữ liệu.
- **PENDING APPROVAL:** câu hỏi hoặc chính sách chưa khóa; không triển khai như quyết định mặc định khi chưa duyệt.

## 2. Vai trò người dùng và ma trận quyền

### 2.1. Vai trò

| Vai trò | Mô tả | Quyền nghiệp vụ |
|---|---|---|
| **Guest** | Chưa đăng nhập | Xem Landing, đăng ký/đăng nhập, xác minh/khôi phục tài khoản; có thể xem metadata nội dung public nếu cấu hình cho phép; **không Start Practice**. |
| **Member** | Đã đăng nhập, tài khoản ACTIVE và được xác minh khi luyện | Luyện Lesson/Speed Test/mẫu được phép; xem kết quả và lịch sử của chính mình; quản lý Template của mình; khám phá mẫu đã duyệt, xem ranking; cập nhật hồ sơ/cài đặt. |
| **Admin** | Nhân sự quản trị | Mọi quyền Member, thêm quản lý tài khoản, nội dung Course/Section/Lesson, cấu hình Speed Test, xét duyệt mẫu, theme/banner/cấu hình được phép và xem audit. |
| **Email Service** | Hệ thống ngoài | Gửi thư xác minh và khôi phục; **không** tự cấp quyền người dùng. |
| **Moderator [EXT]** | Vai trò tương lai | Chưa tách khỏi Admin trong MVP. |
| **AI Provider [EXT]** | Dịch vụ tương lai | Không tham gia luồng MVP. |

### 2.2. Ma trận quyền

| Hành động | Guest | Member | Admin |
|---|:---:|:---:|:---:|
| Xem Landing, đổi VI/EN | ✓ | ✓ | ✓ |
| Đăng ký, đăng nhập, khôi phục tài khoản | ✓ | Tùy tác vụ | Tùy tác vụ |
| Xem danh sách public ở mức đọc | Tùy cấu hình | ✓ | ✓ |
| Bắt đầu Lesson/Speed Test | ✗ | ✓* | ✓* |
| Xem lịch sử/kết quả của tài khoản khác | ✗ | ✗ | Chỉ theo quyền quản trị được phép |
| Tạo/sửa/luyện Template riêng | ✗ | ✓ (owner) | ✓ (owner/quyền quản trị phù hợp) |
| Gửi Template để duyệt | ✗ | ✓ (owner) | ✓ (owner) |
| Duyệt/từ chối/ẩn Template public | ✗ | ✗ | ✓ |
| Quản lý Course/Lesson/Speed config | ✗ | ✗ | ✓ |
| Khóa/mở tài khoản, quản lý cấu hình, xem audit | ✗ | ✗ | ✓ |

\* Điều kiện: account `ACTIVE`, email đã xác minh, thiết bị phù hợp, nội dung được phép sử dụng. Quyền Admin không loại bỏ các điều kiện xác minh phiên luyện.

**Nguyên tắc phân quyền:** luôn kiểm tra quyền ở server; việc ẩn nút trên giao diện không thay thế kiểm tra quyền. Owner chỉ quản lý tài nguyên thuộc mình; người dùng khác không được truy cập kết quả riêng tư.

## 3. Phân rã chức năng thành module nghiệp vụ

| ID | Module | Chức năng chính | Phạm vi |
|---|---|---|---|
| M01 | Landing & Localization | Trang giới thiệu, chuyển ngôn ngữ giao diện, Light/Dark | MVP |
| M02 | Identity & Access | Đăng ký, email verify, login/logout, refresh, quên/đổi mật khẩu, role/account status | MVP |
| M03 | Courses & Lessons | Xem khóa/chương/bài, lọc/phân trang, xem mục tiêu, chọn bài tự do | MVP |
| M04 | Practice & Results | Gõ realtime, bàn phím ảo/ngón tay, timer, điều khiển phiên, chấm chính thức, kết quả, retry | MVP |
| M05 | Speed Test | Chế độ TIME/WORDS, punctuation/numbers, lưu hiệu suất và xếp hạng riêng | MVP |
| M06 | Dashboard & Progress | Chỉ số tổng quan, biểu đồ/lịch sử, kết quả tốt nhất, phím yếu | MVP |
| M07 | My Templates | Tạo/sửa/clone, PRIVATE, TEXT/GAME_CONTENT, version, gửi duyệt | MVP |
| M08 | Explore & Leaderboards | Khám phá mẫu đã duyệt, lọc/sắp xếp, báo cáo, bốn board logic | MVP |
| M09 | Profile & Preferences | Hồ sơ, password, theme, font, cỡ chữ, ngôn ngữ, tùy chọn luyện | MVP |
| M10 | Administration | User, Course/Lesson, Speed config, moderation, theme/banner, audit, cấu hình cho phép | MVP |
| M11 | Advanced Games & AI | Balloon/Space, AI-generated typing content và hỗ trợ nâng cao | EXT |

## 4. User Stories

| ID | User Story | Module | Ưu tiên |
|---|---|---|---|
| US-01 | As a **Guest**, I want to view the landing page in Vietnamese or English, so that I can understand KeyCat before registering. | M01 | Must |
| US-02 | As a **Guest**, I want to register and verify my email, so that I can create a valid account for practice. | M02 | Must |
| US-03 | As a **Member**, I want to log in, refresh my session and log out securely, so that I can access and protect my account. | M02 | Must |
| US-04 | As a **Guest/Member**, I want to reset or change my password, so that I can recover or secure my account. | M02/M09 | Must |
| US-05 | As a **Member**, I want to browse courses, sections and lessons freely, so that I can choose what I need to practise. | M03 | Must |
| US-06 | As a **Member**, I want to see live character feedback, virtual keyboard hints and a timer, so that I can correct mistakes as I type. | M04 | Must |
| US-07 | As a **Member**, I want verified results showing WPM, accuracy and lesson achievement, so that I can trust my progress. | M04 | Must |
| US-08 | As a **Member**, I want to retry lessons without overwriting previous results, so that I can improve and compare attempts. | M04 | Must |
| US-09 | As a **Member**, I want timed and word-count speed tests, so that I can measure typing performance under different conditions. | M05 | Must |
| US-10 | As a **Member**, I want a dashboard and practice history, so that I can observe changes in my performance. | M06 | Must |
| US-11 | As a **Member**, I want to create and manage private TEXT or GAME_CONTENT templates, so that I can practise content relevant to me. | M07 | Should |
| US-12 | As a **Member**, I want to submit one version of my template for review, so that it can be shared with others safely. | M07 | Should |
| US-13 | As a **Member**, I want to discover approved templates and report inappropriate ones, so that I can find and use community content. | M08 | Should |
| US-14 | As a **Member**, I want to view separate rankings for lessons, speed tests, games and contributors, so that achievements remain comparable. | M08 | Should |
| US-15 | As a **Member**, I want to update my profile, language, appearance and typing preferences, so that the application suits my needs. | M09 | Should |
| US-16 | As an **Admin**, I want to create and publish course/lesson content, so that members have a managed curriculum. | M10 | Must |
| US-17 | As an **Admin**, I want to approve or reject the exact submitted template version, so that unreviewed content is never published. | M10 | Should |
| US-18 | As an **Admin**, I want to manage users and record sensitive changes, so that I can enforce platform policies and trace actions. | M10 | Should |
| US-19 | As an **Admin**, I want to configure supported speed tests and basic themes/banners, so that the published experience can be maintained. | M10 | Should |
| US-20 | As a **Member**, I want AI-assisted content generation and additional typing games, so that practice can become more varied. | M11 | Won't (MVP) |

## 5. Functional Requirements (FR) và Acceptance Criteria (AC)

> Mỗi nhóm FR là một **chức năng chính** có tiêu chí nghiệm thu độc lập. Các quy tắc toàn cục tại mục 6 cũng áp dụng cho mọi module.

### FR-01 — Landing, i18n, theme (M01)

**Yêu cầu**
- FR-01.1 Hiển thị giới thiệu sản phẩm, tính năng chính và lối vào Login/Register.
- FR-01.2 Cho chuyển ngôn ngữ giao diện Việt/Anh, không tự chuyển nội dung bài gõ theo ngôn ngữ giao diện.
- FR-01.3 Hỗ trợ Light/Dark; giao diện tập trung vào khu vực luyện gõ, không dùng màu làm tín hiệu đúng/sai duy nhất.

**AC**
- **Given** Guest mở Landing, **When** chọn VI/EN, **Then** văn bản giao diện chuyển ngôn ngữ và các biểu mẫu chưa gửi không bị mất dữ liệu.
- **Given** Member đang có bài luyện, **When** đổi ngôn ngữ giao diện, **Then** văn bản đang luyện và trạng thái phiên không bị thay thế bởi nội dung khác.
- **Given** người dùng chọn theme, **When** chuyển trang, **Then** theme được áp dụng nhất quán theo phạm vi lưu cấu hình.

### FR-02 — Authentication & Session (M02)

**Yêu cầu**
- FR-02.1 Đăng ký bằng email/password, từ chối email trùng hoặc không hợp lệ.
- FR-02.2 Xác minh email bằng liên kết/mã có hạn sử dụng; hỗ trợ gửi lại có giới hạn và quên/đặt lại mật khẩu.
- FR-02.3 Đăng nhập, đăng xuất, duy trì phiên và làm mới phiên an toàn; phân biệt tài khoản ACTIVE/SUSPENDED.
- FR-02.4 Không cho tạo phiên luyện khi Guest, email chưa xác minh hoặc tài khoản không ACTIVE.
- FR-02.5 Admin có quyền riêng; Member không được tự nâng quyền.

**AC**
- **Given** Guest đăng ký email hợp lệ chưa tồn tại, **When** hoàn tất biểu mẫu, **Then** hệ thống ghi nhận tài khoản và yêu cầu xác minh email.
- **Given** tài khoản chưa xác minh, **When** người dùng bắt đầu Lesson hoặc Speed Test, **Then** hệ thống chặn thao tác và giải thích cần xác minh.
- **Given** mật khẩu sai hoặc tài khoản bị khóa, **When** đăng nhập, **Then** không tạo phiên hợp lệ và hiển thị lỗi phù hợp, không lộ thông tin nhạy cảm.
- **Given** refresh session đã bị thu hồi, **When** cố dùng lại, **Then** hệ thống từ chối và yêu cầu xác thực lại.
- **Given** Member cố truy cập chức năng Admin, **When** gửi yêu cầu, **Then** bị từ chối dù UI có bị chỉnh sửa.

### FR-03 — Course, Section, Lesson (M03)

**Yêu cầu**
- FR-03.1 Hiển thị danh sách Course → Section → Lesson, hỗ trợ lọc, sắp xếp theo thứ tự nội dung và phân trang.
- FR-03.2 Hiển thị tên, loại bài, mục tiêu, trạng thái đã/chưa luyện và thành tích tốt nhất nếu có.
- FR-03.3 Mọi Lesson PUBLISHED/ACTIVE đều được chọn trực tiếp, **không** dùng khóa, bài tiên quyết hoặc bài kiểm tra mở khóa.
- FR-03.4 Hỗ trợ nội dung INTRO đơn giản, KEY_DRILL, REVIEW và PRACTICE trong MVP.

**AC**
- **Given** Member chưa học bài đầu tiên, **When** chọn bài cuối đã xuất bản, **Then** được xem chi tiết và Start bình thường.
- **Given** Lesson chưa xuất bản/đã ngừng hoạt động, **When** Member truy cập, **Then** không thể bắt đầu phiên mới và nhận thông báo nội dung không khả dụng.
- **Given** danh sách không có bài phù hợp bộ lọc, **When** lọc, **Then** xuất hiện empty state cùng cách bỏ/đổi bộ lọc.

### FR-04 — Practice Engine, Result & Retry (M04)

**Yêu cầu**
- FR-04.1 Chỉ khởi tạo phiên khi Member hợp lệ, nội dung có version cố định và thiết bị hỗ trợ luyện chấm điểm.
- FR-04.2 Trong khi gõ, hiển thị con trỏ, trạng thái đúng/sai, virtual keyboard US QWERTY, gợi ý ngón tay, thời gian, WPM và accuracy tạm tính.
- FR-04.3 Xử lý sự kiện nhập ký tự, Backspace, Shift/Caps Lock, Tab trong phạm vi nội dung/policy; hỗ trợ pause/resume khi chế độ cho phép, restart và thoát.
- FR-04.4 Kết thúc phiên, backend xác minh chuỗi sự kiện theo nội dung/quy tắc đã cố định; backend trả kết quả chính thức gồm Effective WPM, first-try accuracy và (với Lesson phù hợp) score/stars/passed.
- FR-04.5 Không thể cộng điểm bằng thao tác gõ-xóa lặp; lỗi ở lần thử đầu không tự mất chỉ vì người dùng Backspace.
- FR-04.6 Bảo đảm một phiên chỉ có một kết quả kết thúc hợp lệ; retry gửi kết quả khi mất phản hồi không được nhân đôi; Retry bài tạo phiên mới và không ghi đè lịch sử cũ.
- FR-04.7 Phiên bỏ dở/hết hạn có trạng thái phân biệt; không tự tính thành tích xếp hạng. Kết quả tạm và kết quả chính thức phải phân biệt trên giao diện.
- FR-04.8 INTRO đơn giản có điều kiện hoàn tất riêng, không mặc định yêu cầu WPM như bài gõ thông thường.

**AC**
- **Given** Member bắt đầu bài hợp lệ, **When** nhập ký tự, **Then** phản hồi trên màn hình cập nhật ngay mà không đợi kết nối mạng cho từng phím.
- **Given** Member gõ sai, xóa rồi gõ đúng, **When** kết thúc, **Then** first-try accuracy vẫn phản ánh lỗi ở lần đầu theo chính sách chấm.
- **Given** người dùng lặp `a → Backspace → a` nhiều lần, **When** chấm, **Then** ký tự được tính điểm không tăng theo số lần lặp một vị trí.
- **Given** cùng một yêu cầu kết thúc được gửi lại do mất mạng, **When** server đã xử lý lần đầu, **Then** trả lại kết quả tương ứng mà không tạo điểm hoặc kết quả thứ hai.
- **Given** nội dung bài đã được sửa/xuất bản phiên bản mới sau khi một phiên bắt đầu, **When** phiên cũ kết thúc, **Then** chấm theo phiên bản đã gắn với phiên cũ.
- **Given** người dùng rời phiên hoặc phiên hết hạn, **When** mở lịch sử, **Then** thấy trạng thái chưa hoàn tất/hết hạn tương ứng và không nhận điểm ranked.
- **Given** thiết bị không hỗ trợ bàn phím vật lý hợp lệ, **When** bấm Start, **Then** hệ thống ngăn phiên tính điểm và nêu lý do.

### FR-05 — Speed Test (M05)

**Yêu cầu**
- FR-05.1 Speed Test hỗ trợ TIME và WORDS; cho chọn cấu hình thời lượng/số từ trong danh sách hợp lệ, bật/tắt punctuation và numbers.
- FR-05.2 Nội dung và cấu hình của phiên được cố định tại Start, kết quả được xác minh chính thức.
- FR-05.3 Speed Test xếp hạng theo Effective WPM trên những phiên đủ điều kiện và cấu hình so sánh tương thích; không cộng Score vào Lesson.
- FR-05.4 Bất thường như sự kiện không hợp lệ, phiên hết hạn hoặc vi phạm chính sách focus/timing làm phiên không đủ điều kiện xếp hạng theo policy.

**AC**
- **Given** Member chọn TIME hoặc WORDS hợp lệ, **When** bắt đầu, **Then** nhận nội dung và điều kiện kết thúc phù hợp mode đó.
- **Given** Member đổi cài đặt giữa một phiên đang chạy, **When** yêu cầu áp dụng cấu hình mới, **Then** phiên hiện tại không bị âm thầm thay đổi; muốn dùng cấu hình mới phải bắt đầu phiên mới.
- **Given** một Speed Test đã hoàn tất nhưng không verified, **When** truy vấn ranking, **Then** kết quả đó không được tính.
- **Given** hai kết quả ở cấu hình không thể so sánh, **When** xem bảng Speed Test, **Then** không bị gộp tùy tiện.

### FR-06 — Dashboard, History & Progress (M06)

**Yêu cầu**
- FR-06.1 Dashboard hiển thị thời gian luyện, WPM/accuracy thống kê, số bài đã luyện/hoàn tất, biểu đồ theo thời gian và lịch sử gần đây.
- FR-06.2 Lịch sử phân biệt completed/abandoned/expired, cho mở kết quả hoặc luyện lại bài có sẵn.
- FR-06.3 Lesson Progress hiển thị thành tích tốt nhất theo từng bài; không tăng tổng điểm do lặp lại bài có thành tích thấp hơn.
- FR-06.4 Thể hiện thống kê phím sai/phím yếu khi có dữ liệu đủ; không suy diễn chỉ số khi chưa có dữ liệu.

**AC**
- **Given** Member chưa luyện lần nào, **When** mở Dashboard, **Then** thấy empty state và lối dẫn đến Lessons/Speed Test, không có chỉ số giả.
- **Given** Member hoàn tất bài hợp lệ, **When** mở lịch sử, **Then** thấy đúng phiên và các chỉ số chính thức.
- **Given** Member luyện lại một bài với điểm thấp hơn best score, **When** xem tổng điểm/best result, **Then** best score không tăng hoặc bị thay bởi điểm thấp hơn.
- **Given** Member khác yêu cầu dữ liệu riêng của người dùng hiện tại, **When** kiểm tra quyền, **Then** yêu cầu bị từ chối.

### FR-07 — My Templates (M07)

**Yêu cầu**
- FR-07.1 Member tạo, xem, chỉnh sửa, clone và lưu Template PRIVATE loại TEXT hoặc GAME_CONTENT; có giới hạn nội dung và quyền sở hữu.
- FR-07.2 GAME_CONTENT chỉ cho chỉnh nội dung đầu vào và trường cấu hình được cho phép, không cho nhập mã thực thi hoặc thay đổi rule/score/engine.
- FR-07.3 Mỗi lần cập nhật nội dung sau công bố tạo phiên bản mới, không thay đổi nội dung mà phiên luyện trước đó đã sử dụng.
- FR-07.4 Member gửi **một phiên bản xác định** để Admin xét duyệt. Trạng thái gồm PRIVATE/DRAFT, PENDING_REVIEW, APPROVED_PUBLISHED, REJECTED, HIDDEN/ARCHIVED khi phù hợp.
- FR-07.5 Thành viên có thể xem trước/luyện mẫu thuộc quyền của mình; chỉ mẫu public được duyệt mới có thể dùng công khai.

**AC**
- **Given** Member tạo TEXT hợp lệ, **When** lưu Private, **Then** Template chỉ hiện trong khu vực của chủ sở hữu và chưa xuất hiện ở Explore.
- **Given** Member gửi một version để duyệt, **When** chưa có quyết định Admin, **Then** version không xuất hiện công khai.
- **Given** Member chèn JavaScript/custom scoring vào GAME_CONTENT, **When** lưu, **Then** nội dung bị từ chối với lý do dữ liệu không hợp lệ.
- **Given** Template v1 đã public, **When** chủ sở hữu sửa thành v2, **Then** v2 chưa public trước khi được duyệt; lịch sử dùng v1 không bị sửa.
- **Given** người dùng không phải owner, **When** cố sửa mẫu PRIVATE, **Then** bị từ chối.

### FR-08 — Explore, Community & Leaderboards (M08)

**Yêu cầu**
- FR-08.1 Explore chỉ liệt kê mẫu APPROVED_PUBLISHED, hỗ trợ tìm/lọc theo loại, sắp xếp mới/cũ/phổ biến và phân trang.
- FR-08.2 Trang mẫu hiển thị tên/tác giả/loại và số liệu sử dụng hợp lệ; có chức năng báo cáo nội dung vi phạm.
- FR-08.3 Chỉ phiên luyện bắt đầu hợp lệ được tính lượt bắt đầu; hoàn tất được xác minh mới tính lượt hoàn tất; chỉ xem trang không được tăng usage count.
- FR-08.4 Hiển thị bốn nhóm leaderboard riêng: Lessons, Speed Test, Contributors và Games (Games chưa có game engine ở MVP phải hiển thị rỗng/sắp ra mắt).
- FR-08.5 Quy tắc thành tích: Lessons dùng thành tích tốt nhất của từng Lesson; Speed Test dùng best verified Effective WPM theo nhóm so sánh; Contributors dùng người chơi duy nhất đã hoàn tất mẫu public hợp lệ (không tính tác giả tự luyện); Games dùng metric riêng sau khi có game mở rộng.
- FR-08.6 Hỗ trợ khoảng thời gian xếp hạng theo chính sách công bố; không trộn tổng điểm toàn thời gian với bảng theo tuần/tháng.

**AC**
- **Given** một Template mới PENDING/REJECTED, **When** Member mở Explore, **Then** không nhìn thấy nội dung đó trong kết quả công khai.
- **Given** một người tải trang chi tiết Template nhiều lần, **When** thống kê lượt chơi, **Then** số STARTED/COMPLETED không tăng chỉ từ lượt xem.
- **Given** tác giả tự luyện mẫu của mình, **When** tính Contributors, **Then** hành động đó không tăng số người chơi duy nhất đóng góp.
- **Given** chưa có game mở rộng, **When** xem Games leaderboard, **Then** hiển thị chưa có dữ liệu/sắp ra mắt và không sao chép điểm Speed Test sang.
- **Given** một kết quả chưa được xác minh, **When** tổng hợp bất kỳ bảng xếp hạng nào, **Then** bỏ qua kết quả đó.

### FR-09 — Profile, Security & Settings (M09)

**Yêu cầu**
- FR-09.1 Member xem/cập nhật thông tin hồ sơ được phép, avatar nếu hỗ trợ tải lên, và đổi mật khẩu sau xác thực phù hợp.
- FR-09.2 Lưu tùy chọn VI/EN, theme, font/cỡ chữ luyện, hiển thị bàn phím/bàn tay và các cấu hình luyện được hỗ trợ.
- FR-09.3 Tùy chọn được giữ qua phiên đăng nhập; dữ liệu cá nhân không hiển thị trái phép.

**AC**
- **Given** Member chọn theme/font hợp lệ, **When** lưu và đăng nhập lại, **Then** cài đặt tương ứng được khôi phục.
- **Given** Member nhập cỡ chữ nằm ngoài giới hạn hợp lệ, **When** lưu, **Then** nhận thông báo validation và không áp dụng dữ liệu lỗi.
- **Given** Member đổi mật khẩu với chứng cứ xác thực không đúng, **When** gửi yêu cầu, **Then** từ chối mà không thay mật khẩu.

### FR-10 — Admin Content, Moderation & Operations (M10)

**Yêu cầu**
- FR-10.1 Admin quản lý Course/Section/Lesson, mục tiêu và loại bài; xuất bản tạo version nội dung không sửa ngược kết quả lịch sử.
- FR-10.2 Admin quản lý bộ nội dung/cấu hình Speed Test nằm trong tập được hỗ trợ.
- FR-10.3 Admin xem danh sách Template chờ duyệt, duyệt/từ chối **đúng version**, ghi lý do và có thể ẩn nội dung vi phạm.
- FR-10.4 Admin xem, khóa/mở khóa tài khoản theo quyền; tài khoản bị suspend không được tiếp tục tạo phiên luyện và phiên đăng nhập duy trì phải được xử lý phù hợp.
- FR-10.5 Admin quản lý theme/banner cơ bản và các giới hạn hệ thống trong danh sách cho phép; mọi hành động nhạy cảm có nhật ký audit.
- FR-10.6 Không cho nội dung do Member hoặc dữ liệu trên client tự ý cấp quyền Admin hay sửa audit.

**AC**
- **Given** Admin xuất bản Lesson v2, **When** xem lại kết quả từ v1, **Then** kết quả cũ không thay đổi và phiên mới dùng nội dung hiện hành.
- **Given** Template v1 đang chờ duyệt, **When** Admin approve v1 và chủ sở hữu đã tạo bản nháp v2, **Then** chỉ v1 được công khai; v2 phải có lần xét duyệt riêng.
- **Given** hai Admin cùng xử lý một yêu cầu duyệt, **When** quyết định xung đột, **Then** không được công bố hai quyết định mâu thuẫn; thao tác sau nhận thông báo xung đột.
- **Given** Admin suspend Member, **When** Member tiếp tục tạo attempt mới, **Then** bị từ chối và có audit về hành động suspend.
- **Given** Member cố gửi thay đổi theme/banner ở chức năng Admin, **When** server kiểm tra quyền, **Then** từ chối.

## 6. Quy tắc nghiệp vụ, validation và trạng thái

### 6.1. Business Rules toàn cục

| ID | Quy tắc |
|---|---|
| BR-01 | Chỉ Member/Admin có phiên hợp lệ, ACTIVE, email verified mới có quyền Start. |
| BR-02 | Không có lesson lock, prerequisite hay placement-unlock. |
| BR-03 | Một attempt gắn nội dung và chính sách chấm phiên bản cố định từ lúc Start. |
| BR-04 | Client feedback realtime là tạm tính; server quyết định kết quả chính thức sau kiểm chứng. |
| BR-05 | Chấm điểm không lấy số lần gõ-xóa một vị trí để cộng điểm vô hạn; first-try accuracy giữ dấu vết lần thử đầu. |
| BR-06 | Hoàn thành phiên và đạt điều kiện qua Lesson là hai khái niệm khác nhau; một phiên COMPLETED có thể không PASSED. |
| BR-07 | Chỉ kết quả verified và eligible mới được tính ranking; một phiên không được cộng nhiều lần. |
| BR-08 | Chỉ ContentVersion của Template được duyệt mới hiển thị public; draft mới không thay bản public trước khi được duyệt. |
| BR-09 | GAME_CONTENT không đổi thuật toán, luật chơi, score hoặc nội dung thực thi. |
| BR-10 | Leaderboard giữa các mode dùng metric riêng; Lessons tính best per Lesson, không tổng mọi attempt. |
| BR-11 | Mọi thay đổi quản trị nhạy cảm phải được truy vết; quyền luôn kiểm tra phía server. |
| BR-12 | Không thu thập phím gõ ngoài vùng luyện tập; mobile/IME không đủ điều kiện chấm theo MVP. |

### 6.2. Validation

| Ngữ cảnh | Kiểm tra bắt buộc | Khi không hợp lệ |
|---|---|---|
| Đăng ký/Login | Email hợp lệ, mật khẩu đúng chính sách xác thực, tài khoản/verification/status hợp lệ, rate limit | Báo lỗi đúng ngữ cảnh, không tạo session/attempt sai |
| Start Practice | Auth + verified + ACTIVE; nội dung Published/được phép; thiết bị hỗ trợ; mode phù hợp | Từ chối Start, nêu lý do và hành động tiếp theo |
| Nhập/gửi bằng chứng gõ | Thứ tự sự kiện, mốc thời gian, ký tự hợp lệ, số lượng/dung lượng, tình trạng phiên, policy nhập | Không tạo kết quả ranked; lỗi rõ ràng |
| Finish/Retry | Quyền sở hữu attempt, thời hạn, trạng thái terminal, phát hiện gửi trùng hoặc payload khác nhau | Kết quả nhất quán hoặc lỗi conflict/expired; không tạo kết quả thứ hai |
| Template | Owner, TEXT/GAME_CONTENT, độ dài/ký tự, trường cho phép, an toàn XSS, nguồn/quyền sử dụng nội dung | Báo validation, không public nội dung sai |
| Review Template | Admin, đúng version pending, không duyệt đồng thời mâu thuẫn | Từ chối hoặc báo conflict, lưu trạng thái nhất quán |
| Profile/Assets | Giá trị thuộc danh sách hợp lệ, ảnh đúng định dạng/kích cỡ theo cấu hình | Hiển thị lỗi trường, giữ giá trị trước đó |
| Explore/Ranking | Bộ lọc, sort, phạm vi thời gian, mode/config so sánh hợp lệ | Báo bộ lọc sai hoặc dùng empty state khi không có dữ liệu |

**Chưa khóa trong đặc tả:** min/max độ dài Template, ngưỡng mật khẩu, số lựa chọn Speed Test, giới hạn upload và thời hạn session. Không tự đưa số cụ thể vào PRD; xem mục 10.

### 6.3. Trạng thái nghiệp vụ

| Đối tượng | Trạng thái/luồng | Lưu ý |
|---|---|---|
| Tài khoản | Chưa xác minh → Verified/ACTIVE; ACTIVE ↔ SUSPENDED theo quyền; reset session tùy tình huống | Không có quyền luyện trước verified/ACTIVE |
| Lesson | DRAFT → PUBLISHED → ARCHIVED/INACTIVE | Member chỉ Start nội dung khả dụng, không unlock |
| Attempt | READY → RUNNING ↔ PAUSED (nếu hỗ trợ) → COMPLETED/FAILED/ABANDONED/EXPIRED | COMPLETED không đồng nghĩa PASSED |
| Result | Realtime provisional → server-verified official hoặc invalid/ineligible | Không xếp hạng kết quả chưa verified |
| Template | DRAFT_PRIVATE → PENDING_REVIEW → APPROVED_PUBLISHED hoặc REJECTED; có thể HIDDEN/ARCHIVED | Admin duyệt version cụ thể |
| Games board | Không có game engine ở MVP → No data/Coming soon | Không lấy điểm Speed để lấp board |

### 6.4. Trạng thái lỗi và empty states

| Tình huống | Hành vi giao diện/nghiệp vụ mong đợi |
|---|---|
| Mất mạng khi tải danh sách | Loading → error state có Retry; không hiển thị dữ liệu giả |
| Mất mạng khi Finish | Hiển thị trạng thái đang chờ xác nhận; cho thử gửi lại cùng phiên/chứng cứ khi còn hợp lệ; không tự công bố điểm chính thức |
| Email chưa verified | Thông báo điều kiện chưa đáp ứng; hướng dẫn xác minh/gửi lại theo giới hạn |
| Session hết hạn/đã thu hồi | Yêu cầu đăng nhập lại; không cho tiếp tục hành động được bảo vệ |
| Không có Lesson theo bộ lọc | Empty state và tùy chọn bỏ bộ lọc |
| Dashboard chưa có lịch sử | Trạng thái bắt đầu luyện lần đầu; không hiển thị WPM/Accuracy giả |
| Explore chưa có mẫu được duyệt | Empty state, không hiển thị Pending/Private |
| Ranking chưa có kết quả hợp lệ | Empty state riêng của board; Games báo sắp ra mắt/chưa có dữ liệu |
| Attempt hết hạn/bị từ chối xác minh | Hiển thị lý do và trạng thái không có điểm ranked; cho bắt đầu phiên mới khi hợp lệ |
| Template rejected | Hiển thị trạng thái và lý do cho owner; không public |
| Bị từ chối quyền | Không lộ nội dung riêng tư; hiển thị thông báo truy cập không được phép |
| Thiết bị/mobile không hỗ trợ | Vẫn cho xem nội dung phù hợp; giải thích vì sao không thể Start phiên chấm điểm |

### 6.5. Edge cases bắt buộc kiểm thử

- Đang gõ mà đổi VI/EN hoặc Light/Dark: không đổi văn bản/phiên hiện tại.
- Backspace một vị trí nhiều lần, ký tự sai đã sửa, phím Shift/Caps Lock/Tab và rời focus vùng gõ: không tạo số liệu sai.
- Hai tab cùng gửi Finish của một attempt: chỉ tồn tại một terminal result; trả xung đột/kết quả đã có phù hợp.
- Server nhận event log sai thứ tự, timestamp đảo chiều, ký tự không hợp lệ hoặc quá dung lượng: không ranked.
- Start phiên từ nội dung phiên bản v1; Admin xuất bản v2 trước Finish: vẫn chấm v1.
- Member bị suspend khi đang đăng nhập: Start mới bị chặn; phiên đăng nhập/refresh được thu hồi theo policy.
- Admin approve Template v1 trong khi tác giả đang sửa v2: chỉ v1 public.
- User bấm xem Template nhiều lần: không tăng completed/start count.
- User tự luyện Template của mình: không tăng contributor unique players.
- Một Lesson được làm lại với điểm thấp hơn: best score không tăng; lịch sử vẫn giữ cả hai phiên.
- Speed Test khác mode/config, hoặc attempt không eligible: không ghép thứ hạng không tương thích.
- Guest mở link Start của một mẫu public: yêu cầu đăng nhập, không tạo attempt.

## 7. Non-functional Requirements (NFR)

| ID | Nhóm | Yêu cầu / tiêu chí kiểm chứng | Trạng thái |
|---|---|---|---|
| NFR-SEC-01 | Security | Mật khẩu không lưu plaintext; có cơ chế hash phù hợp; session làm mới/thu hồi; kiểm tra auth, role và owner trên server. | Must / MVP |
| NFR-SEC-02 | Security | Rate limiting cho auth, gửi email và hành động dễ bị lạm dụng; chống XSS/injection ở Template/banner và kiểm tra file upload. | Must / MVP |
| NFR-SEC-03 | Security | Sử dụng HTTPS khi triển khai; xử lý cookie/CSRF/CORS theo kiến trúc domain thực tế; không lộ token/password trong log. | Must / MVP |
| NFR-SEC-04 | Privacy | Chỉ xử lý bằng chứng phím trong vùng practice, có chính sách thời hạn lưu và quyền truy cập; không triển khai keylogging toàn trang. | Must / MVP |
| NFR-PERF-01 | Performance | Gõ và phản hồi ký tự hoạt động cục bộ, không phụ thuộc round-trip mạng cho mỗi phím. | Must / MVP |
| NFR-PERF-02 | Performance | **Mục tiêu thiết kế đề xuất từ v3.0:** trải nghiệm tương tác hướng đến 60 FPS trên desktop phổ thông; API đọc phổ biến p95 dưới 500 ms ở tải demo được định nghĩa và đo kiểm. Không được coi là cam kết khi chưa benchmark. | Should / MVP, kiểm chứng trước nghiệm thu |
| NFR-REL-01 | Reliability | Finish, update progress, publish và moderation không có trạng thái nửa chừng; retry không tạo kết quả trùng. | Must / MVP |
| NFR-REL-02 | Reliability | Có phương án backup/restore và xử lý lỗi mạng; mục tiêu backup hằng ngày/kiểm tra restore là **đề xuất vận hành từ v3.0**. | Should / MVP |
| NFR-USE-01 | Usability | Giao diện nhất quán, vùng gõ nổi bật, phản hồi dễ nhận biết, loading/error/empty states rõ ràng; VI/EN và Light/Dark. | Must / MVP |
| NFR-USE-02 | Accessibility | Điều hướng focus và Escape khi Tab bị bắt trong practice; tương phản chữ/focus hướng đến WCAG AA; không phụ thuộc màu duy nhất để phân biệt đúng/sai. | Should / MVP |
| NFR-USE-03 | Device | Desktop-first, hỗ trợ bàn phím vật lý US QWERTY; mobile chỉ xem, không chấm điểm từ virtual keyboard. | Must / MVP |
| NFR-MAIN-01 | Maintainability | Chia module theo nghiệp vụ; phần tính toán gõ/score có quy tắc phiên bản rõ và có thể kiểm thử độc lập với UI. | Must / MVP |
| NFR-MAIN-02 | Maintainability | Có tài liệu yêu cầu, quy tắc tính điểm, hợp đồng giao tiếp và kiểm thử cho các luồng quan trọng trước triển khai. | Should / MVP |
| NFR-OBS-01 | Observability | Ghi nhận lỗi, request ID và audit thay đổi nhạy cảm; không lưu secrets hay toàn bộ bằng chứng gõ trong log ứng dụng thông thường. | Should / MVP |
| NFR-LIC-01 | Licensing | Nội dung học, trích dẫn, word pool, ảnh/banner từ bên thứ ba phải có nguồn và quyền sử dụng phù hợp trước khi xuất bản. | Must / MVP |

**Lưu ý về khả kiểm thử:** NFR-PERF-02 cần xác định máy/tải đo và có benchmark mới kết luận đạt/không đạt; không khẳng định sẵn rằng sản phẩm đã đạt các chỉ tiêu này.

## 8. Phân loại MoSCoW và MVP

| Phân hệ / hạng mục | MoSCoW | Thuộc MVP? | Ghi chú |
|---|---|---|---|
| Login/register/verify/reset/session/role | **Must Have** | Có | Điều kiện trước Start |
| Course/Section/Lesson chọn tự do | **Must Have** | Có | Không unlock |
| Typing Engine realtime, verified scoring, Result | **Must Have** | Có | Luồng sản phẩm cốt lõi |
| Speed Test TIME/WORDS | **Must Have** | Có | Game duy nhất có thể chơi ở MVP |
| Dashboard/history/progress căn bản | **Must Have** | Có | Đo tiến bộ |
| Admin xuất bản nội dung và kiểm soát quyền | **Must Have** | Có | Nền tảng vận hành |
| VI/EN, Light/Dark, keyboard hint | **Must Have** | Có | Trải nghiệm cơ bản đã chốt |
| Templates TEXT/GAME_CONTENT và gửi duyệt | **Should Have** | Có | Có trong MVP v3.0, triển khai sau core |
| Admin moderation/Explore/report | **Should Have** | Có | Có trong MVP v3.0 |
| Four-board leaderboard | **Should Have** | Có | Games board empty/coming soon |
| Profile/settings/avatar tùy chọn | **Should Have** | Có | Avatar tải lên nếu bật |
| Admin theme/banner/site settings/audit chi tiết | **Should Have** | Có | Audit hành động nhạy cảm là bắt buộc |
| UI mascot mèo minh họa ở trạng thái phụ | **Could Have** | Có thể trong MVP | Chỉ yếu tố thương hiệu; không che vùng gõ |
| OAuth Google/Apple, MFA | **Won't Have (MVP)** | Không | EXT |
| AI sinh bài, AI CMS, khuyến nghị AI | **Won't Have (MVP)** | Không | EXT |
| Balloon Pop, Space Shooter, game engine/plugin mới | **Won't Have (MVP)** | Không | EXT |
| Telex/VNI, IME tiếng Việt được chấm, layout khác US QWERTY | **Won't Have (MVP)** | Không | EXT |
| Placement test, khóa bài, unlock prerequisite | **Won't Have** | Không | Bị loại bởi quyết định sản phẩm v3.0, không tự đưa lại |
| Guest practice/Guest Speed Test/guest claim | **Won't Have** | Không | Bị loại bởi quyết định sản phẩm v3.0 |
| Redis leaderboard/cache, recommendation, tournaments | **Won't Have (MVP)** | Không | Chỉ cân nhắc khi có nhu cầu mở rộng |
| Streak, heatmap tiến độ nâng cao, xuất dữ liệu nâng cao | **Won't Have (MVP)** | Không | EXT |
| Moderator tách vai trò, đa locale, game upload | **Won't Have (MVP)** | Không | EXT |

**Quy tắc chống trôi phạm vi:** Có thể chia lần lượt các đợt triển khai trong MVP, nhưng không tự cắt bỏ Should Have đã được v3.0 xác nhận. Nếu muốn phát hành một *MVP rút gọn* trước, phải có quyết định sản phẩm mới.

## 9. Điều kiện nghiệm thu tổng thể (Definition of Done mức sản phẩm)

Một module được coi là đạt nghiệm thu khi:

1. Các FR và AC liên quan được thực hiện/kiểm thử thành công, gồm cả lỗi, empty states và edge cases trọng yếu.
2. Đúng vai trò/quyền và đúng quy tắc bảo vệ thông tin cá nhân; không có lối đi tắt bằng thao tác client.
3. Các màn hình không hiển thị tính năng EXT như đã hoạt động.
4. Đối với Scoring/Leaderboard: kết quả chính thức có xác minh, không nhân đôi thành tích do retry/replay.
5. Không làm sai kết quả lịch sử khi nội dung/cấu hình được thay đổi.
6. Có ghi nhận những NFR đã đo/kiểm tra được, và đánh dấu rõ những mục tiêu chưa có bằng chứng benchmark.
7. Tài liệu hướng dẫn sử dụng và phạm vi bản phát hành khớp với sản phẩm thực tế.

## 10. Điểm cần Product Owner phê duyệt trước khi triển khai

> Bảng dưới là danh sách vấn đề gốc. D-01, D-02, D-04, D-05 và phần Auth của D-08 đã được duyệt ngày 16/11/2026; giá trị chính thức nằm trong [`decision-log.md`](./decision-log.md). Các mục còn lại vẫn mở.

| ID | Vấn đề chưa khóa | Lựa chọn/hướng đề xuất để duyệt | Tác động |
|---|---|---|---|
| D-01 | **Công thức Score, ngưỡng sao, điều kiện Passed** | Bản v3.0 đề xuất score theo Effective WPM và first-try accuracy, sao tối đa 5; cần khóa chính sách/version chính thức trước khi code. | Chấm điểm và ranking |
| D-02 | **Speed Test presets và tiêu chí so sánh [APPROVED 16/11/2026]** | TIME 60/120 giây; WORDS 25/50/100 từ. Ranked khi hoàn tất preset và không mất focus; chỉ so cùng mode, preset, punctuation/numbers và word pool version. | UI và Speed leaderboard |
| D-03 | **Khoảng xếp hạng** | Chốt weekly/monthly/all-time, ranh giới timezone và các quy tắc tie-break chính thức. | Rank công bằng |
| D-04 | **Giới hạn content và nguồn học liệu** | Chốt min/max ký tự Template, tập ký tự hợp lệ, nguồn/giấy phép word pool, số lượng Lesson seed ban đầu. | Validation và phát hành |
| D-05 | **Chính sách phiên luyện và bằng chứng** | Chốt thời hạn attempt/retry offline, giới hạn kích thước event log, retention, quy tắc thời gian/tạm dừng/focus. | Scoring, privacy, reliability |
| D-06 | **Quyền Guest xem công khai** | Chọn Guest xem metadata Explore/leaderboard ở mức nào; dù chọn gì Guest vẫn không được Start. | UX và phân quyền |
| D-07 | **Template public khi có bản sửa mới** | Xác nhận giữ v1 đang public cho đến khi v2 duyệt, hay gỡ ngay theo thao tác owner; bản v3.0 cho phép policy này. | Moderation |
| D-08 | **Account/asset/form limits** | Chốt password policy, thời hạn verify/reset/session, quota gửi mail/template, giới hạn kích cỡ/định dạng avatar/banner. | Security và validation |
| D-09 | **Kỳ vọng hiệu năng/thiết bị** | Xác định profile máy desktop và tải demo để đo mục tiêu 60 FPS và API p95 < 500 ms (đề xuất trong v3.0). | NFR acceptance |
| D-10 | **Phạm vi release đầu tiên** | Xác nhận giữ đủ 10 module của MVP v3.0 hay phê duyệt một bản release rút gọn trong cùng dự án. | Ưu tiên và kế hoạch |
| D-11 | **Tên sản phẩm KeyCat** | Xác nhận tên hiển thị chính thức và kiểm tra thương hiệu/domain trước khi công bố. | Brand/launch |

## 11. Traceability và quản trị thay đổi

- **M01–M10** tương ứng 10 phân hệ MVP trong tài liệu thiết kế v3.0; **M11** là nhóm EXT.
- **US-01–US-19** liên kết với **FR-01–FR-10** và AC cùng module; **US-20** chỉ định hướng sau MVP.
- Mọi đề xuất mới cần ghi: mục tiêu/người dùng, lý do, tác động MVP, MoSCoW, AC dự kiến, trạng thái **Proposed → Approved/Rejected**, và không tự cập nhật thành Must Have.
- Chỉ áp dụng các quyết định đã APPROVED trong `decision-log.md`; các quyết định còn mở không được biến thành mặc định kỹ thuật.

## 12. Ngoài phạm vi tài liệu hiện tại

Tài liệu này **không** bao gồm thiết kế database/ERD, schema migration, định nghĩa endpoint, DTO, class diagram, code, wireframe chi tiết, lựa chọn hosting cuối cùng hay lịch triển khai cố định. Các nội dung đó chỉ được thực hiện ở giai đoạn thiết kế/triển khai kế tiếp sau khi PRD và các quyết định còn mở được duyệt.

---

**Tóm tắt chốt phạm vi:** KeyCat có 10 phân hệ thuộc MVP v3.0; Core Typing + verified score là trọng tâm; Guest không luyện; bài học không khóa; Speed Test là game duy nhất của MVP; Template công khai phải duyệt theo version; leaderboard tách 4 loại; AI và advanced games không có trong MVP.
