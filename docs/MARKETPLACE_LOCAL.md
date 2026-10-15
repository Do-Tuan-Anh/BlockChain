# Chạy chợ sản phẩm với Docker Desktop

Docker chạy PostgreSQL, hộp thư thử nghiệm Mailpit và IPFS; Next.js chạy trên máy tại http://localhost:3000. Luồng ví/NFT/Escrow cần thêm Hardhat node, deploy và indexer: xem [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md).

1. Mở Docker Desktop và chờ engine hoạt động.
2. Nếu đã có `npm run dev` đang chạy, dừng bằng Ctrl+C để Prisma không bị khóa file trên Windows.
3. Từ thư mục gốc dự án, chạy:

```powershell
npm.cmd run dev:marketplace
```

Lệnh tự tìm Docker CLI (kể cả bản cài theo tài khoản Windows), khởi động PostgreSQL, tạo `.env` từ mẫu nếu chưa có, sinh Prisma Client và tạo bảng trước khi chạy web. File `.env` có sẵn được giữ nguyên.

Nếu muốn chạy từng bước:

```powershell
docker compose up -d --wait postgres mailpit ipfs
npm.cmd ci --prefix apps/web
node scripts/setup-auth-env.cjs
npm.cmd run db:generate --prefix apps/web
npm.cmd run db:push --prefix apps/web -- --skip-generate
npm.cmd run dev --prefix apps/web
```

`apps/web/.env` cần trỏ tới PostgreSQL local theo `apps/web/.env.example`. Chỉ dùng schema `apps/web/prisma/schema.prisma` cho giao diện này; schema ở thư mục gốc dành cho backend khác và có cấu trúc bảng khác.

## Thêm và xem mặt hàng

- Mở `/create-listing`, nhập tên, mô tả, danh mục, tình trạng, giá dương; chọn ảnh JPG/PNG/WebP để upload lên IPFS. Tin thông thường vẫn có thể dùng URL ảnh.
- Sau khi lưu thành công, trang hiển thị tên, mô tả, giá và liên kết **Xem thông tin sản phẩm**.
- Nếu chọn đăng bán blockchain: tiếp tục ghim IPFS, mint và đăng bán qua ví. Bản nháp chỉ xuất hiện công khai sau khi event listing đã đồng bộ. Nếu bỏ chọn, tin thông thường xuất hiện ngay sau lưu.
- Trang `/product/<id>` lấy đúng thông tin từ cơ sở dữ liệu.
- Nếu lưu thất bại, form hiển thị lỗi và giữ dữ liệu để thử lại.

Dữ liệu lưu trong Docker volume `postgres_data` và còn sau khi khởi động lại container. Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

Ảnh và metadata IPFS nằm trong volume `ipfs_data`. Xem [IPFS_STORAGE.md](IPFS_STORAGE.md) để kiểm tra pin và sao lưu/khôi phục CAR; sao lưu PostgreSQL riêng vì CAR không chứa tài khoản/catalog.

Đăng ký và xác thực email trước khi đăng sản phẩm. Mỗi tài khoản có hồ sơ và sản phẩm riêng. Email thử nghiệm xem tại http://localhost:8025. Xem [hướng dẫn tài khoản và OAuth](AUTH_SETUP.md) và [hướng dẫn blockchain](BLOCKCHAIN_SETUP.md).

## Ảnh bìa, hướng dẫn ví và banner trang chủ

- Menu tài khoản → **Chỉnh sửa trang cá nhân** → **Chọn ảnh bìa** → **Lưu thay đổi**. Có xem trước, thay và xóa ảnh; ảnh công khai trên trang cá nhân/shop. Server chuẩn hóa WebP 1200×400 (cắt giữa, tỉ lệ 3:1), bỏ metadata; nhận JPG/PNG/WebP tối đa 5 MB và 16 triệu pixel. Ảnh đại diện được giữ riêng.
- Máy đã có database từ phiên bản cũ: thêm cột nullable bằng `npx.cmd prisma db execute --file prisma/cover-upgrade.sql --schema prisma/schema.prisma` trong `apps/web`, rồi `npm.cmd run db:generate`. Dừng riêng web trước khi generate nếu Windows báo Prisma DLL đang bị khóa. Không cần reset database hoặc blockchain. Máy cài mới tiếp tục dùng `db:push` như trên.
- Menu **Hướng dẫn** có phần **MetaMask**: cài tiện ích, chọn/đổi tên account, cấu hình mạng, ký liên kết, demo mua bán, cấp ETH local và xử lý lỗi. Liên kết trợ giúp dẫn đến tài liệu chính thức MetaMask.
- Banner trang chủ luôn giữ slide giới thiệu TrustChain, thêm tối đa 6 sản phẩm LISTED thật (không dùng bản on-chain thuộc deployment cũ). Danh sách được chọn lại theo từng khung 30 phút; kiểm tra danh sách mỗi phút và khi quay lại tab để loại mặt hàng không còn bán. Thiếu sản phẩm thì hiển thị ít hơn, không tạo dữ liệu giả.
- Tự chuyển mỗi 6,5 giây; hỗ trợ nút trước/sau, chấm chọn slide, vuốt ngang và phím trái/phải khi vùng banner có focus. Tạm dừng khi rê chuột, focus hoặc tab bị ẩn; có nút dừng/chạy. Chế độ giảm chuyển động tắt tự chạy mặc định.
- Bấm mọi vùng của thẻ sản phẩm để mở chi tiết; bấm tên người bán vẫn mở shop. Ảnh phóng nhẹ khi hover/focus và trở về khi rời thẻ.

## Kiểm tra giao diện mới

Khi web và PostgreSQL đang chạy (Node.js 22 trở lên):

```powershell
npm.cmd run typecheck --prefix apps/web
npm.cmd run test:products --prefix apps/web
```

Kiểm thử tạo mặt hàng, kiểm tra dữ liệu trong PostgreSQL, API chi tiết, danh sách, bộ lọc và hồ sơ; sau đó chỉ xóa dữ liệu thử nghiệm vừa tạo.
