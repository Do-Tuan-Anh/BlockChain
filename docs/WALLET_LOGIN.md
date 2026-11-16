# Đăng nhập bằng MetaMask

Cập nhật 15/11/2026. Đây là luồng xác thực hiện tại của TrustChain, thay email/mật khẩu và Google/Facebook.

## Sử dụng

1. Mở MetaMask và chọn account Seller hoặc Buyer.
2. Trên web bấm **Đăng nhập bằng MetaMask**, cấp quyền xem địa chỉ và ký thông điệp **TrustChain sign-in**.
3. Chữ ký không tốn gas và không cấp quyền thanh toán. Account mới tự tạo hồ sơ; địa chỉ đã liên kết sẽ mở lại đúng User cũ, giữ nguyên sản phẩm, avatar, vai trò và lịch sử.
   Ví mới mở bước **Thiết lập trang cá nhân**: tên hiển thị, avatar, giới thiệu và địa chỉ ví để đối chiếu. **Lưu và bắt đầu** lưu thông tin; **Để sau** dùng tên/ảnh mặc định. Cả hai lựa chọn được lưu trong DB, lần đăng nhập tiếp theo không hỏi lại. Xem [hướng dẫn và kiểm thử onboarding](PROFILE_ONBOARDING.md).
4. Vào menu → Chỉnh sửa trang cá nhân để sửa tên, avatar, ảnh bìa, giới thiệu, tỉnh/thành phố, website và địa chỉ riêng tư. Tên account trong MetaMask và tên trên web độc lập.
5. Đổi account MetaMask: web kết thúc phiên cũ, mở lại màn đăng nhập và yêu cầu chữ ký mới. Hủy ký thì chưa đăng nhập. Khi ví khóa/không còn account được cấp quyền, web kết thúc phiên và chờ người dùng mở khóa, đăng nhập lại.

Đăng nhập không phụ thuộc node blockchain đang chạy; PostgreSQL và web phải hoạt động. Muốn mint/mua/giải ngân vẫn cần đúng mạng, deployment và ETH trả gas. Nút **Kết nối ví** ở khung blockchain dùng để xác nhận mạng cho giao dịch sau khi đăng nhập. Có thể dùng `npm.cmd run demo:up` để bật demo đang lưu; không reset/deploy lại.

Hai tab cùng browser profile dùng chung cookie phiên. Demo đồng thời hai vai nên dùng hai browser profile hoặc hai trình duyệt, mỗi nơi chọn account tương ứng. Đăng xuất TrustChain kết thúc phiên web và thử thu hồi quyền kết nối; không xóa account MetaMask.

## Dữ liệu cũ

Luồng wallet-login ban đầu không cần migration; bước thiết lập hồ sơ bổ sung cột nullable `User.profileSetupAt` bằng migration cộng thêm, không thay contract/ABI. Hồ sơ tồn tại trước migration được đánh dấu đã xử lý để không buộc người dùng cũ điền lại. User có walletAddress mở lại bằng chữ ký của ví đó; đối chiếu không phân biệt chữ hoa/thường. Hai User có cùng địa chỉ khác cách viết hoa sẽ bị từ chối để tránh nhận nhầm hồ sơ. User email cũ chưa từng liên kết ví vẫn được giữ trong database nhưng không tự ghép với ví mới. Nếu cần chuyển hồ sơ loại này, phải xác minh chủ sở hữu và làm công việc riêng; không nhận userId/email từ client để chuyển quyền.

Phiên email/OAuth cũ không còn quyền truy cập; cần đăng nhập lại bằng ví. Mỗi ví mới tạo User có vai trò BUYER mặc định; đăng nhập không tự cấp ADMIN. Không thay đổi quyền trọng tài trên contract. Mất quyền truy cập ví thì email không thể khôi phục tài khoản; bảo quản recovery phrase ngoài website.

## Bảo mật và API

Đăng xuất chủ động gọi `POST /api/auth/wallet-logout`, tăng sessionVersion để vô hiệu hóa các phiên của cùng User, rồi xóa cookie qua NextAuth. Nhờ đó request làm mới phiên đang chạy không thể khôi phục quyền của phiên cũ. Việc này cũng đăng xuất phiên cùng tài khoản trên trình duyệt khác.

- NextAuth credentials provider `wallet`; session JWT có authMethod, địa chỉ ví và sessionVersion. Backend kiểm tra User và địa chỉ lưu mỗi lần xác thực session.
- `POST /api/auth/wallet-challenge` nhận address; trả thông điệp chứa origin, địa chỉ, nonce ngẫu nhiên và thời hạn 5 phút. Cookie ngẫu nhiên HttpOnly/SameSite=Lax gắn challenge với browser; Secure khi NEXTAUTH_URL dùng HTTPS.
- `POST /api/auth/callback/wallet`: NextAuth kiểm tra CSRF, server kiểm tra origin và chữ ký personal_sign. Challenge lưu dạng hash trong VerificationToken, tiêu thụ nguyên tử cùng thao tác tìm/tạo User; không thể đăng nhập bằng chữ ký giả, hết hạn hoặc dùng lại challenge.
- Giới hạn tạo challenge 100/phút toàn hệ thống, 15/phút/địa chỉ; xác minh 20/phút/địa chỉ qua AuthRateLimit trong DB.
- NEXTAUTH_URL phải khớp origin người dùng truy cập; giữ NEXTAUTH_SECRET mạnh và ổn định. Không cần GOOGLE_CLIENT_ID/FACEBOOK_CLIENT_ID/SMTP cho đăng nhập. Không lưu private key hoặc recovery phrase.
- Đây là thông điệp riêng của TrustChain, chưa phải định dạng SIWE EIP-4361. Client theo dõi accountsChanged/focus/visibility để chuyển phiên; server không thể tự biết account nào đang được chọn trong extension. Mọi giao dịch vẫn kiểm tra địa chỉ ký và quyền contract.
- API email cũ register/forgot-password/reset-password/verify-email/resend-verification trả **410 WALLET_LOGIN_REQUIRED**. URL giao diện cũ vẫn mở màn đăng nhập MetaMask để tránh liên kết hỏng.

File chính: `lib/auth.ts`, `lib/wallet-login.ts`, `api/auth/wallet-challenge/route.ts`, `components/WalletLogin.tsx`, `WalletSessionGuard.tsx`, `AuthScreen.tsx`, `Providers.tsx`. Chỉnh hồ sơ tiếp tục dùng API `/api/me` hiện có và quyền theo session.

## Kiểm thử

### Khắc phục HTTP 431 sau đăng nhập (15/11/2026)

Avatar trong database là data URL, có thể dài hàng chục KB. NextAuth từng sao chép avatar vào claim `picture` của JWT, chia thành nhiều cookie và vượt giới hạn HTTP header. Bản sửa chỉ lưu `sub`, `sessionVersion`, `walletAddress`, `authMethod` trong JWT; tên, email và ảnh vẫn lấy từ PostgreSQL khi trả session. JWT cũ đi qua callback cũng được lọc lại.

Nếu browser đã mắc lỗi 431, request bị Node từ chối trước khi Next.js có thể xử lý. Chạy từ root:

```powershell
node scripts/repair-auth-cookies.cjs
```

Mở **http://localhost:3002/** trong đúng browser đang lỗi. Công cụ local sẽ hết hạn cookie session/callback NextAuth, chuyển về `/vi/login`, rồi bạn ký đăng nhập lại. Hồ sơ, avatar, bài đăng và khóa MetaMask không thay đổi. Công cụ chỉ lắng nghe loopback, tạm nhận header lớn để sửa cookie, tự đóng sau 10 phút. Không tăng giới hạn header của web chính để che lỗi. Nếu port 3002 đã bận, dừng đúng lần chạy repair trước đó rồi chạy lại.

Kiểm thử thêm: `node --test scripts/repair-auth-cookies.test.cjs` từ root và `npm.cmd run test:ui -- tests/ui/auth-cookie-repair.spec.ts` từ apps/web. Test sửa cookie dùng web đang chạy ở cổng 3000. Script chỉ sửa cookie HTTP localhost; cấu hình HTTPS khác cần xử lý riêng.

Chạy từ apps/web: `npm.cmd run typecheck`; `npm.cmd run test:ui -- tests/ui/wallet-login.spec.ts`. Test dùng ví ngẫu nhiên và chữ ký ethers thật, PostgreSQL/NextAuth/API thật; ranh giới extension được mô phỏng bằng adapter EIP-1193. Test dọn User/challenge của chính nó, không thay đổi tài khoản demo.

Các bài auth/UI cũ dùng email và video demo tự động cũ cần chuyển fixture sang wallet trước khi chạy; không còn là bằng chứng xác thực hiện tại. Không coi test adapter là kiểm chứng thao tác trên MetaMask extension thật. Báo cáo kết quả lượt chuyển đổi nằm trong [WALLET_LOGIN_TEST_REPORT.md](WALLET_LOGIN_TEST_REPORT.md).

Tài liệu email/OAuth cũ nằm tại [archive/AUTH_SETUP_EMAIL_LEGACY.md](archive/AUTH_SETUP_EMAIL_LEGACY.md), chỉ để tham khảo lịch sử.
