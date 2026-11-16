# Đăng nhập và tài khoản TrustChain

## Menu tài khoản và shop

- Bấm avatar/tên trên thanh điều hướng để mở menu theo thứ tự: **Trang cá nhân → Chỉnh sửa trang cá nhân → Cài đặt → Hướng dẫn → Đăng xuất**. Có thể đóng bằng Escape hoặc bấm bên ngoài; dùng phím mũi tên để di chuyển.
- `/vi/profile`: mở thẳng hồ sơ của bạn tại `/vi/seller/<user-id>` với avatar, giới thiệu, mặt hàng đang bán và nút **Tạo bài viết / Đăng mặt hàng**. Trang này không có biểu mẫu chỉnh sửa. Bài viết hiện là bài đăng bán sản phẩm.
- `/vi/profile/edit`: biểu mẫu riêng để sửa avatar, tên hiển thị, giới thiệu, tỉnh/thành phố, website và địa chỉ chi tiết; không lặp lại danh sách sản phẩm.
- Avatar nhận ảnh JPG/PNG/WebP tối đa 2 MB và 16 triệu điểm ảnh. Chọn ảnh chỉ xem trước, bấm **Lưu thay đổi** mới lưu; **Xóa ảnh** cũng cần lưu để xác nhận. Máy chủ kiểm tra nội dung ảnh, cắt vuông 256×256, loại bỏ metadata và lưu WebP trong PostgreSQL. Không cần thư mục upload hoặc Docker volume riêng cho ảnh đại diện.
- Tỉnh/thành phố và website là thông tin công khai. **Địa chỉ chi tiết là riêng tư**, chỉ trả về cho chủ tài khoản qua `/api/me`; không xuất hiện trong API hồ sơ công khai.
- `/vi/settings`: chọn ngôn ngữ và truy cập luồng đặt lại mật khẩu; `/vi/help`: hướng dẫn sử dụng.
- Bấm tên người bán trên thẻ hoặc chi tiết sản phẩm để mở `/vi/seller/<user-id>`. Hồ sơ dùng ID tài khoản nên không yêu cầu có ví. Đã bỏ liên kết trùng lặp **Xem shop công khai**.
- Shop hiển thị tên, tên người dùng, giới thiệu, tháng tham gia và mặt hàng `LISTED`; không trả về email, số điện thoại hay thông tin đăng nhập. Bài nháp chỉ chủ tài khoản có thể xem qua API sản phẩm.
- Có thể thay `/vi` bằng `/en` để dùng giao diện tiếng Anh. Kiểm tra riêng tính năng này: `npm.cmd run test:ui --prefix apps/web -- account-menu.spec.ts`.
- Liên kết **Phân xử tranh chấp** ở chân trang dẫn đến `/vi/admin`. Tài khoản thường/khách thấy trang thông báo yêu cầu quyền quản trị viên, không bị chuyển về hồ sơ. Tài khoản `ADMIN` vẫn vào bảng quản trị. Bảng này hiện sử dụng dữ liệu minh họa; thay đổi này chỉ sửa điều hướng và kiểm soát quyền truy cập.

Nếu cập nhật một cơ sở dữ liệu có sẵn, chạy trong `apps/web` (dừng web trước khi generate trên Windows):

```powershell
npm.cmd run db:generate
node node_modules/prisma/build/index.js db execute --file prisma/profile-upgrade.sql --schema prisma/schema.prisma
```

Script chỉ thêm cột còn thiếu, giữ nguyên tài khoản và sản phẩm. Lệnh `dev:marketplace` cũng đồng bộ các cột này qua Prisma.

## Chạy thử trên máy

Mở Docker Desktop, dừng web cũ bằng Ctrl+C, rồi chạy từ thư mục gốc:

```powershell
npm.cmd install --prefix apps/web
npm.cmd run dev:marketplace
```

- Đăng ký: http://localhost:3000/register
- Đăng nhập: http://localhost:3000/login
- Hộp thư thử nghiệm Mailpit: http://localhost:8025
- Quên mật khẩu: http://localhost:3000/forgot-password

Mailpit giữ email trong máy, không gửi tới hộp thư thật. Đăng ký, mở email tại Mailpit và bấm liên kết đầy đủ. Trang tự gửi yêu cầu xác thực; đợi thông báo **Email đã được xác thực**, rồi bấm **Đăng nhập**. Không cần bấm thêm nút xác nhận. GET chỉ trả giao diện; cập nhật tài khoản được thực hiện qua POST có kiểm tra origin và token.

Nếu trước đây nút xác thực bị mờ: liên kết có thể đã mất phần `?token=...` khi chuyển trang/đổi ngôn ngữ. Trang hiện báo rõ khi thiếu mã và có nút **Gửi lại email xác thực**. Nhập đúng email đã đăng ký, mở thư mới nhất tại http://localhost:8025 và bấm liên kết mới; không cần đăng ký tài khoản khác. Liên kết cũ `/verify-email?token=...` vẫn được hỗ trợ, và chuyển ngôn ngữ giữ nguyên mã. Mở lại liên kết đã xác thực, còn hạn sẽ báo thành công mà không sửa lại trạng thái tài khoản.

Đăng ký cần email và mật khẩu dài 10–128 ký tự. Số điện thoại là định danh đăng nhập tùy chọn; số Việt Nam `0912345678` được chuẩn hóa thành `+84912345678`. Chưa có xác thực SMS hay đăng ký chỉ bằng số điện thoại. Xác thực và khôi phục đều qua email.

Mỗi tài khoản quản lý hồ sơ và sản phẩm riêng. Các sản phẩm demo cũ được giữ nguyên, không tự chuyển quyền sở hữu sang tài khoản mới. Email, số điện thoại và quyền tài khoản không thể sửa bằng API hồ sơ thông thường.

## Google và Facebook

Điền trong `apps/web/.env` (không commit secret):

```dotenv
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
FACEBOOK_CLIENT_ID="..."
FACEBOOK_CLIENT_SECRET="..."
```

Khởi động lại web sau khi thay đổi. Nhà cung cấp chỉ hoạt động khi có đủ ID và secret. Nút chưa cấu hình bị vô hiệu hóa, không tạo đăng nhập giả.

### Google

Tạo OAuth client loại **Web application** trong Google Cloud, cấu hình màn hình đồng ý và thêm tài khoản thử nghiệm nếu ứng dụng còn ở chế độ testing.

- JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Hướng dẫn nhà cung cấp: https://next-auth.js.org/providers/google

### Facebook

Tạo ứng dụng trong Meta for Developers và bật Facebook Login. Khai báo redirect URI:

`http://localhost:3000/api/auth/callback/facebook`

Dùng ứng dụng phát triển/test cho localhost và tài khoản có vai trò thử nghiệm phù hợp. Khi đưa lên internet, chuyển sang domain HTTPS, thay `NEXTAUTH_URL`, cấu hình lại redirect URI và đáp ứng yêu cầu của Meta cho ứng dụng đó. Facebook có thể không cung cấp email; tài khoản vẫn gắn với ID Facebook và đăng nhập qua Facebook.

Hướng dẫn nhà cung cấp: https://next-auth.js.org/providers/facebook

Email trùng giữa hai phương thức **không tự liên kết tài khoản**. Người dùng nhận hướng dẫn quay lại phương thức đã đăng ký. Hiện chưa có giao diện liên kết/hủy liên kết nhà cung cấp.

## Gửi email thật

Thay `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` bằng thông số SMTP của dịch vụ bạn chọn. Dùng địa chỉ người gửi/domain được dịch vụ cho phép. Mailpit chỉ dành cho phát triển.

`NEXTAUTH_SECRET` được script thiết lập local tạo ngẫu nhiên, giữ nguyên qua các lần chạy. Môi trường triển khai cần secret riêng và `NEXTAUTH_URL` đúng domain HTTPS.

## Cơ chế bảo vệ và phạm vi

- Mật khẩu băm bằng scrypt với salt ngẫu nhiên; không gửi hash ra API.
- Phiên đăng nhập dùng cookie do NextAuth quản lý. Đặt lại mật khẩu thu hồi các phiên cũ bằng phiên bản tài khoản lưu trong database.
- Token email lưu dưới dạng SHA-256. Xác thực có hạn 24 giờ; sau khi xử lý, bản ghi chuyển sang `verified` để mở lại liên kết còn hạn vẫn báo thành công, không cấp phiên đăng nhập hay sửa lại ngày xác thực. Token reset có hạn 30 phút và chỉ dùng một lần; không thể dùng token xác thực để đổi mật khẩu.
- API thay đổi trạng thái kiểm tra Origin; NextAuth bảo vệ CSRF cho đăng nhập/đăng xuất và OAuth.
- Giới hạn đăng nhập theo định danh và giới hạn tổng lưu trong PostgreSQL. Trả cùng thông báo khi yêu cầu khôi phục cho email có/không có tài khoản.
- Máy local dùng chung giới hạn tổng. Khi triển khai lớn, cần cấu hình giới hạn tại reverse proxy và tác vụ dọn bản ghi token/bộ đếm hết hạn.
- SMTP thực tế sử dụng `nodemailer-smtp` (alias của Nodemailer 10 đã vá); peer Nodemailer 7 của NextAuth chỉ phục vụ email provider không được bật trong app này. Các cảnh báo phụ thuộc Web3/peer còn lại cần được rà soát trước triển khai công khai.

Next.js đã chuyển từ 14 sang 15.5.27 để dùng các bản vá, cùng React 19. Các route động đã cập nhật theo API params mới.

## Schema và dữ liệu cũ

Schema web là `apps/web/prisma/schema.prisma`. Script khởi động dùng `db push` cho môi trường local. File `apps/web/prisma/auth-upgrade.sql` là nâng cấp một lần từ schema web trước tính năng tài khoản, không xóa bảng sản phẩm; không chạy lại khi đã nâng cấp. Nếu có email trùng trong dữ liệu cũ, xử lý trùng trước khi tạo unique index. Không dùng `--accept-data-loss` để bỏ qua vấn đề.

## Kiểm thử

Chạy web và hai container trước. Kiểm thử dùng tài khoản ngẫu nhiên và xóa riêng dữ liệu nó tạo:

```powershell
npm.cmd run test:auth --prefix apps/web
npm.cmd run typecheck --prefix apps/web
npm.cmd run test:ui --prefix apps/web
```

Để cài Chromium cho kiểm thử lần đầu tại thư mục gốc:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache\playwright'
node apps/web/node_modules/playwright/cli.js install chromium
```

Kiểm thử OAuth thật cần credentials và tài khoản Google/Facebook do bạn quản lý; bộ kiểm thử local không mô phỏng đăng nhập OAuth thành công.
