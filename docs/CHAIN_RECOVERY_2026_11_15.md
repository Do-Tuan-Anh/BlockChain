# Khôi phục node và sửa lỗi chuẩn bị metadata

Hoàn thành 15/11/2026. Node chính đã hoạt động; không reset, không deploy lại và không đổi scope/contract/ABI.

## Nguyên nhân

`METADATA_PREPARATION_FAILED` trong ảnh xuất phát từ RPC `127.0.0.1:8545` bị từ chối kết nối, không phải ảnh người dùng sai. Anvil không khởi động vì `/data/state.json` bị ghi dang dở: JSON dừng ở byte 726948, giữa bản ghi transaction. Ảnh IPFS và bản nháp DB vẫn tồn tại.

Đã giữ nguyên file hỏng và deployment manifest trong `.local/backups/chain-corrupt-2026-11-15/`. SHA-256 file gốc: `80c186f10871a34e40b09d10027ef72c9450d3fd827c7ed51cb2953db1e87811`.

## Khôi phục có kiểm chứng

1. Đọc trên bản sao: phần account/contract/storage và toàn bộ block còn đầy đủ; chỉ 54/90 bản ghi transaction đọc được tới cuối. File vẫn chứa raw transaction đã ký của toàn bộ 90 giao dịch trong các block.
2. Dùng các container thử ở cổng riêng để dựng chuỗi canonical và kiểm tra hash của từng raw transaction. Không gửi transaction thử này vào node chính.
3. Replay 90 raw transaction với timestamp và base fee gốc, cùng Anvil v1.4.4/Cancun. Tất cả receipt roots của 90 block có giao dịch và state roots của 91 header đều khớp bản gốc. 54 bản ghi transaction còn nguyên khớp hoàn toàn với kết quả replay sau khi gắn lại block hash gốc.
4. Giữ account/contract/storage và block gốc, bổ sung các bản ghi transaction còn thiếu từ replay đã xác minh. Khôi phục 90 historical snapshots và ánh xạ block hash về chuỗi gốc. Cả 41 account cuối cùng, bao gồm balance, nonce, code và storage, đều khớp.
5. Nạp file đầy đủ vào node kiểm thử khác; kiểm tra lại 90 transaction/receipt, 91 block, toàn bộ 41 account và owner NFT #8 ở hiện tại lẫn block 50. Chỉ sau khi qua đối chiếu mới thay file hỏng bằng bản khôi phục và bật node chính.

Các file bằng chứng local: `state-original.json`, `state-recovered.json`, `canonical-blocks.json`, `replayed-state.json`, `recovery-report.json`, `restart-verification.json`. Không commit các file snapshot/backup. Đây là khôi phục riêng cho file có đủ raw transaction và header để kiểm chứng; không phải công cụ tự vá mọi file state hỏng hoặc tự bịa lịch sử từ DB.

Cách Anvil nạp block, transaction và historical state đã đối chiếu với [mã nguồn đúng phiên bản](https://github.com/foundry-rs/foundry/blob/v1.4.4/crates/anvil/src/eth/backend/mem/mod.rs) và [hướng dẫn state management](https://getfoundry.sh/anvil/state-management/).

## Sửa ứng dụng

- API `products/[id]/metadata` kiểm tra chủ sản phẩm trước RPC, giới hạn thời gian kiểm tra chain và phân biệt `CHAIN_RPC_UNAVAILABLE`, `CHAIN_RESET_REDEPLOY_REQUIRED`, `WRONG_RPC_CHAIN`, `PRODUCT_STORAGE_UNAVAILABLE` với lỗi chuẩn bị metadata khác.
- Kiểm tra IPFS thất bại không thay URI/status hoặc đánh dấu sản phẩm đã mint. Bản nháp được giữ lại.
- `wallet-errors.cjs` dịch các mã lỗi thành hướng dẫn VI/EN. Không chỉ hiển thị chuỗi `METADATA_PREPARATION_FAILED` không rõ nguyên nhân.

## Checkpoint dự phòng

`scripts/checkpoint-chain.cjs --watch` tạo checkpoint mỗi 30 giây qua RPC Anvil, kiểm tra chain/deployment, giải nén và parse JSON đầy đủ trước khi lưu. Ghi file tạm, fsync rồi rename; giữ `latest.json` và `previous.json` trong `.local/backups/chain-checkpoints/<hash-scope>/`. File JSON hỏng không được phép ghi đè checkpoint hợp lệ. Dịch vụ checkpoint đã bật; launcher `demo:up` sẽ dùng lại hoặc bật nó trong các lần sau. Log ở `.local/demo/chain-checkpoint*.log`.

Chụp thủ công từ root: `node scripts/checkpoint-chain.cjs`. Bản này chỉ sao lưu blockchain, chưa phải F07 sao lưu đồng bộ PostgreSQL/IPFS/toàn bộ demo. Không tự nạp checkpoint cũ khi có sai deployment; vẫn cần xác minh trước khi khôi phục. Khi mất điện, thay đổi sau checkpoint gần nhất có thể chưa được lưu; vẫn nên dừng node bình thường.

## Kiểm thử thực tế

- `/api/chain/health`: `ready: true`, Chain ID 31337; `ensure-demo-chain` xác nhận dùng lại deployment đã lưu.
- Indexer bắt kịp head 90 ngay sau khôi phục.
- UI thật desktop **1/1**, mobile **1/1**: ví test ký qua adapter EIP-1193 → ảnh IPFS thật → mint → approve → list → buy → release; có kiểm tra quyền sở hữu, số dư, nonce lỗi và lịch sử. Chỉ tạo/dọn User/sản phẩm test riêng. Các transaction test là giao dịch local thật nên tiếp tục tồn tại trên chain; không mint thay cho sản phẩm của người dùng.
- Server test cấu hình RPC offline: **1/1** API test, trả `503 CHAIN_RPC_UNAVAILABLE` trong giới hạn, kiểm tra quyền trước RPC và giữ nguyên toàn bộ bản nháp.
- Unit messages **4/4**, checkpoint **1/1**; typecheck và production build đạt.
- Sau các UI test head đạt 110. Đã chụp checkpoint, kiểm tra không có transaction pending rồi restart node bình thường: head/hash 110, 90 receipt cũ, block hash cũ và NFT lịch sử đều giữ nguyên, health vẫn ready.
- Chưa thao tác xác nhận trên extension MetaMask thật của người dùng. Với tab đang mở, F5 web và chọn lại TrustChain Local nếu tiện ích vẫn giữ cảnh báo offline cũ; sau đó người bán tự ký mint cho bản nháp của mình.

Node chính, web cổng 3000 và checkpoint được giữ chạy. Các server/container kiểm thử ở cổng riêng được dừng sau kiểm thử.
