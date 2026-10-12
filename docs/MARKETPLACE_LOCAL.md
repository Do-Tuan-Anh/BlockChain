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

## Kiểm tra

Khi web và PostgreSQL đang chạy (Node.js 22 trở lên):

```powershell
npm.cmd run typecheck --prefix apps/web
npm.cmd run test:products --prefix apps/web
```

Kiểm thử tạo mặt hàng, kiểm tra dữ liệu trong PostgreSQL, API chi tiết, danh sách, bộ lọc và hồ sơ; sau đó chỉ xóa dữ liệu thử nghiệm vừa tạo.
