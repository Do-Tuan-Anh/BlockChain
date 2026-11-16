# Kiểm thử chuyển đăng nhập sang MetaMask

Ngày 15/11/2026. Đã triển khai luồng wallet-only; F02–F07 không thuộc lượt này.

**Cập nhật sau các kiểm thử bên dưới:** node hỏng đã được khôi phục đủ 90 giao dịch, giữ nguyên deployment. Mint/IPFS/mua/giải ngân trên desktop/mobile và restart đều đã kiểm tra thành công. Các ghi chú “node chưa khôi phục” bên dưới ghi lại giới hạn tại thời điểm kiểm thử trước đó; trạng thái mới xem [CHAIN_RECOVERY_2026_11_15.md](CHAIN_RECOVERY_2026_11_15.md).

## Thiết lập hồ sơ lần đầu và hồ sơ MONO (15/11/2026)

Đã thêm welcome cho ví mới với Lưu và bắt đầu/Để sau, lưu `User.profileSetupAt` trong DB, tái sử dụng trình sửa hồ sơ. Hồ sơ cũ được backfill an toàn, không buộc thiết lập lại. Đã sao lưu PostgreSQL trước migration; file SQL chạy lại không đánh dấu nhầm các User mới đang chờ.

Ví `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` đã có User username `demo_seller`, name NULL. Đã đổi riêng name thành **MONO Buyer 7099**, giữ ID/username/wallet/role/dữ liệu. API seller và DB đã đối chiếu trả tên mới. Không đọc nhãn MetaMask hoặc tự chuyển chủ sở hữu tài khoản.

Kết quả:

- Production build cô lập và typecheck: đạt.
- Playwright bản production tại localhost:3001: **6/6** trên desktop/Pixel 7, gồm 2 bài onboarding và 4 bài wallet-login. Đã kiểm tra lưu tên/bio/avatar thật; bỏ qua mặc định; tải lại/đăng nhập sau khi xóa cookie; tiếp tục đúng trang; chặn URL ngoài; gọi API trực tiếp không đăng nhập/origin sai/payload userId; giữ nguyên hồ sơ người khác; migration chạy lại; skip gọi lại; VI/EN và sáng/tối.
- Node tests `apps/web/tests/login-destination.test.cjs`: **2/2**, chặn URL ngoài, ký tự điều khiển bị browser loại bỏ và đường dẫn vòng vào auth, giữ đường dẫn nội bộ hợp lệ.
- Bài wallet-login dùng ví checksum hoa/thường để kiểm chứng tìm lại hồ sơ cũ như MONO; có avatar lớn hơn 16 KB và xác nhận cookie phiên vẫn nhỏ.
- Ảnh chụp desktop tối/EN và mobile sáng/VI đã kiểm tra, không tràn ngang.
- Trên dev, đã phát hiện mất trang đích khi đổi ví sát lúc update session; sửa guard vô hiệu hóa sessionVersion cũ trước signOut và giữ next qua login/welcome. Một lần chạy tiếp theo timeout do dev compile khi đang build song song; kiểm tra đầy đủ trên production sau sửa đều qua, không gọi đó là kiểm thử extension thật.

Web chính cổng 3000 được khởi động lại sau generate Prisma Client trên Windows và tiếp tục hoạt động. Không reset DB/blockchain. Tài khoản/challenge test được dọn theo địa chỉ ví test riêng. Chưa thử MetaMask extension thật hoặc mua bán vì node local vẫn có state hỏng từ trước. Xem file/API/migration và cách chạy lại ở [PROFILE_ONBOARDING.md](PROFILE_ONBOARDING.md).

## Bản sửa lỗi HTTP 431 sau khi đăng nhập (15/11/2026)

Nguyên nhân đã xác nhận: `authorize` trả ảnh avatar data URL trong `user.image`, NextAuth chép vào JWT cookie. Các hồ sơ demo đang có avatar khoảng 13–16 KB, đủ làm encrypted cookie vượt giới hạn header mặc định khi browser gửi lại. Lượt trước dùng hồ sơ test không có avatar nên không phát hiện trường hợp này.

Bản sửa `lib/auth.ts`: authorize chỉ trả id; callback jwt dựng lại danh sách claim nhỏ cho cả đăng nhập mới và lần đọc token cũ. Callback session tiếp tục đọc avatar/tên/email từ PostgreSQL. Không xóa ảnh hay sửa hồ sơ người dùng.

Kết quả kiểm tra trên web thật đang chạy tại localhost:3000:

- Production build cô lập và typecheck: đạt.
- Wallet login Playwright: **4/4**, fixture có ảnh WebP nhiễu 256×256 lớn hơn 16 KB; cookie phiên chỉ một cookie dưới 2 KB, ảnh vẫn xuất hiện trong session; giữ/chỉnh hồ sơ, chuyển account, hủy ký và đăng xuất đều đạt trên desktop/mobile.
- Cookie recovery Playwright: **2/2**, tạo 12 cookie chunk tổng khoảng 47 KB → xác nhận HTTP 431 → mở helper → trang đăng nhập trả 200, cookie không liên quan được giữ nguyên.
- Helper unit/HTTP test: **2/2**, lọc đúng cookie auth, tiếp nhận header lớn, redirect cố định, từ chối Host lạ và request subresource cross-site.
- Công cụ điều khiển browser thật bị dừng vì không xác định chắc chắn URL của tab. Chưa thể tự xử lý cookie trong profile Edge của người dùng; người dùng cần mở link recovery một lần. Test browser dùng profile riêng, không thay thế bước này.

File mới: `scripts/repair-auth-cookies.cjs`, `scripts/repair-auth-cookies.test.cjs`, `tests/ui/auth-cookie-repair.spec.ts`. Hướng dẫn nằm trong [WALLET_LOGIN.md](WALLET_LOGIN.md).

Lỗi MetaMask riêng đã được chẩn đoán: Anvil không khởi động vì `/data/state.json` bị cắt dang dở (EOF trong chuỗi JSON tại cột 726948). Đã dừng vòng restart, lưu nguyên bản vào `.local/backups/chain-corrupt-2026-11-15/state-original.json` kèm manifest; SHA-256 `80C186F10871A34E40B09D10027EF72C9450D3FD827C7ED51CB2953DB1E87811`. Volume chỉ thấy một file state; không tìm thấy backup state hợp lệ trong `.local`. Chưa thể phục hồi nguyên vẹn chain khi thiếu bản lưu; không reset, deploy lại hoặc gán dữ liệu DB thành đã on-chain.

## Kết quả

- TypeScript `npm.cmd run typecheck --prefix apps/web`: đạt.
- Next.js production build trên bản sao `.cache/persistent-demo-build/apps/web`: đạt, gồm API challenge/logout và các route đăng nhập hiện có.
- Playwright `tests/ui/wallet-login.spec.ts`: **4/4** trên desktop và Pixel 7; sau khi bổ sung kiểm tra hủy yêu cầu, chạy lại hai bài tương ứng: **2/2** đạt.
- Kiểm tra ảnh chụp login mobile, không tràn ngang. Giao diện đăng nhập có VI/EN; dùng design system và theme sẵn có.
- `git diff --check`: đạt.

Các kiểm tra dùng PostgreSQL, NextAuth và chữ ký ethers thật, adapter EIP-1193 ở ranh giới ví: đăng nhập bằng chữ ký đúng; từ chối ví ký sai, challenge hết hạn và replay; kiểm tra origin lạ; chỉ còn provider wallet; API email cũ trả 410; giữ ID/bio hồ sơ đã liên kết dù chưa xác thực email; sửa tên bằng API/UI có session; tự tạo hồ sơ ví mới; chuyển account và ký lại; tải lại trang giữ session; đăng xuất và chặn `/api/me`; trạng thái chưa cài MetaMask/hủy yêu cầu; URL register cũ và VI/EN.

Đã xử lý một lỗi phát hiện khi thử mobile: request session đang chạy có thể tạo lại cookie cũ sau signOut. Đăng xuất chủ động nay tăng sessionVersion trong DB trước khi xóa cookie, nên cookie cũ không còn quyền truy cập. Tất cả phiên của cùng User cũng bị vô hiệu hóa.

## Phạm vi và giới hạn

- Không thử trực tiếp MetaMask extension thật hoặc ký giao dịch thanh toán trong lượt này. UI test mô phỏng extension; không nhập/đọc khóa ví của người dùng.
- Docker Desktop/PostgreSQL/IPFS đã bật để kiểm thử. Docker node `chain` báo unhealthy; không reset/deploy hoặc sửa dữ liệu chain để vượt lỗi, chưa chạy lại luồng mint/mua/giải ngân. Đăng nhập chữ ký không phụ thuộc RPC nên đã kiểm chứng riêng thành công.
- Không thay schema/database structure, contract, ABI hoặc địa chỉ. Chỉ tạo/xóa User và challenge riêng của test trong kiểm thử.
- Script UI blockchain/video đã chuyển phần đăng nhập sang nút MetaMask và tạo fixture User có walletAddress; chưa xác nhận toàn bộ script do node unhealthy. Các bài email/password cũ khác vẫn là fixture lịch sử và cần chuyển trước khi chạy toàn bộ suite. Chưa tuyên bố toàn bộ repository test đều qua.
- ESLint chưa được cấu hình trong repository; chưa thêm dependency hay cấu hình lint mới. Build/typecheck đã kiểm tra các file thay đổi.
- Hồ sơ email cũ chưa liên kết ví được giữ nguyên, không tự chuyển quyền sang địa chỉ bất kỳ. Xem hướng dẫn xử lý tại [WALLET_LOGIN.md](WALLET_LOGIN.md).

Tài liệu đã cập nhật: README, AUTH_SETUP, WALLET_LOGIN, ARCHITECTURE, BLOCKCHAIN_SETUP, MARKETPLACE_LOCAL, DEMO_START, DEMO_GUIDE, FEATURE_ROADMAP và SUBMISSION_CHECKLIST. Bản hướng dẫn email cũ được giữ trong `docs/archive/AUTH_SETUP_EMAIL_LEGACY.md`.
