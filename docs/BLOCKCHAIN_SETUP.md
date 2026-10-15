# TrustChain: chạy luồng blockchain thật

Web hiện kết nối contract qua ví EIP-1193 (MetaMask), dùng ethers đã có trong dự án. Smart contract Solidity không bị thay đổi. Network được chọn từ manifest deploy; không nhập địa chỉ contract bằng tay trên web.

## 1. Khởi động local

Yêu cầu Node.js 22+, Docker Desktop, MetaMask (hoặc trình duyệt ví tương thích). Cài dependency ở root và `apps/web` nếu chưa có (`npm.cmd ci`, `npm.cmd ci --prefix apps/web`).

Mở terminal tại thư mục gốc. Chạy mỗi tiến trình dài trong một terminal riêng:

```powershell
# Terminal 1: blockchain local, chỉ lắng nghe loopback
npm.cmd run node

# Terminal 2: deploy một lần cho mỗi lần node mới khởi động
npm.cmd run deploy:local

# Terminal 2: PostgreSQL + Mailpit + IPFS, generate Prisma, cập nhật DB, chạy web
npm.cmd run dev:marketplace

# Terminal 3: đồng bộ sự kiện liên tục, có retry khi RPC/DB tạm gián đoạn
npm.cmd run indexer
```

Web: `http://localhost:3000/vi`. IPFS gateway: `http://localhost:8080/ipfs/<CID>`. API IPFS 5001 chỉ mở trên loopback, không công khai ra Internet.

Nếu web đang chạy khi schema thay đổi: dừng Next.js trước `npm.cmd run db:generate --prefix apps/web` để Windows không giữ khóa Prisma DLL. Database runtime là **apps/web/prisma/schema.prisma**, không phải schema prototype ở root. `db:push` bổ sung cột/bảng; không reset database.

Hardhat node giữ trạng thái khi tiến trình còn chạy, **không lưu chain qua lần tắt/mở**. Sau khi restart node, deploy lại và khởi động lại worker/web nếu cần. Manifest mới có scope riêng; sản phẩm của deployment cũ không được tự nhận là NFT trên chain mới. Không reset PostgreSQL chỉ để khởi động chain.

## 2. Ví và tài khoản

1. Đăng ký, xác thực email bằng Mailpit, đăng nhập web.
2. Mở Kho chứng nhận hoặc chi tiết sản phẩm, bấm **Kết nối ví**.
3. Ví chuyển/thêm mạng `TrustChain Local`, chain ID `31337`, RPC `http://127.0.0.1:8545`.
4. Ký thông điệp liên kết ví. Đây là chữ ký xác thực, không phải thanh toán. Nonce hết hạn sau 5 phút, gắn với tài khoản đăng nhập và chỉ dùng một lần.
5. Dùng một tài khoản Hardhat dành riêng cho demo trong MetaMask; private key hiển thị ở terminal chạy node. Các key này công khai và chỉ dùng local, tuyệt đối không dùng giữ tài sản thật. Người bán/người mua cần hai tài khoản web và hai ví khác nhau.

Ví được cố định theo tài khoản sau khi liên kết để bảo toàn danh tính người đăng bán. Không có chức năng đổi ví tự do trong đợt tích hợp này. Sau khi reset Hardhat, MetaMask có thể cần xóa dữ liệu hoạt động/nonce của **ví local**.

Menu tài khoản hiển thị địa chỉ ví đã liên kết và cho phép kết nối lại hoặc ngắt quyền kết nối của website. Khi đăng xuất, web yêu cầu MetaMask thu hồi quyền `eth_accounts`; thao tác này không xóa địa chỉ đã lưu và không chuyển NFT. MetaMask vẫn là ứng dụng độc lập nên web không thể khóa toàn bộ extension thay người dùng.

## 3. Kịch bản demo

### Người bán

- Mở Đăng sản phẩm; để chọn **Đăng bán blockchain**.
- Lưu bản nháp. Bản nháp chưa xuất hiện trong marketplace công khai.
- Kết nối ví → **Mint NFT & đăng bán**.
- Server ghim snapshot metadata lên IPFS Docker. Snapshot có tên/mô tả/ảnh và thuộc tính sản phẩm, không tự thêm email, điện thoại hay địa chỉ tài khoản.
- Ví ký lần lượt `mintProductNFT`, `approve`, `createListing`.
- Chỉ khi event hợp lệ được indexer ghi nhận, sản phẩm mới chuyển DRAFT → MINTED → LISTED.
- Nếu từ chối bước approve/listing: mở lại sản phẩm trong hồ sơ và **Tiếp tục đăng bán**. Tx đang chờ được ghi ở localStorage để không gửi lại ngay sau reload.
- Metadata đã ghim được khóa chỉnh sửa. Giá bán trong marketplace được lấy từ event listing, không lấy từ tham số giả mạo gửi lên API.
- Vẫn có tùy chọn đăng tin thông thường; tin này chưa có NFT và chưa có nút thanh toán Escrow.

### Người mua

- Đăng nhập bằng tài khoản khác, liên kết ví khác.
- Mở sản phẩm → **Mua qua Escrow** → xác nhận số ETH trong ví.
- Website chuyển đến đơn hàng với `orderId` lấy từ receipt `ItemPurchased`.
- Contract giữ cả ETH và NFT. Chọn **Đã nhận hàng · Giải ngân** để trả tiền người bán và chuyển NFT sang ví người mua.
- Người bán có thể hoàn tiền khi đang HELD; sau 14 ngày có thể yêu cầu timeout release theo contract.
- Kho chứng nhận liệt kê NFT đang thuộc ví và các đơn mua/bán. Khi NFT đang ký quỹ, chủ sở hữu là contract Escrow nên NFT xuất hiện trong đơn hàng thay vì danh sách NFT trong ví.

### Tranh chấp

- Khi HELD, người mua hoặc người bán chọn tệp bằng chứng (≤10 MB) rồi mở tranh chấp.
- Trình duyệt tính keccak256; chỉ hash được gửi on-chain. Tệp không được tải lên máy chủ. Hai bên giữ tệp gốc và cung cấp cho trọng tài bằng kênh riêng.
- Trọng tài cần cả quyền ADMIN của tài khoản web và `ARBITRATOR_ROLE` của ví. Local deploy cấp quyền contract cho tài khoản Hardhat thứ ba (index 2); deployer cũng có quyền theo contract hiện có.
- Cấp quyền web cho đúng tài khoản demo bằng Prisma Studio (chạy `npx.cmd prisma studio` trong thư mục `apps/web`) hoặc công cụ quản trị PostgreSQL. Không có API công khai tự nâng quyền.
- Mở **Phân xử** → bắt đầu xem xét → phán quyết hoàn tiền hoặc trả người bán. Giao dịch phải được ví có role ký.
- Contract hiện cho owner và một số bên giao dịch xử lý Escrow trực tiếp. Vì vậy đây là phân xử có quản trị, không phải một DAO hoàn toàn phi tập trung. UI báo rõ nếu Escrow đã xử lý ngoài hồ sơ phân xử.

## 4. Indexer và dữ liệu

### Lịch sử mua bán và dòng tiền

Mở menu tài khoản → **Lịch sử giao dịch** (`/vi/transactions`, `/en/transactions`). Trang yêu cầu đăng nhập, lấy địa chỉ ví đã liên kết từ tài khoản và đọc sự kiện Escrow đã được index trên deployment hiện tại; không nhận địa chỉ ví của người khác qua tham số URL.

- Người mua: `EscrowDeposited` là khoản **trừ** giá mua; `EscrowRefunded` là khoản **cộng** hoàn tiền. Khi giải ngân không trừ thêm lần nữa.
- Người bán: nhận đơn chỉ là dòng trạng thái, tiền vẫn ở Escrow. `EscrowReleased` mới là khoản **cộng** `sellerAmount` thực nhận, có hiển thị `feeAmount` riêng. Hoàn tiền cho người mua không được ghi là khoản trừ từ ví người bán vì tiền chưa từng được giải ngân cho họ.
- Tổng đang ký quỹ gồm đơn HELD/DISPUTED của ví; không cộng vào tổng đã nhận. Dùng số nguyên wei để cộng tổng, không dùng số thực hoặc tự giả định mức phí.
- Có bộ lọc tiền vào/tiền ra/trạng thái, phân trang 20 dòng, thời gian block, mã giao dịch và liên kết đơn/sản phẩm. Mạng có explorer thì mã giao dịch dẫn tới explorer; local hiển thị đầy đủ mã để đối chiếu.
- Đây là lịch sử **mua bán TrustChain**, không phải sao kê toàn bộ ví: không bao gồm gas, giao dịch thất bại, nạp ETH demo bằng `hardhat_setBalance`, chuyển ví ngoài ứng dụng hoặc deployment cũ. Bấm **Đồng bộ lịch sử** để index thêm sự kiện mới.

Kiểm thử riêng nhánh ký quỹ/tranh chấp/hoàn tiền và phân quyền: `npm.cmd run test:history --prefix apps/web` (cần web, DB và Hardhat local đang chạy). Kiểm thử tạo tài khoản/ví tạm, không reset node; giao dịch test vẫn lưu trên local chain.

### Số dư demo và bài đăng thuộc blockchain cũ

- Nhãn ví **xanh** là đã liên kết địa chỉ với tài khoản; **đỏ** là chưa liên kết. Dòng kết nối bên dưới là trạng thái kết nối MetaMask với website, độc lập với liên kết đã lưu.
- Trang sản phẩm hiển thị số dư thật đọc từ RPC của ví đã liên kết. Bấm **Đồng bộ** sau khi nạp tiền. Trên local đây là ETH thử nghiệm, không quy đổi ra tiền thật; mua hàng cần giá sản phẩm cộng phí gas.
- Từ thư mục gốc, cấp số dư tối thiểu 100.000 ETH cho địa chỉ người mua:

  ```powershell
  npm.cmd run demo:fund -- 0x90f79bf6eb2c4f870365e785982e1f101e93b906 100000
  ```

  Thay địa chỉ nếu dùng ví khác. Lệnh chỉ gọi RPC `127.0.0.1:8545`, kiểm tra client Hardhat và chain ID 31337 rồi dùng `hardhat_setBalance`. Không có giao dịch chuyển tiền, không cần private key, không giảm số dư đang cao hơn mục tiêu và không chạy trên Sepolia/mainnet. Số dư này mất khi node Hardhat bị reset; chạy lại lệnh trên node đang dùng để demo.
- Nếu trang báo **bản đăng bán thuộc blockchain cũ**, nạp tiền không giải quyết được: người bán mở bài đó → **Tạo bản nháp trên mạng hiện tại** → **Mint NFT & đăng bán**, ký các yêu cầu MetaMask. Bản nháp sao chép thông tin/ảnh, không sao chép NFT, listing hay giao dịch cũ. Bản ghi cũ được giữ nguyên. Gửi URL bài mới cho người mua; khi indexer xác nhận listing hoạt động, nút **Mua qua Escrow** xuất hiện.
- Không khởi động lại hoặc deploy lại blockchain chỉ để nạp ETH. Giữ node và indexer chạy trong suốt buổi demo.

- `apps/indexer/worker.cjs` dùng cùng Prisma client/schema với web; logic chung ở `apps/web/src/lib/chain/indexer.cjs`.
- Bắt đầu đọc từ block deploy, mỗi batch tối đa 500 block.
- `ChainEvent`: lưu tx hash + log index + block hash; khóa duy nhất chặn trùng.
- `ChainRecord`: projection NFT, listing, order, dispute, reputation từ events.
- `ChainCheckpoint`: block/hash cuối đã xử lý; lưu chung transaction DB với events và projection.
- PostgreSQL advisory lock ngăn hai worker/API sync ghi chồng nhau.
- Local mặc định 0 block chờ, Sepolia mặc định 3. UI chờ receipt với độ sâu tương ứng.
- Nếu checkpoint đổi hash: xóa riêng journal/projection của deployment đó, phát lại từ block deploy, giữ nguyên tài khoản và snapshot sản phẩm. Đây là cơ chế reorg cơ bản, không phải indexer quy mô lớn.
- Lỗi RPC/DB: batch rollback; worker retry theo backoff tối đa 30 giây. Lệnh `indexer:once` trả lỗi nếu không đồng bộ được.
- Sản phẩm chỉ gắn NFT khi metadata URI, người nhận mint và người gửi giao dịch đều khớp ví đã liên kết. Mint URI của người khác không được phép chiếm bản ghi sản phẩm.
- Nút **Đồng bộ** dành cho người đã đăng nhập; worker chạy độc lập giúp dữ liệu cập nhật khi không có người mở web.
- `/verify/<tokenId>` đọc trực tiếp `ownerOf`/`tokenURI` từ RPC tại cùng block, không tin một nhãn NFT trong database.

## 5. Sepolia

Đã chuẩn bị pipeline; cần ví testnet do bạn kiểm soát có ETH thử nghiệm. Không gửi private key qua chat hoặc commit Git.

Trong `.env` ở root (đã gitignore), điền:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc
DEPLOYER_PRIVATE_KEY=...
TREASURY_ADDRESS=0x...
ARBITRATOR_ADDRESS=0x...
```

```powershell
npm.cmd run deploy:sepolia
```

Sau đó đặt `CHAIN_RPC_URL` trong `apps/web/.env` thành RPC Sepolia và khởi động lại web/worker. Bỏ `CHAIN_CONFIRMATIONS=0` nếu từng đặt cho local. Trình duyệt dùng RPC công khai không chứa API key; giao dịch có link Etherscan Sepolia.

Deploy xuất địa chỉ, chain ID, block/hash deploy, tx hash cả 6 contract vào `data/trustchain-deployments.json`; ABI xuất từ artifact đã compile sang `apps/web/src/lib/chain/abis.json`. Manifest là cấu hình runtime, được gitignore. Sao lưu manifest khi chuyển network/deployment. Các alias `deploy:trustchain` và `deploy:verimarket` cũng trỏ đến localhost; chạy trực tiếp `hardhat run` không kèm network chỉ tạo chain tạm thời.

IPFS Docker pin cả ảnh upload và metadata thật. Ảnh được chuẩn hóa WebP, bỏ EXIF/GPS; metadata blockchain yêu cầu ảnh IPFS thay vì URL bên ngoài. Để chia sẻ testnet ngoài máy, cần duy trì pin và hạ tầng truy cập. Có cấu hình node pin dự phòng và lệnh kiểm tra/sao lưu/khôi phục CAR: xem [IPFS_STORAGE.md](IPFS_STORAGE.md). Không đưa thông tin cá nhân vào ảnh hoặc mô tả công khai.

## 6. Kiểm thử

```powershell
npm.cmd test
npm.cmd run typecheck --prefix apps/web
npm.cmd run build --prefix apps/web
# Web + PostgreSQL + Mailpit + IPFS + Hardhat local đã chạy:
npm.cmd run test:auth --prefix apps/web
npm.cmd run test:chain --prefix apps/web
npm.cmd run test:ipfs --prefix apps/web
npm.cmd run test:ui --prefix apps/web
```

`test:chain` chỉ chạy trên chain ID 31337: chữ ký/replay/ownership, IPFS, mint/list/buy/release, 2 hướng phân xử, indexer idempotence, reorg và confirmation depth. Test dùng tài khoản tạm, xóa bản ghi tài khoản/sản phẩm sau chạy. Giao dịch test vẫn ở chain local; phần reorg dùng snapshot chỉ cho nhánh test. Không chạy test reorg cùng lúc người khác đang giao dịch demo.

UI test cung cấp adapter ví tự động ở ranh giới EIP-1193, còn chữ ký/RPC/contract/IPFS/DB là thật. Nó không thay thế kiểm tra thao tác bằng extension MetaMask thật hoặc deployment Sepolia thật.

## 7. Bằng chứng nộp bài

Chạy `npm.cmd run report:gas` khi IPFS đang hoạt động để đo receipt trên Hardhat cô lập; lệnh không ghi đè manifest web. Chạy `npm.cmd run demo:record --prefix apps/web` khi toàn bộ stack local đã sẵn sàng để ghi video khoảng 3–5 phút. Xem [kịch bản demo](DEMO_GUIDE.md), [báo cáo kiểm thử](TEST_REPORT.md) và [checklist nộp bài](SUBMISSION_CHECKLIST.md).
