# Lưu trữ IPFS và phục hồi dữ liệu

## Dữ liệu công khai

Ảnh raster và metadata NFT là nội dung công khai. Server không tự thêm email/điện thoại/địa chỉ vào JSON. Người dùng vẫn phải tránh để dữ liệu cá nhân trong nội dung mô tả hoặc ảnh chụp; bỏ EXIF/GPS không xóa chữ được chụp trong ảnh.

Tệp bằng chứng tranh chấp **không tự upload IPFS**: browser chỉ tính hash, người dùng giữ bản gốc và chia sẻ riêng với trọng tài. Không suy ra rằng một CID có mã hóa hoặc có kiểm soát truy cập.

## Luồng ảnh và metadata

1. Nhập sản phẩm, chọn JPG/PNG/WebP ≤5 MB; decoder giới hạn 16 triệu pixel, không nhận SVG/file giả raster hoặc ảnh nhiều frame.
2. Server chuẩn hóa ảnh thành WebP tối đa 2048×2048, bỏ EXIF/GPS và pin. Product lưu `imageUrl=ipfs://CID`.
3. Chuẩn bị mint: đọc và kiểm tra ảnh, bảo đảm pin trên các node đã cấu hình, tạo JSON chứa `image: ipfs://CID`, rồi pin JSON.
4. CID JSON được đưa vào tokenURI. Metadata đã chuẩn bị không được thay ảnh hay sửa thông tin trong API.
5. UI ảnh đi qua `/api/ipfs/:cid`; metadata verify đọc owner/tokenURI trực tiếp và tính lại CID nội dung.

Importer cố định: CIDv1, SHA2-256, raw leaves, chunk 262144 bytes, không wrap directory. Vì CID phụ thuộc cách import, đọc nội dung rồi chạy `only-hash` với cùng cấu hình để so sánh. Nhãn `CID_VERIFIED` chỉ nói nội dung khớp CID do node Kubo tin cậy tính; không chứng minh lời mô tả hàng hóa đúng hoặc hai RPC/node độc lập không thông đồng.

URL ảnh ngoài vẫn dùng được cho tin thông thường. Nếu muốn mint sản phẩm đang có ảnh URL ngoài, tải ảnh về máy rồi dùng **Tải ảnh lên IPFS** trong chi tiết sản phẩm. Server không tự fetch URL tùy ý, tránh biến tính năng tải ảnh thành truy cập mạng nội bộ theo địa chỉ do người dùng cung cấp.

## Cấu hình node

Docker mặc định chạy Kubo, volume `ipfs_data`; API `127.0.0.1:5001`, gateway `127.0.0.1:8080`. Volume tồn tại qua lần restart container. Không dùng `docker compose down -v` để dừng demo.

Trong `apps/web/.env`:

```dotenv
IPFS_API_URL=http://127.0.0.1:5001
IPFS_API_AUTHORIZATION=
# Tùy chọn: Kubo thứ hai do nhóm quản lý, API tương thích /api/v0/*
IPFS_BACKUP_API_URL=
IPFS_BACKUP_API_AUTHORIZATION=
NEXT_PUBLIC_IPFS_GATEWAY=http://localhost:8080/ipfs/
```

Nếu đặt replica, pin ở cả hai node phải thành công mới trả kết quả sẵn sàng. Khi đọc, hệ thống thử node thứ hai nếu node đầu lỗi. Token Authorization chỉ đặt phía server; không đặt trong `NEXT_PUBLIC_*` và không public cổng admin RPC Kubo. Chưa tự provision một dịch vụ pin bên ngoài; cấu hình Pinata REST không tương đương Kubo RPC này.

## Kiểm tra / backup / restore

```powershell
npm.cmd run ipfs:check
npm.cmd run ipfs:backup
npm.cmd run ipfs:restore
```

- `check`: lấy CID ảnh/metadata từ Product trong DB, đọc có giới hạn, kiểm tra CID và pin trên mọi node cấu hình.
- `backup`: export DAG thành CAR cho từng CID, lưu `.local/ipfs-backups/<CID>.car` và manifest SHA-256. Manifest chỉ được thay sau khi cả lần backup thành công.
- `restore`: kiểm tra checksum CAR, import và pin root trên các node, rồi đọc lại kiểm chứng CID.
- Các lệnh thoát lỗi nếu thiếu pin/nội dung/checksum sai; không tự xóa hay unpin dữ liệu của người dùng.
- `.local` được gitignore. Sao chép thư mục backup sang ổ/máy độc lập mới bảo vệ được khi mất máy hiện tại. Database vẫn cần backup riêng để giữ tài khoản/sản phẩm và các liên kết.

`restore` đã được kiểm tra bằng re-import CAR và đọc lại. Chưa có diễn tập phá hủy toàn bộ volume production rồi khôi phục trên máy mới. Backup chỉ bao phủ sản phẩm còn trong DB ở thời điểm chạy, không tự thu thập mọi NFT ngoài ứng dụng.

## Bằng chứng kiểm thử

```powershell
npm.cmd run test:ipfs --prefix apps/web
npm.cmd run test:chain --prefix apps/web
```

Bao gồm upload sai quyền/file lỗi, bỏ EXIF, khóa ảnh sau pin metadata, đọc CID thực, gateway trả nội dung bị thay đổi, replica bị lỗi, CAR backup/import và xác minh NFT. Xem [TEST_REPORT.md](TEST_REPORT.md) cho lần chạy được ghi nhận.
