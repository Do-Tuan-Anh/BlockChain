# TrustChain — Báo cáo đồ án blockchain

**Phạm vi:** marketplace thử nghiệm cho hàng hóa vật lý, kết hợp chứng nhận ERC-721, ký quỹ ETH và metadata IPFS. **Trạng thái:** có luồng local thực thi thật; chưa tuyên bố production hoặc đã deploy testnet công khai. Nhóm tự bổ sung trang bìa, thành viên, mã sinh viên, giảng viên và phân công theo yêu cầu môn học.

## 1. Bài toán và câu hỏi nghiên cứu

Trong mua bán giữa các cá nhân, người mua lo trả tiền nhưng không nhận đúng hàng; người bán lo giao hàng nhưng không nhận tiền. Một máy chủ marketplace có thể ghi đơn hàng nhưng việc sửa database không nên tùy ý thay đổi quyền sở hữu chứng nhận số hay chuyển tài sản đang ký quỹ.

TrustChain khảo sát: (1) quy tắc thanh toán có thể được thực thi và kiểm chứng trên EVM như thế nào; (2) kết hợp dữ liệu riêng tư ngoài chuỗi với lịch sử tài sản công khai ra sao; (3) làm sao web phản ánh đúng sự kiện blockchain sau lỗi hoặc reorg.

Hệ thống không giải quyết đầy đủ xác thực hàng thật, bằng chứng giao hàng hoặc định danh pháp lý. NFT là bản ghi số do ví phát hành, không phải kết luận giám định vật lý.

## 2. Mục tiêu và phạm vi

- Kết nối tài khoản web với ví bằng challenge có thời hạn và chống dùng lại.
- Đưa ảnh và metadata công khai lên IPFS, mint NFT có tokenURI tương ứng.
- Đăng bán, mua, giữ ETH/NFT trong Escrow; giải ngân, hoàn tiền, timeout.
- Ghi hash bằng chứng và phán quyết từ ví có quyền phân xử.
- Đồng bộ events vào PostgreSQL để tìm kiếm và hiển thị; cho phép kiểm chứng trực tiếp owner/tokenURI.
- Có bằng chứng thực nghiệm từ test, receipt, gas report và video demo.

Không triển khai vận chuyển thực, oracle, thanh toán tiền pháp định, chống Sybil hoàn chỉnh, DAO, mã hóa địa chỉ cấp ứng dụng hay nâng cấp contract trong đợt này.

## 3. Cơ sở kỹ thuật và lựa chọn thiết kế

ERC-721 cung cấp giao diện nhận biết chủ sở hữu, cấp quyền và chuyển token; metadata extension có `tokenURI`. TrustChain sử dụng các thao tác đó để nối chứng nhận với listing và custody trong Escrow. [Đặc tả ERC-721](https://eips.ethereum.org/EIPS/eip-721).

Trình duyệt giao tiếp với ví qua `request` và các thông báo thay đổi tài khoản/network của EIP-1193. Ứng dụng dùng ethers để mã hóa lời gọi và chờ receipt; private key thuộc ví. Chữ ký liên kết hiện là thông điệp riêng, **không phải triển khai đăng nhập SIWE chuẩn EIP-4361**. [Đặc tả EIP-1193](https://eips.ethereum.org/EIPS/eip-1193).

IPFS định danh nội dung bằng CID; CID còn phụ thuộc codec/importer/chunking, không đơn thuần là chuỗi SHA-256 của toàn bộ file. Hệ thống cố định importer rồi tính lại CID cho nội dung đọc về. [Tài liệu CID](https://docs.ipfs.tech/concepts/content-addressing/).

Pin giúp node giữ nội dung khỏi garbage collection, nhưng cần duy trì node/replica hoặc bản sao để giữ khả dụng. Dự án có volume Docker, replica Kubo tùy chọn và backup CAR có checksum. [Tài liệu pin IPFS](https://docs.ipfs.tech/how-to/pin-files/).

Chọn kiến trúc hybrid vì mô tả dài và dữ liệu tài khoản không cần đồng thuận EVM, trong khi quyền chuyển NFT và tiền ký quỹ cần quy tắc kiểm chứng được. Local dùng Hardhat; pipeline testnet thống nhất **Ethereum Sepolia, chain ID 11155111**, không phải Base Sepolia. Việc triển khai công khai còn cần cấu hình và ETH testnet của nhóm.

## 4. Phương pháp triển khai

Chi tiết sơ đồ ở [ARCHITECTURE.md](ARCHITECTURE.md). Sáu contract đang build là MarketplaceNFT, Marketplace, Escrow, FeeManager, Reputation và DisputeResolution. Phía web dùng Next.js/NextAuth/Prisma/PostgreSQL; schema runtime nằm trong `apps/web/prisma`.

Người bán lưu bản nháp, tải ảnh (tối đa 5 MB), server decode và bỏ EXIF/GPS, pin WebP. Khi chuẩn bị mint, metadata chứa CID ảnh và thuộc tính sản phẩm được pin; snapshot bị khóa chỉnh sửa. Sau mint, approve và listing, indexer mới đánh dấu LISTED. Nếu người dùng dừng giữa chừng, bản nháp riêng cho phép tiếp tục.

Người mua ký `buyItem` với đúng giá wei. Contract chuyển NFT và ETH vào Escrow trong một transaction. Khi giải ngân, NFT tới buyer, tiền ròng tới seller, phí tới treasury. Hash bằng chứng có thể giúp so sánh file được trình bày sau này, nhưng không tự chứng minh file nói đúng sự thật.

Indexer dùng journal duy nhất theo transaction/log, checkpoint bền vững và transaction DB. Kiểm thử chủ động gây lỗi ghi DB và đổi nhánh local để đánh giá phục hồi. Metadata binding kiểm tra cả ví nhận NFT và ví gửi giao dịch, tránh người khác mint URI tương tự rồi chiếm trạng thái sản phẩm.

## 5. Đánh giá thực nghiệm

Môi trường và kết quả cụ thể nằm ở [TEST_REPORT.md](TEST_REPORT.md). Không thay số liệu thực nghiệm bằng kết quả giả định.

- Unit test contract kiểm tra quyền truy cập, giá, approvals, giải ngân một lần, timeout, hoàn tiền và phân xử; có tình huống bị thu hồi approve và chuyển NFT khiến listing cũ không còn mua được.
- Integration test dùng PostgreSQL, Kubo và RPC thật: upload ảnh, đọc CID, khóa metadata, replay signature, mua bán, hai hướng ruling, worker restart, rollback và reorg.
- Browser test thao tác UI desktop/mobile với adapter ví thử nghiệm; RPC, chữ ký và contract là thật. Chưa tương đương kiểm chứng extension MetaMask thật.
- [GAS_REPORT.md](GAS_REPORT.md) sinh tự động từ receipt. Gas phụ thuộc hàm, dữ liệu và trạng thái storage; không suy rộng một lần đo thành năng lực phục vụ production.
- [DEMO_GUIDE.md](DEMO_GUIDE.md) hướng dẫn trình diễn và đối chiếu bằng chứng.

Ví dụ luồng kiểm tra dùng đơn 0,2 ETH và phí 250 bps: số tiền ròng 0,195 ETH, treasury 0,005 ETH. Gas là khoản riêng do người gửi transaction trả, không được cộng nhầm vào phí giao thức.

## 6. An toàn và giới hạn niềm tin

| Rủi ro | Cơ chế hiện tại | Phần còn hạn chế |
|---|---|---|
| Giả ví / replay | Recover signer, nonce một lần, TTL, userId, origin | Chưa hỗ trợ ví hợp đồng EIP-1271 |
| Giả trạng thái NFT | Đọc logs từ địa chỉ deployment, binding ví và URI | Backend/RPC vẫn ảnh hưởng khả dụng và hiển thị |
| Ảnh độc hại / lộ EXIF | Giới hạn byte/pixel, decode lại raster, bỏ metadata | Người dùng vẫn có thể chụp thông tin cá nhân trong ảnh |
| Mất pin | Volume, replica cấu hình, CAR backup | Một node/backup trên cùng máy không chống mất cả máy |
| DB sai hoặc reorg | Atomic commit, checkpoint/hash, replay | Chưa có stress test/reorg lớn/HA nhiều vùng |
| Mua sai giá hoặc không có quyền NFT | Contract kiểm tra giá, ownership/approval | Có thể có nhiều listing cũ cho cùng NFT |
| Tranh chấp | Role on-chain, hash evidence, receipt công khai | Trọng tài và owner vẫn có quyền tập trung |
| Danh tính giả / tự giao dịch giữa nhiều ví | Uy tín phát sinh qua thao tác được cho phép | Không loại bỏ Sybil hoặc wash trading |

Các đường xử lý Escrow trực tiếp có thể làm hồ sơ tranh chấp và trạng thái tiền khác nhau; UI có cảnh báo nhưng chưa thay logic Solidity. Đây là điểm cần trình bày khi bảo vệ và cần đánh giá lại trước triển khai có giá trị thật. Các test pass không phải chứng nhận audit.

## 7. Kết luận và hướng phát triển

Kết quả cần chứng minh là một transaction thực sự làm thay đổi ownership hoặc số dư contract và web phản ánh sự thay đổi đó bằng receipt/events. Phần đã triển khai hỗ trợ chứng minh này trên local, cùng khả năng kiểm tra nội dung IPFS và phục hồi đồng bộ.

Các bước ngoài phạm vi local: triển khai và kiểm chứng Sepolia công khai, duy trì pin độc lập ngoài máy, thử ví extension thật, audit các đường giải quyết tranh chấp, thiết kế định danh/chống lạm dụng và đánh giá tải. Nhóm cần đối chiếu rubric môn học trước khi coi bộ hồ sơ là hoàn tất nộp bài.
