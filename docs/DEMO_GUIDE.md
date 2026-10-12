# Demo TrustChain trong 3–5 phút

## Chuẩn bị

Chạy theo [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md). Đảm bảo web, PostgreSQL, IPFS, Hardhat và indexer hoạt động. Hai tài khoản web và hai ví riêng có ETH local; một ví trọng tài và tài khoản ADMIN nếu trình diễn phân xử. Dùng ảnh sản phẩm không chứa thông tin cá nhân.

Không đặt trước tokenId/orderId hoặc số dư giả trong slide. Ghi ID từ giao dịch đang chạy. Nếu dùng local, nói rõ local và không mở Etherscan như thể đó là tx testnet.

## Kịch bản chính khoảng 4 phút

| Thời gian | Thao tác trên web | Lời giải thích / bằng chứng |
|---|---|---|
| 0:00–0:30 | Trang chủ, mở Kho NFT và kết nối ví người bán | Chỉ rõ chain ID 31337; phiên web khác với chữ ký liên kết ví |
| 0:30–1:20 | Tạo sản phẩm, tải ảnh lên IPFS, lưu bản nháp | Đưa ảnh và JSON lên IPFS; dữ liệu riêng tư không được tự thêm vào metadata |
| 1:20–2:00 | Mint, approve, createListing | Ba giao dịch thật; hiển thị tokenId, listing và tx hash |
| 2:00–2:40 | Đổi sang tài khoản/ví người mua, mua qua Escrow | Số ETH thực gửi; ownerOf lúc này là Escrow, trạng thái HELD |
| 2:40–3:20 | Xác nhận nhận hàng → giải ngân | Trạng thái RELEASED; NFT chuyển sang buyer; phí và tiền ròng tách biệt |
| 3:20–4:00 | Kho NFT → xác minh, mở metadata | Đọc owner/tokenURI trực tiếp; CID_VERIFIED; đối chiếu receipt và báo cáo gas |

Giữ trang đủ lâu để hội đồng đọc số liệu. Giao dịch cần lâu hơn dự kiến thì ưu tiên chỉ rõ pending/confirmed, không đổi sang dữ liệu giả. Với Sepolia, quay trước vì thời gian xác nhận phụ thuộc mạng.

## Nhánh phân xử bổ sung

Tạo đơn thứ hai, chưa xác nhận nhận hàng. Chọn file bằng chứng → mở tranh chấp → xem DISPUTED. Vào ADMIN với ví có ARBITRATOR_ROLE, đánh dấu xem xét và chọn refund buyer. Kiểm tra REFUNDED và ownerOf quay về seller. Có thể dùng test để chứng minh thêm ruling trả seller.

## Video có thể tái tạo

`npm.cmd run demo:record --prefix apps/web` chạy kịch bản browser có ghi hình và phụ đề hướng dẫn trong khoảng 3–5 phút. Video ghi rõ **local, ví test tự ký qua adapter EIP-1193, không phải MetaMask extension hoặc testnet công khai**. Giao dịch, IPFS và database vẫn thực thi thật.

Kết quả đặt trong `.local/demo/`: video WebM, `evidence.json` chứa deployment/IDs/CID/tx hashes và bảng phụ đề. File lớn không được tự commit. Không chạy video demo cùng test reorg. Test tạo tài khoản/sản phẩm riêng và dọn bản ghi của chính nó sau khi ghi hình; chain vẫn lưu giao dịch. Nhóm có thể quay thủ công bằng MetaMask và đọc lời dẫn trên để thay video tự động.

Lần ghi ngày **12/10/2026** đã hoàn thành: video **3 phút 12,76 giây**, 1280×800, có phụ đề hướng dẫn tiếng Việt (không thu giọng nói), nằm tại `.local/demo/2026-10-12T03-52-21-919Z/trustchain-demo.webm`. Mở `index.html` cùng thư mục để xem. Đã kiểm tra khung hình listing và xác minh; năm receipt trong [bằng chứng lần ghi](evidence/demo-recording.json) đều có status 1. File JSON này là bằng chứng lịch sử local, không dùng thay manifest runtime và không tra được trên explorer công khai. Người clone repo cần tự chạy lệnh ghi hình vì video được gitignore.

## Câu hỏi bảo vệ

**Blockchain nằm ở đâu?** Trong sáu Solidity contract. Cho xem receipt, gọi ownerOf/getEscrow và số dư Escrow; thay đổi database không thay thế được tx ký từ ví.

**Tại sao không dùng database cho mọi thứ?** DB phục vụ tài khoản và truy vấn; contract cung cấp quy tắc chuyển tài sản mà các bên có thể kiểm chứng. Vẫn có hạ tầng tập trung và quyền quản trị, nên không tuyên bố đã loại bỏ mọi niềm tin.

**NFT có chứng minh hàng thật không?** Không. Nó chứng minh bản ghi số/quyền sở hữu; liên kết với hàng thật vẫn cần quy trình xác minh ngoài chuỗi.

**Người mua không xác nhận thì sao?** Seller có thể claim sau 14 ngày tính từ ký quỹ nếu trạng thái còn HELD. Không có oracle hãng vận chuyển.

**IPFS có lưu vĩnh viễn không?** Cần duy trì pin/replica/backup. CID giúp kiểm tra nội dung, không tự bảo đảm khả dụng.

**Có chống đánh giá giả hoàn toàn không?** Chỉ số uy tín gắn thao tác contract; chưa chống một người tạo nhiều ví hoặc thông đồng.

**Test pass có nghĩa an toàn tuyệt đối?** Không. Đây là bằng chứng cho các trường hợp đã kiểm thử, chưa có audit hay đánh giá production.
