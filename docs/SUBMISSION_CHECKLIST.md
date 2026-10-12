# Hồ sơ nộp đồ án TrustChain

Đây là checklist theo phạm vi project; nhóm cần đối chiếu rubric giảng viên. Không tự điền tên nhóm hay kết quả chưa thực hiện.

| Hạng mục | Tài liệu/bằng chứng | Trạng thái |
|---|---|---|
| Bài toán, mục tiêu, phạm vi, giới hạn | [WHITE_PAPER.md](WHITE_PAPER.md) | Đã soạn theo runtime |
| Kiến trúc, on-chain/off-chain, sequence, state, schema | [ARCHITECTURE.md](ARCHITECTURE.md) | Đã soạn |
| Cách chạy và vai trò tài khoản/ví | [BLOCKCHAIN_SETUP.md](BLOCKCHAIN_SETUP.md) | Đã soạn |
| IPFS và backup/restore | [IPFS_STORAGE.md](IPFS_STORAGE.md) | Có code và hướng dẫn |
| Phân tích gas và receipt thô | [GAS_REPORT.md](GAS_REPORT.md), [JSON](evidence/gas-report.json) | Số đo local thật |
| Test tích cực/tiêu cực và khả năng phục hồi | [TEST_REPORT.md](TEST_REPORT.md) | Đối chiếu kết quả ghi nhận |
| Demo 3–5 phút và lời giải thích | [DEMO_GUIDE.md](DEMO_GUIDE.md), [receipt/CID](evidence/demo-recording.json) | Đã ghi video local 3 phút 12,76 giây; lưu trong `.local/demo` |
| Thông tin sinh viên, lớp, giảng viên, phân công | Bìa báo cáo/biểu mẫu của môn | Nhóm tự bổ sung |
| Slide theo mẫu môn học | Chuyển nội dung báo cáo thành slide | Chưa tạo deck riêng |
| Testnet công khai, explorer và MetaMask thật | Điền `.env`, deploy Sepolia, quay/kiểm tra thủ công | Chưa thực hiện do thiếu cấu hình ví/RPC/test ETH của nhóm |
| Audit độc lập / hiệu năng production | Ngoài phạm vi đồ án local | Chưa thực hiện |

Gợi ý thứ tự trình bày: bài toán → vì sao cần blockchain → kiến trúc → demo chuyển tài sản → test/gas → giới hạn. Khi nộp repo, kiểm tra không đưa `.env`, private key, backup nội dung riêng tư hay log ví Hardhat vào Git. Chỉ công bố video và bằng chứng đã rà soát của nhóm.
