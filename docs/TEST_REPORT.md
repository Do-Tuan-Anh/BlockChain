# TrustChain — kết quả kiểm thử local

Ngày chạy: **12/10/2026**. Môi trường Windows, Node.js 22+, Next.js 15.5.27, PostgreSQL 16, Kubo trong Docker và Hardhat chain ID 31337. Web được build production trước kiểm thử trình duyệt. Không dùng kết quả này để khẳng định đã kiểm chứng Sepolia hoặc production.

## Kết quả

| Lệnh | Kết quả ghi nhận | Phạm vi |
|---|---|---|
| `npm test` | 29 đạt | Contract, quyền truy cập, payment, timeout, tranh chấp |
| `npm run test:ipfs --prefix apps/web` | 3 đạt | URI, nội dung bị sửa, replica lỗi |
| `npm run test:chain --prefix apps/web` | 1 kịch bản tích hợp đạt | Nhiều bước thực với RPC/Kubo/DB và worker |
| `npm run test:auth --prefix apps/web` | 1 kịch bản tích hợp đạt | Email, recovery và quyền sản phẩm |
| `npm run test:ui --prefix apps/web` | 10 đạt, 3,7 phút | Desktop và mobile |
| `npm run typecheck --prefix apps/web` | Đạt | TypeScript web |
| `npm run build --prefix apps/web` | Đạt | Build production, 47 trang được prerender |
| `npm run build --prefix apps/indexer` | Đạt | TypeScript entry point của worker |
| `npm run report:gas` | 36 receipt thành công | [Số đo gas và JSON](GAS_REPORT.md) |
| `npm run demo:record --prefix apps/web` | 1 đạt; video 3 phút 12,76 giây | 5 giao dịch UI, [receipt/CID](evidence/demo-recording.json) |

`npm run lint --prefix apps/web` chưa có cấu hình ESLint hoàn chỉnh và yêu cầu thiết lập tương tác; **không ghi nhận lint đạt**. Không thêm dependency chỉ để biến dòng này thành xanh.

## Ma trận chứng minh

| Nhóm | Tình huống / kết quả mong đợi đã kiểm tra | Nguồn |
|---|---|---|
| NFT/listing | Mint có URI, thiếu approve bị từ chối, hủy listing đúng quyền | `packages/contracts/test/VeriMarket.test.js` |
| Mua/Escrow | Đúng giá mới mua; ETH/NFT cùng vào ký quỹ; seller không tự mua; giải ngân và phí đúng; không giải ngân hai lần | `VeriMarket.test.js` |
| Timeout/refund | Chưa đủ 14 ngày bị từ chối; đủ hạn nhận tiền; refund trả ETH/NFT đúng bên | `VeriMarket.test.js` |
| Phân xử/uy tín | Hai hướng ruling; hash bằng chứng; caller không có quyền không sửa reputation/ruling | `packages/contracts/test/TrustChain.test.js` |
| Listing mất hiệu lực | Thu hồi approve hoặc chuyển NFT trước khi mua → revert và bảo toàn payment/listing | `packages/contracts/test/BoundarySafety.test.js` |
| Quyền/trạng thái sai | Outsider hủy/pause, mua lúc pause/sau hủy, bằng chứng rỗng, outsider mở tranh chấp, buyer tự refund, tranh chấp sau settlement → từ chối | `BoundarySafety.test.js` |
| Liên kết ví | Chữ ký sai, nonce replay, ví đã thuộc tài khoản khác → từ chối | `apps/web/tests/blockchain.integration.test.cjs` |
| Binding NFT | Người khác mint cùng metadata URI không chiếm bản ghi sản phẩm | `blockchain.integration.test.cjs` |
| Ảnh/metadata | Sai chủ sở hữu/file lỗi bị từ chối; WebP không còn EXIF/orientation; ảnh/metadata khớp CID; khóa sửa sau pin | `blockchain.integration.test.cjs` |
| IPFS toàn vẹn | URI/path tùy ý không được fetch; nội dung cat bị sửa bị phát hiện; pin replica lỗi không báo thành công | `apps/web/tests/ipfs.test.cjs` |
| Khôi phục IPFS | Export CAR, checksum, import pin root và đọc lại CID thành công | `blockchain.integration.test.cjs` gọi script maintenance |
| Giao dịch tích hợp | Mint/list/buy/release và cả hai hướng phân xử cập nhật projection đúng | `blockchain.integration.test.cjs` |
| Indexer phục hồi | Chạy lại không trùng; process worker mới dùng checkpoint; lỗi DB giữa batch rollback; reorg replay; chờ confirmation depth | `blockchain.integration.test.cjs` |
| Tài khoản | Đăng ký/xác thực/recovery, quyền sửa sản phẩm và hồ sơ | `apps/web/tests/auth.integration.test.cjs` |
| UI | Menu, hồ sơ, email, đăng bán thường và blockchain; tìm kiếm; dark/light, EN/VI và kích thước desktop/mobile | `apps/web/tests/ui` |

Một dòng integration bao gồm nhiều assertion tuần tự; không đánh đồng với một unit test riêng cho từng tình huống. Kiểm thử IPFS cố ý dùng proxy sửa nội dung để gây lỗi nhưng tính CID bằng importer Kubo thật. Các API trong luồng UI blockchain không bị mock; chỉ thay extension ví bằng adapter EIP-1193 ký giao dịch thật.

## Tái tạo

Khởi động stack theo [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md), rồi chạy các lệnh trong bảng. Khi test UI, dừng dev server trước build, dùng `npm run start --prefix apps/web` để phục vụ bản production vừa tạo. Test có tạo và dọn tài khoản/sản phẩm riêng; giao dịch và pin đã ghi lên local vẫn tồn tại. **Không chạy test reorg đồng thời với demo hoặc giao dịch của người khác.**

Ghi hình riêng bằng `npm run demo:record --prefix apps/web`; xem [DEMO_GUIDE.md](DEMO_GUIDE.md). Video ghi rõ môi trường local và ví tự động, có receipt/CID đi kèm.

## Chưa kiểm chứng

- Deployment Sepolia, explorer công khai và thao tác extension MetaMask thật.
- Node pin dự phòng độc lập ngoài máy và diễn tập mất toàn bộ máy/volume rồi phục hồi trên máy khác. Đã kiểm tra re-import CAR; chưa phá hủy dữ liệu để giả lập thảm họa.
- Ví hợp đồng EIP-1271, tải lớn, RPC provider mất đồng bộ kéo dài, audit độc lập.
- Chứng minh hàng vật lý chính hãng/giao hàng thật hoặc loại bỏ Sybil/wash trading.

Các giới hạn và quyền quản trị của contract được nêu trong [ARCHITECTURE.md](ARCHITECTURE.md); pass các ca trên không phủ nhận những giới hạn đó.
