# F01 — Chi tiết giao dịch blockchain

Hoàn thành triển khai ngày **06/11/2026**. Phạm vi chỉ F01; chưa triển khai F02.

## Cách sử dụng

Bấm mã Tx ở sản phẩm đã mint, khung blockchain, đơn hàng hoặc lịch sử giao dịch. Trang `/{locale}/transactions/{hash}` đọc trực tiếp transaction, receipt và block từ RPC. Có thể mở URL trực tiếp, không cần đăng nhập để xem dữ liệu blockchain công khai. Danh sách lịch sử tài khoản vẫn dùng quyền đăng nhập hiện có.

Trang có trạng thái thành công/thất bại, số xác nhận, địa chỉ gửi/nhận, phương thức và tham số, ETH gửi kèm, nonce, block/thời gian, gas đã dùng, gas price và phí gas chính xác theo wei. Các sự kiện Escrow hiển thị tiền ký quỹ, tiền người bán thực nhận, phí nền tảng hoặc hoàn tiền; sự kiện NFT hiển thị chuyển quyền sở hữu. Các khoản này tách biệt với gas và không suy ra từ `tx.value`.

Trang tự kiểm tra lại mỗi 15 giây khi tab hiển thị; có nút Làm mới, sao chép mã và link explorer nếu deployment cấu hình explorer. Không coi đủ confirmation là bảo đảm finality tuyệt đối. Giao dịch chưa tìm thấy không bị gắn nhãn thất bại.

## File và giới hạn kỹ thuật

- `apps/web/src/components/TransactionDetails.tsx`: UI VI/EN, sáng/tối, responsive, lỗi/retry, sự kiện và log gốc.
- `apps/web/src/app/[locale]/transactions/[hash]/page.tsx`: trang chính; `app/transactions/[hash]/page.tsx`: chuyển hướng sang VI và giữ scope.
- `apps/web/src/app/api/chain/transactions/[hash]/route.ts`: GET công khai, `no-store`, hash 32 byte; chỉ dùng RPC cấu hình server, không truy vấn hồ sơ tài khoản.
- `apps/web/src/lib/chain/transaction-details.cjs`, `transaction-types.ts`: đọc receipt, kiểm tra canonical block, decode bằng 6 ABI hiện có, bigint cho phí gas.
- `apps/web/src/lib/chain/runtime.cjs`: thêm timeout tùy chọn cho provider; các caller cũ giữ cách sử dụng hiện tại.
- `components/ChainControls.tsx` và `TransactionHistory.tsx`: dùng chung TxLink nội bộ kèm scope. Product dùng scope của bản ghi; lịch sử dùng scope của response.

Scope khác bị từ chối; giao dịch trước deployment hoặc ngoài contract hiện tại được ghi rõ và không tạo link đơn hàng từ sự kiện đó. Khi receipt/block không còn khớp, trang bỏ kết quả và số xác nhận cũ. Log không decode được vẫn xem được dưới dạng text, không thực thi HTML.

Giới hạn 120 request/phút **chung mỗi server process**; không phải rate limit phân tán hoặc riêng từng người dùng. RPC timeout 8 giây/request, toàn bộ lượt đọc tối đa 12 giây; browser timeout 15 giây và chờ một phút khi gặp 429. Không thay đổi schema, contract, ABI, địa chỉ hay deployment; không cần migration hoặc deploy lại.

## Kiểm thử đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npm.cmd run typecheck --prefix apps/web` | Đạt |
| Production build Next.js trên bản sao `.cache/persistent-demo-build/apps/web` | Đạt; route động và API mới có trong build |
| `node --test tests/transaction-details.test.cjs` | 5/5: bigint, confirmation, failed/pending/not-found/reorg, log lạ, scope cũ, trước deployment, deadline/rate limit |
| `node --env-file=.env --test tests/transaction-details.integration.test.cjs` | 1/1: đọc RPC thật, đối chiếu receipt mua/giải ngân đã lưu, phí gas, log, public API, hash sai/scope cũ/not-found |
| Playwright `tests/ui/transaction-details.spec.ts` | 6/6 trên desktop và Pixel 7; chạy 4 bài giao diện/trạng thái và 2 bài bấm link đơn hàng |
| Kiểm tra ảnh chụp desktop sáng/EN và mobile tối/VI | Đạt; không tràn ngang; có kiểm tra focus bàn phím |
| `npm.cmd run lint --prefix apps/web` | Chưa chạy được: repository chưa cấu hình ESLint; `next lint` mở trình hỏi thiết lập. Không tự thêm dependency/cấu hình ngoài F01 |

Lệnh test integration/UI chạy từ `apps/web`, với `TEST_BASE_URL=http://localhost:3001` trỏ đến bản production kiểm thử. Các fixture integration/UI hiện dùng giao dịch demo đã lưu: mua `0xe19969ef6bd051c7930664dd9f43e050a5c25abf63b6a3ee79fb1130e715828d`, giải ngân `0x2459b876d5adfbda56f2d14269f97ffb615e4485e168bddb691ec08fab951475`, đơn #4. Nếu chuyển sang deployment khác phải chọn fixture tương ứng, không reset/deploy để làm test qua.

## Phần chưa kiểm chứng thực tế

- Không ký giao dịch mới hoặc điều khiển extension MetaMask trong lượt F01; API/receipt thật được đọc ở chế độ chỉ đọc. Không sửa đơn hoặc sản phẩm của người dùng.
- Failed/pending/reorg được kiểm thử bằng provider fixture và phản hồi UI có kiểm soát; không chủ động gây reorg hoặc dừng node đang dùng để thử lỗi.
- Explorer đã kiểm tra URL theo cấu hình trong UI test; chưa chạy giao dịch Sepolia thật.
- Đã bấm link Tx thật từ đơn hàng và mở URL trực tiếp. Liên kết mint/lịch sử dùng cùng TxLink, đã kiểm tra code/typecheck/build; chưa chạy lại toàn bộ luồng mint/mua qua MetaMask trong lượt này.

Docker Desktop và node đã được bật lại để đọc receipt từ volume hiện có. Server production kiểm thử cổng 3001 được dừng sau kiểm thử; không reset dữ liệu demo.
