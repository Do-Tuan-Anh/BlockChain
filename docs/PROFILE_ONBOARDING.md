# Thiết lập hồ sơ khi ví mới đăng nhập

Cập nhật 15/11/2026. Phạm vi bổ sung cho wallet login; chưa triển khai F02–F07.

## Luồng sử dụng

- Ví chưa có User: ký MetaMask → tạo hồ sơ mặc định → `/{locale}/welcome`.
- Trang chào mừng hiển thị địa chỉ ví, avatar, tên và giới thiệu; hỗ trợ VI/EN, sáng/tối và mobile. Tái sử dụng AccountProfile; ảnh được kiểm tra, chuẩn hóa và loại metadata như luồng sửa hồ sơ hiện có.
- **Lưu và bắt đầu**: lưu tên/avatar/giới thiệu, đánh dấu đã thiết lập, đi tới trang người dùng định mở; mặc định về trang chủ.
- **Để sau**: giữ tên và avatar mặc định, đánh dấu đã xử lý, vào trang tiếp theo. Thông tin chưa lưu trên biểu mẫu bị bỏ qua.
- Nếu lưu hoặc bỏ qua thất bại, ở lại trang để thử lại; không tự coi là đã hoàn tất. Tải lại khi chưa hoàn tất vẫn có thể tiếp tục.
- Lần đăng nhập sau, kể cả browser khác hoặc xóa cookie, không hỏi lại. Có thể vào menu → Chỉnh sửa trang cá nhân để cập nhật đầy đủ ảnh bìa, địa chỉ và các trường khác.
- Tài khoản đã có trước migration được giữ nguyên, không ép thiết lập lại. Trang welcome yêu cầu đăng nhập; tài khoản đã hoàn tất được chuyển tiếp. `next` chỉ chấp nhận đường dẫn nội bộ, không quay vòng vào các trang đăng nhập/welcome.

## Lưu trạng thái và triển khai

`apps/web/prisma/schema.prisma` thêm `User.profileSetupAt` nullable. NULL nghĩa chưa xử lý; timestamp nghĩa đã lưu hoặc chọn Để sau. Trạng thái này chỉ có trong session/API riêng của chủ tài khoản, không phải quyền hay chứng nhận on-chain; không nhúng ảnh trong JWT.

Đã sao lưu PostgreSQL trước migration vào `.local/backups/wallet-onboarding-2026-11-15/database.dump` và kiểm tra danh mục dump. Không commit bản sao lưu. Migration `apps/web/prisma/onboarding-upgrade.sql` thêm cột với default tạm để đánh dấu các hàng cũ, sau đó bỏ default để User mới nhận NULL. Chạy lại không đổi các hồ sơ mới đang chờ thiết lập. Database mới chưa có bảng users sẽ được bỏ qua để bước tạo schema thông thường tiếp tục.

Trên máy có database cũ, sao lưu trước rồi chạy từ root, trước `db:push`:

```powershell
node scripts/upgrade-profile-onboarding.cjs
npm.cmd run db:generate --prefix apps/web
```

Trên Windows, dừng đúng web của project trước khi generate nếu DLL Prisma đang bị khóa, rồi khởi động lại. Launcher `start-marketplace.ps1` và `start-demo.ps1` đã thêm migration idempotent trước bước đồng bộ schema. Không reset database hoặc blockchain.

## API và file chính

- `lib/auth.ts`: trả `session.user.needsProfileSetup` từ trạng thái DB hiện tại.
- `components/WalletLogin.tsx`, `lib/login-destination.ts`: sau chữ ký đọc lại session, đối chiếu đúng địa chỉ trước khi chọn welcome/trang tiếp theo.
- `app/[locale]/welcome/page.tsx`: xác thực phiên và điều hướng an toàn ở server.
- `components/AccountProfile.tsx`: dùng chung editor; chế độ onboarding chỉ có avatar, tên, bio, địa chỉ ví và hai nút lựa chọn.
- `PUT /api/me`: thêm `completeOnboarding: true` tùy chọn; chỉ đánh dấu sau khi validate dữ liệu/ảnh thành công. Payload có userId/role hoặc trường ngoài schema bị từ chối.
- `POST /api/me/onboarding`: ghi nhận bỏ qua cho đúng User của phiên; origin check, rate limit, update có điều kiện NULL để gọi lại không đổi timestamp. Không tin userId từ client.

## Hồ sơ MONO Buyer 7099

Địa chỉ `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` vốn gắn với bản ghi `demo_seller`, tên hiển thị NULL. Vì vậy navbar lấy username ra hiện; đây không phải một ví mới bị mất tài khoản. Đã đổi riêng **name** thành **MONO Buyer 7099** theo yêu cầu, giữ ID, username, walletAddress, vai trò và dữ liệu cũ. Đã lưu bản ghi trước chỉnh trong backup local. API hồ sơ công khai đã trả tên mới; F5 web hoặc đăng nhập lại để cập nhật session/navbar.

Tên trong MetaMask là nhãn cục bộ, web không tự đọc được nhãn đó. Các ví khác vẫn dùng tên mặc định hoặc tên người dùng tự đặt, không tự đổi tên hàng loạt. Không gán hồ sơ người bán của ví khác sang ví này.

## Kiểm thử

Đã qua typecheck, production build, **6/6 kiểm thử UI trên desktop/mobile** và **2/2 kiểm thử đường dẫn chuyển tiếp**. Kết quả và giới hạn trong [WALLET_LOGIN_TEST_REPORT.md](WALLET_LOGIN_TEST_REPORT.md). Các bài mới ở `apps/web/tests/ui/profile-onboarding.spec.ts`, `apps/web/tests/login-destination.test.cjs`; bài đăng nhập/chuyển account hiện có đã cập nhật để xử lý welcome của ví mới.

Tại thời điểm kiểm thử onboarding, blockchain local chưa được khôi phục; onboarding được kiểm thử qua chữ ký, web và PostgreSQL. Sau đó node đã được khôi phục và mint/mua/giải ngân đã qua kiểm thử; xem [báo cáo riêng](CHAIN_RECOVERY_2026_11_15.md). Chưa kiểm chứng thao tác extension MetaMask thật trong lượt này.
