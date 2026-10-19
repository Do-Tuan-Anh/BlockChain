# Bật TrustChain và giữ blockchain sau khi tắt máy

## Mỗi lần demo

1. Mở Docker Desktop, chờ engine chạy.
2. Bấm đúp **Start-TrustChain.cmd** ở thư mục gốc project. Hoặc mở terminal tại đó và chạy `npm.cmd run demo:up`.
3. Vào http://localhost:3000/vi. Mở khóa MetaMask, chọn account đã liên kết và mạng **TrustChain Local** (RPC `http://127.0.0.1:8545`, Chain ID `31337`).

Lệnh bật PostgreSQL, Mailpit, IPFS và node Anvil, kiểm tra contract, đồng bộ một lượt rồi chạy web/indexer nền. Có thể đóng cửa sổ launcher. Log nằm trong `.local/demo/`. Chạy lại lệnh khi dịch vụ đang hoạt động sẽ dùng lại chain và contract, không deploy/reset mỗi lần.

Nếu MetaMask đã cấp quyền cho website và đang chọn đúng account/mạng, web tự nhận lại kết nối khi tải trang hoặc quay về tab. Không tự mở khóa MetaMask, không tự đổi account, không tự ký giao dịch. Sau khi đăng xuất/ngắt quyền, cần bấm **Kết nối ví** để cấp lại quyền.

Nếu MetaMask còn hiển thị lỗi cũ, mở lại tiện ích/chọn lại TrustChain Local, rồi F5 web. Kiểm tra http://localhost:3000/api/chain/health: `ready: true` nghĩa RPC và contract hiện tại đã khớp. Không reset ví để sửa lỗi mạng.

## Những gì được lưu

| Dữ liệu | Vị trí |
|---|---|
| Số dư ETH test, nonce, contract/storage, NFT, block, transaction, receipt/log | Docker volume `chain_data`, file `/data/state.json` của Anvil |
| Địa chỉ contract và dấu nhận diện deployment | `data/trustchain-deployments.json` trong project |
| Tài khoản, bài đăng và bản sao sự kiện/indexer | Docker volume `postgres_data` |
| Ảnh và metadata IPFS | Docker volume `ipfs_data` |

Anvil v1.4.4 được ghim phiên bản/digest, EVM Cancun, tự lưu mỗi **5 giây**, lưu khi shutdown bình thường và nạp lại khi khởi động. Giữ cả lịch sử block/transaction để indexer và xác minh NFT tiếp tục hoạt động. Volume được cấp quyền cho user Anvil; healthcheck kiểm tra quyền ghi và file trạng thái.

Docker service dùng `restart: unless-stopped`: tự chạy lại khi Docker engine mở, trừ khi đã chủ động stop. `demo:up` sẽ bật lại service đã stop. Có thể bật tùy chọn khởi động Docker Desktop cùng Windows trong Docker Desktop; launcher không tự sửa thiết lập Windows.

**Tắt an toàn:** dừng container `chain` trong Docker Desktop hoặc chạy `docker compose stop chain` trước khi tắt máy. Chờ lệnh hoàn tất. Khi mất điện/kill cưỡng bức, các thay đổi sau lần lưu gần nhất có thể mất và file đang ghi có thể hỏng; đây không phải node production hay cơ chế backup chống mất điện. Không dùng `docker compose down -v`, không xóa volume, không chạy `anvil_reset`.

Backup lâu dài cần giữ đồng bộ cả volume blockchain, manifest, PostgreSQL và IPFS. File state không nằm trong Git. Giữ thư mục project để không mất manifest. Nếu manifest không khớp một chain đã có block, launcher dừng và yêu cầu khôi phục cặp bản lưu đúng, không tự deploy đè lên.

## Chuyển từ Hardhat cũ

Node Hardhat đã tắt mà không có snapshot không thể khôi phục NFT/giao dịch chỉ từ PostgreSQL. Launcher lưu manifest cũ vào `.local/deployments/`, deploy một lần trên chain Anvil rỗng và giữ nguyên dữ liệu cũ trong database. Sản phẩm cũ được đánh dấu khác deployment; người bán dùng **Tạo bản nháp trên mạng hiện tại → Mint NFT & đăng bán**. Không sửa `chainScope` để giả làm NFT đã chuyển mạng.

Sau lần chuyển đầu tiên này, việc dừng/mở Anvil bình thường không cần mint hoặc deploy lại. `npm run node` vẫn là Hardhat tạm thời dành cho phát triển; không chạy đồng thời với Docker Anvil vì cùng cổng 8545.

10 account demo mặc định giữ cùng địa chỉ như Hardhat và có 100.000 ETH thử nghiệm khi tạo chain. Với địa chỉ riêng, chạy `npm.cmd run demo:fund -- <địa-chỉ> 100000`. Lệnh chỉ chạy trên Hardhat/Anvil local chain 31337, không dùng tiền thật.

## Kiểm chứng lưu trữ

Khi không có người đang gửi giao dịch demo:

```powershell
node scripts/check-demo-persistence.cjs prepare
docker compose restart chain
docker compose up -d --wait chain
node scripts/check-demo-persistence.cjs verify
```

Kiểm thử tạo NFT và chuyển ETH bằng account test thứ 9, đối chiếu lại owner/URI, số dư, nonce, block hash, transaction, receipt và logs sau restart. Không sửa tài khoản/bài đăng của người dùng. NFT test vẫn nằm trên local chain, không đăng bán trên chợ.

Tham khảo: [Anvil state management](https://getfoundry.sh/anvil/state-management/).
