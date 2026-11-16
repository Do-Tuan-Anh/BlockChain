# TrustChain — Đặc tả các tính năng tiếp theo

Cập nhật: **06/11/2026**. Mục đích: giải thích đề xuất cho nhóm và làm tài liệu bàn giao để người phát triển/agent có thể tiếp tục từ code thực tế.

**Trạng thái: F01 đã triển khai và kiểm thử ngày 06/11/2026; F02–F07 chưa triển khai.** Xem [kết quả và giới hạn kiểm thử F01](F01_TEST_REPORT.md). Tài liệu không phải lệnh tự chạy migration, deploy hoặc khôi phục dữ liệu. Khi được yêu cầu triển khai tiếp, đối chiếu lại code và trạng thái công việc trước khi sửa.

## 1. Đọc trước khi làm tiếp

1. Đọc [README](../README.md), tài liệu này và [kiến trúc](ARCHITECTURE.md).
2. Kiểm tra `git status`, hướng dẫn repository nếu có và các thay đổi đang dang dở; giữ lại công việc của người dùng và các lượt trước.
3. Dùng **`apps/web/prisma/schema.prisma`** cho runtime web. Schema ở `prisma/schema.prisma`, `apps/api` và prototype AegisMed không phải bằng chứng tính năng đang chạy.
4. Kiểm tra route/component hiện có trước khi tạo mới. Các tên model, API và file được ghi là **đề xuất** bên dưới chưa tồn tại, có thể điều chỉnh theo code lúc thực hiện.
5. Đọc [cách bật demo và lưu dữ liệu](DEMO_START.md). Dùng blockchain đang lưu; không deploy/reset lại chỉ để chạy thử tính năng web.
6. Trước thay đổi schema/storage: sao lưu dữ liệu hiện tại, xem xét migration có dữ liệu, không dùng reset hoặc chấp nhận mất dữ liệu để vượt lỗi.
7. Chỉ đánh dấu hoàn thành khi đã có code, kiểm thử tương ứng và ghi lại hạn chế. Không suy ra đã hoàn thành từ bản thiết kế, bản dịch UI hoặc model trong schema gốc.

## 2. Điểm xuất phát đã có

Cập nhật xác thực 15/11/2026: đăng nhập bằng MetaMask, mỗi địa chỉ ví là một tài khoản; đổi account yêu cầu chữ ký mới. Email/mật khẩu và OAuth đã ngừng dùng. Xem [AUTH_SETUP](AUTH_SETUP.md). F02–F07 vẫn chưa triển khai.

Đã bổ sung bước thiết lập hồ sơ cho ví mới, lưu/bỏ qua một lần trong DB; xem [PROFILE_ONBOARDING](PROFILE_ONBOARDING.md). Các hồ sơ cũ giữ nguyên; đây là phần cải thiện xác thực/hồ sơ, không phải F02.

| Phần đang có | Nơi đọc code | Tận dụng khi phát triển |
|---|---|---|
| Đăng nhập, phiên, liên kết ví bằng chữ ký | `apps/web/src/lib/auth*`, API `chain/wallet`, `contexts/WalletContext.tsx` | Quyền theo tài khoản đăng nhập và địa chỉ ví đã xác minh; không tin `userId`/vai trò do client gửi |
| Số dư ví dùng chung ở menu, khung blockchain, lịch sử | `components/WalletBalance.tsx`, `contexts/useWalletBalance.ts`, API `chain/balance` | Đọc RPC cho đúng ví/scope; không tính số dư bằng tổng lịch sử marketplace |
| Mint, approve, đăng bán, mua, hủy listing | `components/ChainControls.tsx` | Giữ luồng phục hồi transaction đang chờ, metadata bất biến và kiểm tra deployment |
| Đơn hàng, giải ngân/hoàn tiền/timeout, xác minh NFT, phân xử | `components/ChainScreens.tsx` | Mở rộng giao diện hiện có; không tạo luồng ký giao dịch song song |
| Lịch sử tiền vào/ra và trạng thái đơn | `components/TransactionHistory.tsx`, API `me/transactions`, `lib/chain/history*` | Giữ nguyên cách phân biệt thanh toán vào Escrow với giải ngân cho người bán |
| Journal sự kiện, projection, checkpoint, replay | `lib/chain/indexer.cjs`, `apps/indexer/worker.cjs` | Nguồn để nối đơn hàng, uy tín và thông báo với sự kiện thật |
| Cấu hình deployment, RPC và ABI | `lib/chain/runtime.cjs`, `types.ts`, `abis.json` | Dùng chung `scope`, `validateChain`, cấu hình confirmation; không hard-code địa chỉ mới |
| Upload ảnh/metadata công khai lên IPFS | `lib/ipfs.cjs`, API `products/[id]/image`, `metadata` | Không dùng nguyên luồng này để lưu chứng cứ hoặc địa chỉ riêng tư |
| Lưu blockchain và backup IPFS | `docker-compose.yml`, `scripts/start-demo.ps1`, `scripts/ipfs-maintenance.cjs` | F07 bổ sung bản sao đồng bộ toàn hệ thống; không viết lại phần đã có |

Hiện runtime chưa có model nghiệp vụ giao hàng, đánh giá hoặc thông báo. `Reputation.sol` ghi chỉ số giao dịch/tranh chấp, chưa phải bảng sao và nhận xét. Hồ sơ phân xử hiện chủ yếu ghi hash tệp, chưa có kho chứng cứ gốc riêng cho trọng tài.

## 3. Mục tiêu và thứ tự

| Mã | Mục | Ưu tiên | Phạm vi tối thiểu | Cần đổi contract? |
|---|---|---|---|---|
| F01 | Chi tiết giao dịch blockchain | Cao nhất | Receipt, phí gas, sự kiện, liên kết từ mã Tx | Không |
| F02 | Thông tin giao hàng theo đơn | Cao | Địa chỉ riêng tư, trạng thái gửi hàng, vận đơn | Không |
| F03 | Hồ sơ tranh chấp | Cao | Lý do, tệp riêng tư, đối chiếu hash, giải thích phán quyết | Không, theo khả năng contract hiện tại |
| F04 | Đánh giá sau mua | Vừa | Một đánh giá/đơn đã giải ngân, hiển thị trên shop | Không, lưu off-chain và kiểm tra điều kiện bằng chain |
| F05 | Thông báo trong website | Vừa | Chuông, chưa đọc, liên kết đúng đơn | Không |
| F06 | Quản lý sản phẩm người bán | Vừa | Bộ lọc theo trạng thái, bản nháp, hủy và lưu trữ | Không |
| F07 | Sao lưu toàn bộ demo | Hỗ trợ vận hành | Blockchain + PostgreSQL + IPFS + manifest, kiểm tra khôi phục | Không |

Ưu tiên chức năng **F01 → F02 → F03**, sau đó F04/F05/F06 theo nhu cầu. F07 có thể làm độc lập; việc sao lưu thủ công trước migration vẫn cần thực hiện dù chưa xây F07. Không cần làm hết các tính năng này mới có thể demo bài tập lớn hiện tại.

## 4. Quy tắc chung cho tất cả các mục

- Giữ authentication, routing, API đang dùng và luồng ký ví. Không sửa smart contract/ABI/contract address cho phạm vi tối thiểu này.
- Mọi `orderId`, `listingId`, `tokenId` phải đi kèm deployment `scope`. ID có thể trùng sau lần triển khai khác; không ghép dữ liệu chỉ theo số thứ tự.
- On-chain là nguồn trạng thái tiền, NFT, listing, Escrow và phán quyết. Database lưu nghiệp vụ riêng tư và bản sao phục vụ truy vấn, không tự biến một đơn thành đã trả tiền.
- Xác định người mua/người bán từ contract hoặc sự kiện đã kiểm chứng, đối chiếu ví đã liên kết của phiên hiện tại. Kiểm tra quyền tại API, không chỉ ẩn nút ở UI.
- Giao diện quản trị web và quyền trọng tài trên contract là hai điều kiện khác nhau. Với chứng cứ riêng tư, kiểm tra đúng quyền cần thiết ở backend.
- Phân biệt đã gửi transaction, đã vào block và đã đủ độ sâu xác nhận. Không gắn nhãn thành công ngay khi người dùng bấm Confirm trong MetaMask.
- Không đưa địa chỉ, số điện thoại, email, tệp chứng cứ riêng tư hoặc bí mật đăng nhập lên chain/IPFS công khai hay log.
- Hỗ trợ VI/EN, sáng/tối, mobile, loading, empty, lỗi và retry. Không dùng dữ liệu giả để che lỗi hạ tầng.
- Không đưa nội dung metadata đã mint vào luồng chỉnh sửa thông thường. Thay nội dung bản ghi số bất biến cần được thiết kế riêng, không thuộc các mục này.

## F01. Trang chi tiết giao dịch blockchain

Đã hoàn thành. File, kết quả kiểm thử và các phần chưa kiểm chứng thực tế được ghi tại [F01_TEST_REPORT.md](F01_TEST_REPORT.md). Không cần migration hoặc deploy lại.

### Người dùng sẽ thấy gì?

Bấm mã Tx ở lịch sử, đơn hàng hoặc sau mint sẽ mở trang trong TrustChain. Ví dụ một giao dịch xác nhận nhận hàng hiển thị: đã vào block, phí gas, sự kiện giải ngân, người bán nhận bao nhiêu, phí nền tảng và NFT chuyển cho ai. Người dùng không cần đọc một chuỗi hash để đoán kết quả.

### Thiết kế triển khai

- Route đề xuất: `/{locale}/transactions/{hash}`; giữ `/{locale}/transactions` làm danh sách lịch sử.
- API đề xuất: `GET /api/chain/transactions/[hash]`. Chỉ trả dữ liệu blockchain công khai, không join thông tin hồ sơ riêng tư.
- Tái sử dụng `TxLink` và đưa các mã Tx trong `TransactionHistory` về cùng trang chi tiết. Nếu có explorer, thêm nút mở explorer bên ngoài.
- Dùng `config`, `providerFor`, `validateChain`; giới hạn định dạng hash 32 byte, thời gian RPC và tần suất truy vấn. Không nhận RPC URL tùy ý từ client.
- Đọc transaction, receipt và block trực tiếp; decode calldata/log của 6 contract bằng ABI hiện có. Logs không decode được vẫn hiển thị an toàn ở phần kỹ thuật.
- Hiển thị hash, chain, scope, địa chỉ gửi/nhận, method nếu nhận diện được, `value`, block/thời gian, số xác nhận, `gasUsed`, gas price thực tế và phí gas.
- Tính phí gas bằng số nguyên wei (`gasUsed × effectiveGasPrice` hoặc trường tương đương từ receipt), format sau cùng. Không dùng số thực JavaScript để tính tiền.
- `tx.value` không đại diện mọi chuyển tiền nội bộ. Khoản giải ngân/phí giao thức phải lấy từ event phù hợp và ghi rõ nguồn, không suy ra chỉ từ `value`.
- Các trạng thái: đang tải; đã gửi nhưng chưa có receipt; thành công trong block; thất bại (`status = 0`); đủ confirmation theo cấu hình; RPC không sẵn sàng; không tìm thấy. Không tìm thấy không đồng nghĩa giao dịch thất bại.
- Nếu hash thuộc contract khác hoặc block trước deployment đang dùng, ghi rõ không thuộc phạm vi TrustChain hiện tại. Không gắn sự kiện cũ vào đơn hiện tại.
- Đối chiếu block hash/canonical block khi cần; không giữ nhãn đủ xác nhận nếu giao dịch đã bị reorg khỏi chain.

### Nghiệm thu

- [x] Bấm mã Tx mint/mua/giải ngân mở đúng trang, kể cả khi tải trực tiếp URL.
- [x] Receipt `status = 1` và `status = 0` được phân biệt đúng; pending/not-found/RPC offline có trạng thái riêng.
- [x] Phí gas khớp receipt; không cộng trùng giá hàng hoặc phí giao thức.
- [x] Xem được trên local không có explorer; testnet có liên kết explorer theo cấu hình.
- [x] Hash sai, scope cũ, logs lạ không làm crash hoặc lộ dữ liệu riêng tư.

## F02. Thông tin giao hàng theo đơn

### Người dùng sẽ làm gì?

Phạm vi đầu tiên giữ nguyên nút mua hiện tại. Sau khi thanh toán đã được xác nhận, người mua mở đơn để nhập người nhận, điện thoại, địa chỉ và ghi chú. Người bán xem thông tin của đúng đơn, chuẩn bị hàng, nhập đơn vị vận chuyển/mã vận đơn và đánh dấu đã gửi. Người mua xác nhận đã nhận hàng qua thao tác Escrow đang có.

Trang đơn hiển thị hai phần: **trạng thái tiền trên blockchain** và **tiến độ giao hàng do các bên cập nhật**. Việc người bán nhập vận đơn không phải bằng chứng blockchain xác minh đã giao hàng.

### Dữ liệu và quyền đề xuất

- Model `OrderFulfillment`, khóa duy nhất `(scope, orderId)`: ví buyer/seller đã đối chiếu chain, snapshot người nhận/địa chỉ, điện thoại, ghi chú, trạng thái, carrier, tracking number, `createdAt`, `updatedAt`, `shippedAt`, `version`.
- Model/record lịch sử cập nhật để biết ai thay thông tin và khi nào; không ghi nội dung địa chỉ vào log ứng dụng thông thường.
- Trạng thái nội bộ tối thiểu: `AWAITING_DETAILS`, `PREPARING`, `SHIPPED`. Hiển thị đã nhận/hoàn tiền/tranh chấp dựa vào chain; không giả lập oracle vận chuyển bằng các trạng thái này.
- API đề xuất: `GET/PATCH /api/orders/[id]/fulfillment`. Scope lấy từ cấu hình đang xác thực, không tin scope client gửi để vượt quyền.
- Buyer của đơn được nhập/sửa thông tin trước khi đã gửi hàng. Seller của đơn được đọc thông tin và cập nhật vận chuyển, không sửa địa chỉ người nhận.
- Không tự lấy địa chỉ mới nhất từ profile thay vào đơn cũ. Đơn cần snapshot riêng; thay profile không đổi địa chỉ đã chốt.
- Khóa thay địa chỉ sau `SHIPPED`. Kiểm tra lại trạng thái Escrow trước cập nhật; đơn đã giải ngân/hoàn tiền không nhận thao tác gửi hàng mới. Tranh chấp có thể vẫn đọc lịch sử.
- Chống hai bên ghi đè bằng optimistic concurrency (`version`); validate độ dài, số điện thoại, mã vận đơn và `validOrigin` cho mutation.
- Chỉ buyer/seller được xem địa chỉ. Trọng tài chỉ xem khi xử lý hồ sơ tranh chấp hợp lệ và có nhu cầu được thiết kế rõ; không mặc định mọi tài khoản ADMIN xem tất cả địa chỉ.
- Nếu mã hóa địa chỉ ở tầng ứng dụng, dùng mã hóa xác thực, quản lý khóa riêng với database và có quy trình backup/rotation. Không tuyên bố đã mã hóa nếu chỉ thêm cột dạng chuỗi.

### Giới hạn cần giữ đúng

Contract hiện tại cho buyer giải ngân theo quyền/state, chưa kiểm tra trạng thái vận chuyển trong database. UI có thể giải thích hoặc thêm hộp xác nhận, nhưng không được tuyên bố server bảo đảm buyer chỉ giải ngân sau khi đã giao. F02 không đổi cách tính timeout hiện có của contract.

### Nghiệm thu

- [ ] Đơn chưa thanh toán không được giả lập thành đơn có tiền qua API giao hàng.
- [ ] Buyer nhập địa chỉ; seller xem và đánh dấu gửi; tài khoản thứ ba bị từ chối cả GET lẫn PATCH.
- [ ] Đổi profile không làm thay đổi đơn; địa chỉ đã gửi không bị sửa; hai tab cập nhật xung đột được báo rõ.
- [ ] Refund/release giữ đúng trạng thái chain dù trạng thái vận chuyển cũ chưa đổi.
- [ ] Không có địa chỉ/điện thoại trong metadata IPFS, sự kiện chain, trang công khai hoặc log.

## F03. Hồ sơ tranh chấp và chứng cứ riêng tư

### Người dùng sẽ làm gì?

Buyer/seller chọn lý do như chưa nhận hàng, sai mô tả, hư hỏng hoặc lý do khác; nhập mô tả và thêm tệp. App tính hash, cho người dùng kiểm tra rồi ký thao tác mở tranh chấp/gửi bằng chứng đang có. Trọng tài mở hồ sơ, xem tệp được phép, đối chiếu hash và ghi giải thích trước khi ký phán quyết.

### Thiết kế triển khai

- Mở rộng `OrderScreen` và `DisputesScreen`. Không tạo một hệ phân xử chỉ ghi database mà không gọi contract.
- Model đề xuất `DisputeCase` có `(scope, orderId)`, lý do, mô tả, người tạo, mốc thời gian. State và ruling on-chain vẫn lấy từ projection/contract.
- Model đề xuất `DisputeEvidence`: UUID, case, uploader, tên hiển thị, loại/size, storage key, `keccak256` của **đúng bytes tệp gốc**, hash transaction/log tương ứng, thời điểm và trạng thái chờ/đã neo hash lên chain.
- Giới hạn ban đầu: tối đa 10 MiB/tệp, 5 tệp/người/hồ sơ, ảnh hoặc PDF. Kiểm tra cả nội dung/định dạng thực tế; không chấp nhận HTML/SVG/script chạy trực tiếp trong trình duyệt.
- Lưu riêng ngoài public directory, ví dụ `.local/private-evidence/<uuid>`. Tên file người dùng không trở thành đường dẫn filesystem. Không gửi vào IPFS công khai.
- API đề xuất: `GET/POST /api/orders/[id]/dispute`, `POST /api/orders/[id]/evidence`, `GET /api/evidence/[evidenceId]`. Chứng cứ đi qua endpoint có kiểm tra phiên/quyền, không trả URL tĩnh công khai.
- Server tự tính lại hash để so với client. Nếu có chuẩn hóa ảnh preview, hash vẫn tính trên bản gốc; preview không được thay âm thầm bytes dùng đối chiếu.
- Contract nhận một hash trong mỗi thao tác hiện có: mở tranh chấp với tệp đầu tiên; tệp tiếp theo dùng thao tác gửi thêm bằng chứng. UI giải thích có thể cần nhiều lần ký; không tuyên bố một hash đại diện toàn bộ tệp nếu chưa thiết kế manifest riêng.
- Upload thành công chưa có nghĩa bằng chứng đã ghi lên blockchain. Chỉ liên kết là đã neo sau khi kiểm tra receipt/log đúng scope, order, sender và hash. Ký bị hủy giữ trạng thái chờ để thử lại; dọn tệp chưa gắn giao dịch theo thời hạn đề xuất 24 giờ.
- Chỉ các bên của đơn và người phân xử hợp lệ được đọc. Với trọng tài: phiên có quyền web phù hợp **và** ví đã liên kết có `ARBITRATOR_ROLE` hiện tại, kiểm tra ở server cho việc truy cập riêng tư.
- Mô tả/lý do/giải thích phán quyết là dữ liệu off-chain. Lưu actor, phiên bản và thời gian sửa; không tuyên bố nội dung này bất biến nếu contract chỉ lưu hash bằng chứng/ruling.
- Chuẩn bị giải thích trước khi ký phán quyết và gắn với Tx sau xác nhận. Nếu lưu giải thích thất bại sau Tx thành công, hiển thị phán quyết chain thật và cho bổ sung giải thích, không gửi lại phán quyết.
- Nếu Escrow đã được xử lý trực tiếp ngoài `DisputeResolution`, giữ cảnh báo hiện có; không hiển thị hồ sơ OPEN như vẫn có thể trả tiền lần nữa.

### Nghiệm thu

- [ ] Tệp gốc có hash trùng hash on-chain; sửa một byte phải phát hiện không khớp.
- [ ] Người ngoài không truy cập được tệp bằng UUID, URL đoán được hoặc tài khoản ADMIN thiếu điều kiện trọng tài.
- [ ] Hủy ký, receipt thất bại, tải lại trang và gửi lại không tạo bằng chứng/phán quyết thành công giả.
- [ ] Hai nhánh refund/release chuyển ETH/NFT đúng như contract hiện tại.
- [ ] Có thể đọc bằng chứng và lý do phán quyết theo quyền; tệp không xuất hiện trong IPFS công khai hoặc Git.

## F04. Đánh giá sau giao dịch hoàn tất

### Người dùng sẽ làm gì?

Sau một đơn được giải ngân, buyer gửi 1–5 sao và nhận xét. Shop hiển thị sao trung bình, số đánh giá và các nhận xét có nhãn đã mua. Chỉ số giao dịch/tranh chấp từ `Reputation` hiển thị riêng để người xem biết nguồn dữ liệu.

### Thiết kế triển khai

- Model `Review`: `(scope, orderId)` unique, buyer/seller wallet, người viết, rating, comment, thời gian. Phiên bản tối thiểu gửi một lần, chưa hỗ trợ sửa hoặc phản hồi; nếu thêm sau phải có lịch sử chỉnh sửa.
- API đề xuất `POST /api/orders/[id]/review`; API đọc review trên shop phải lọc bỏ dữ liệu riêng tư.
- Backend xác minh đơn thuộc scope, buyer khớp ví đã liên kết và state thực tế là `RELEASED`. Không tin cờ `completed` từ client hoặc chỉ kiểm tra sản phẩm có status SOLD.
- Đơn HELD/DISPUTED/REFUNDED không đủ điều kiện trong phiên bản này. UNIQUE và transaction DB ngăn hai request đồng thời tạo hai đánh giá.
- Bình luận lưu off-chain; render dạng text an toàn. Không thêm giao dịch gas chỉ để gửi bình luận trong phạm vi tối thiểu.
- Dùng ví seller làm đối tượng uy tín; nếu tài khoản/shop đổi liên kết trong tương lai, không tự gán đánh giá lịch sử của ví cũ sang ví mới.
- Nhãn đã mua chứng minh điều kiện giao dịch được kiểm tra; không cam kết loại bỏ một người nhiều ví hoặc giao dịch thông đồng.

### Nghiệm thu

- [ ] Đúng buyer của đơn đã RELEASED mới gửi được; người khác/seller/đơn hoàn tiền bị từ chối.
- [ ] Gửi trùng, hai tab hoặc order cùng số ở scope khác không vượt điều kiện.
- [ ] Sao trung bình/số review lấy dữ liệu thật; hiển thị tách với số giao dịch on-chain.

## F05. Thông báo trong website

### Người dùng sẽ thấy gì?

Chuông trên navbar có số chưa đọc. Danh sách có đơn mới, gửi hàng, giải ngân, hoàn tiền, mở tranh chấp và phán quyết. Bấm mở đúng đơn; có thao tác đọc từng thông báo/đọc tất cả.

### Thiết kế triển khai

- Model `Notification`: id, userId, scope, loại, orderId nếu có, khóa nguồn duy nhất, createdAt, readAt, trạng thái nguồn nếu bị reorg. Không chứa địa chỉ giao hàng hoặc chứng cứ trong preview.
- API đề xuất `GET /api/me/notifications`, `PATCH /api/me/notifications/[id]`, `POST /api/me/notifications/read-all`; luôn lọc bằng user của phiên.
- Tiền/đơn/phán quyết: tạo từ event đã được indexer chấp nhận theo cấu hình confirmation, không tạo ngay khi người dùng bấm nút. Giao hàng: tạo cùng transaction DB với thay đổi hợp lệ của F02.
- Khóa chống trùng on-chain gồm scope + txHash + logIndex + recipient + loại. Off-chain dùng ID sự kiện nghiệp vụ/version + recipient + loại.
- Phần thêm thông báo phải tương thích transaction/checkpoint của indexer. Replay không nhân đôi thông báo hoặc đặt lại trạng thái đã đọc.
- Có xử lý thông báo của event bị reorg: đánh dấu không còn hợp lệ hoặc thu hồi phù hợp; không để thông báo giải ngân giả còn được hiển thị như thành công.
- Chốt mốc bắt đầu/backfill khi bật tính năng; không tự gửi toàn bộ sự kiện lịch sử cho người vừa tạo tài khoản/liên kết ví. Mối liên hệ user–wallet cần được kiểm tra theo thiết kế liên kết lúc triển khai.
- Ban đầu polling nhẹ khi tab hiển thị; phân trang và dừng polling khi tab ẩn. Chưa cần WebSocket, push trình duyệt hoặc email sản xuất.
- Ngữ nghĩa đúng: có đơn mới = tiền đang ở Escrow; đã nhận tiền = có sự kiện giải ngân cho seller.

### Nghiệm thu

- [ ] Buyer/seller nhận đúng thông báo và không đọc được danh sách của nhau.
- [ ] Worker chạy lại/replay không lặp; read/unread giữ đúng sau tải lại.
- [ ] Refund/release/dispute có link đúng scope/đơn và không lộ dữ liệu riêng tư.

## F06. Quản lý sản phẩm người bán

### Người dùng sẽ làm gì?

Từ trang cá nhân, người bán mở danh sách quản lý có bộ lọc Bản nháp / Chờ hoàn tất đăng bán / Đang bán / Đã bán / Đã hủy hoặc lưu trữ. Mỗi bài chỉ có các hành động hợp lệ: tiếp tục, sửa bản nháp, xóa bản nháp, mở đơn, hủy listing hoặc lưu trữ.

### Thiết kế triển khai

- Tận dụng `PrivateDrafts`, `ProductBlockchain`, API `me/products` hoặc API sản phẩm hiện có; route quản lý riêng là lựa chọn triển khai, không tạo hai nơi có logic khác nhau.
- Chỉ chủ sản phẩm được sửa/xóa/lưu trữ qua API. Danh sách có phân trang, trạng thái rỗng và xác nhận rõ khi xóa.
- Giữ khóa metadata hiện có: bản nháp `metadataUri != null` đã bị API khóa chỉnh sửa, dù chưa mint. Với bản này, đề xuất tạo bản nháp mới từ thông tin cũ khi cần sửa; không mở khóa tùy tiện.
- Xóa cứng chỉ dành bản nháp chưa gắn metadata/on-chain, không có transaction đang chờ hoặc bản ghi sự kiện liên quan; phải đối chiếu lại trước khi xóa. Nếu không chứng minh được an toàn thì lưu trữ thay vì xóa.
- Bài có NFT/listing/giao dịch được lưu trữ khỏi danh sách cá nhân, không xóa chứng cứ chain hoặc lịch sử đơn. Bài scope cũ không được dùng tokenId/listingId đó để hủy trên chain mới.
- Hủy bán phải ký `cancelListing` hiện có và chờ xác nhận; không chỉ đổi status database. Việc ẩn bài ở UI không hủy quyền mua on-chain.
- `status` hiện được indexer tính lại. Nếu cần trạng thái ẩn/lưu trữ của người dùng, bổ sung cờ/field off-chain riêng như `sellerArchivedAt`, không ghi đè status rồi để indexer bật lại.
- Nếu có chức năng đổi giá, dùng hủy listing rồi tạo listing mới khi điều kiện contract cho phép, lưu liên kết lịch sử; không chỉ PUT giá database. Không sửa metadata NFT đã mint.
- Chặn double-submit; giữ khả năng tiếp tục mint/approve/list đã có, không mint lại chỉ vì UI chưa đồng bộ.

### Nghiệm thu

- [ ] Chủ bài quản lý được; tài khoản khác không sửa/xóa bằng API trực tiếp.
- [ ] Xóa bản nháp hợp lệ được; bài đã mint/đã bán/pending không bị xóa cứng.
- [ ] Hủy bán phản ánh event thật; indexer chạy lại không làm mất lựa chọn lưu trữ off-chain.
- [ ] Đơn cũ, NFT và lịch sử giao dịch vẫn truy xuất được sau khi lưu trữ bài.

## F07. Sao lưu toàn bộ demo bằng một thao tác

### Người dùng sẽ làm gì?

Chạy lệnh/nút khởi chạy local để tạo một gói backup có thời gian, scope và checksum. Kiểm tra gói, rồi có thể phục hồi trên môi trường demo riêng. Không cần thêm nút backup/restore công khai trong website.

### Gói cần chứa

| Dữ liệu | Yêu cầu |
|---|---|
| Anvil | State đã ghi ổn định, khối/transaction/NFT/số dư/nonce và dữ liệu lịch sử cần dùng |
| PostgreSQL | Dump tài khoản, sản phẩm, dữ liệu nghiệp vụ, journal/checkpoint và các model mới |
| IPFS | CAR + manifest/checksum; bao phủ CID sản phẩm hiện có và CID NFT on-chain cần giữ, kể cả bài đã được xóa/lưu trữ |
| Chứng cứ riêng tư | Nếu F03 đã có, gồm tệp và mapping DB tương ứng; bảo vệ như dữ liệu tài khoản |
| Deployment | Manifest đúng bản chain, chainId/scope, block hash, phiên bản image và schema/code cần thiết |
| Cấu hình nhạy cảm | Không tự đóng gói `.env`/private key; ghi rõ cấu hình/khóa giải mã nào cần cung cấp riêng để phục hồi |

### Thiết kế triển khai

- Script đề xuất `scripts/backup-demo.ps1` với các chế độ backup/check; restore là lệnh riêng có kiểm tra đường dẫn và xác nhận đích rõ ràng khi được người dùng yêu cầu.
- Không chỉ nén file state Anvil đang ghi. Tạm dừng nguồn ghi web/worker, dừng chain bình thường để chốt state, tạo DB dump và bộ IPFS/chứng cứ nhất quán, rồi khởi động lại đúng các dịch vụ trước đó đang chạy, kể cả khi backup lỗi.
- Ghi manifest có phiên bản format, thời gian, scope, schema/version, danh sách file và checksum. Chỉ báo backup hoàn thành sau khi kiểm tra đầy đủ, không chỉ sau khi tạo ZIP.
- Gói chứa dữ liệu cá nhân phải được bảo vệ, ví dụ mã hóa bằng passphrase cung cấp riêng; không ghi passphrase trong log, manifest hoặc Git. Đặt đầu ra trong `.local/backups`, không thuộc public web.
- Tận dụng công cụ CAR hiện có, nhưng phạm vi hiện tại chỉ quét CID từ Product trong DB là chưa đủ cho bản backup toàn bộ sau khi xóa bài: cần thêm CID từ NFT/projection/chain và ảnh được metadata tham chiếu.
- Khôi phục thử vào volumes/database/cổng tách biệt trước. Không ghi đè dữ liệu đang dùng hoặc chạy `docker compose down -v` để làm trống môi trường.
- Khi phục hồi thật, giữ cả scope/manifest/chain/DB cùng một thời điểm; đồng bộ lại indexer có kiểm chứng. MetaMask có thể cần đối chiếu Activity/nonce sau khi quay về snapshot cũ, không tự can thiệp ví người dùng.

### Nghiệm thu

- [ ] Backup khi có NFT, đơn đã giải ngân, bản nháp và dữ liệu mới; manifest và checksum hợp lệ.
- [ ] Khôi phục ở môi trường tách biệt, đối chiếu ownerOf/tokenURI, số dư, nonce, receipt, block hash, ảnh và dữ liệu riêng tư.
- [ ] File thiếu/sai checksum/scope không khớp bị từ chối trước khi thay dữ liệu đích.
- [ ] Backup thất bại không để demo tắt ngoài ý muốn; secrets và gói riêng tư không xuất hiện trong Git.

## 5. Kiểm thử và cách ghi nhận hoàn thành

### Bộ kiểm tra theo phạm vi

- Docs-only: kiểm tra đường dẫn, liên kết, thuật ngữ và tính nhất quán với runtime; không cần chạy migration hoặc test hợp đồng.
- UI/API: typecheck, build và kiểm thử tích hợp đúng phần sửa. UI cần kiểm tra desktop/mobile, VI/EN, theme sáng/tối và keyboard/focus của thành phần mới.
- Quyền riêng tư: kiểm tra gọi API trực tiếp bằng người ngoài, không chỉ thao tác nút trên trình duyệt.
- Giao dịch: kiểm thử local RPC thật, giữ deployment đang dùng; dữ liệu/ví test riêng, không thực hiện giao dịch trên đơn của người dùng để thử.
- Đồng bộ: kiểm tra submit trùng, retry, worker/indexer bận, tải lại trang, scope khác, node offline, và replay/reorg với phần có phụ thuộc sự kiện.
- Migration: kiểm tra trên bản sao dữ liệu có sẵn; không dùng test database trống làm bằng chứng duy nhất rằng nâng cấp an toàn.
- Phân biệt kiểm thử adapter EIP-1193 với thao tác trên extension MetaMask thật; chỉ ghi nhận những gì đã thực hiện.

### Mẫu cập nhật cho lần triển khai tiếp

Mỗi lần hoàn tất hoặc dừng giữa chừng, cập nhật bảng bên dưới và bổ sung ghi chú gồm: file/API/model thực tế, migration cần chạy, kết quả kiểm thử, phần chưa kiểm chứng, bước tiếp theo. Nếu phạm vi khác đặc tả, ghi lý do và hành vi cuối cùng.

| Mã | Trạng thái tại 06/11/2026 | Ghi chú tiếp tục |
|---|---|---|
| F01 | Hoàn thành | Trang/API chi tiết Tx, link nội bộ, receipt/gas/events; xem [kiểm thử và giới hạn](F01_TEST_REPORT.md) |
| F02 | Chưa triển khai | Cần migration runtime và quyền buyer/seller theo scope/order |
| F03 | Chưa triển khai | Tái sử dụng contract; cần storage riêng tư và cơ chế gắn tệp với event |
| F04 | Chưa triển khai | Cần Review trong schema runtime; kiểm tra RELEASED thật |
| F05 | Chưa triển khai | Thiết kế khóa chống trùng, read state và reorg trước khi nối indexer |
| F06 | Chưa triển khai phần quản lý tổng hợp | Đã có bản nháp, resume đăng bán và hủy listing; mở rộng, không làm lại |
| F07 | Chưa triển khai gói backup tổng hợp | Đã có Anvil persistent, checkpoint chain riêng và backup IPFS; cần snapshot nhất quán toàn bộ |

**Bước tiếp theo khi được yêu cầu “làm theo roadmap”:** đọc lại mục 1 và kiểm tra thay đổi mới. F01 đã hoàn thành; chỉ bắt đầu F02 khi người dùng yêu cầu tiếp. Lượt triển khai F01 dừng tại đây. Không xem các đề xuất chưa triển khai ở đây như tính năng đã có để đưa vào báo cáo kết quả.
