# Báo cáo gas TrustChain

Đo lúc 2026-10-12T03:35:29.410Z trên **Hardhat local cô lập**, không phải Sepolia. Solidity 0.8.28, Cancun, viaIR, optimizer 200 runs. Các giá trị lấy từ receipt giao dịch thực thi thành công.

Lặp lại: chạy IPFS rồi `npm.cmd run report:gas`. Script không ghi đè manifest deployment đang dùng bởi web.

Metadata IPFS thật: `ipfs://bafkreifkvj53brtkvkekqveqegepts5t47el375oyro3lxjyxffhxewb6m`, 159 bytes. Mint với URI/độ dài khác, storage lần đầu hay đã có, và compiler khác có thể thay đổi gas.

| Thao tác | Gas used | Gas price (wei) | Phí thực thi local (ETH) |
|---|---:|---:|---:|
| deploy.MarketplaceNFT | 1283117 | 1875000000 | 0.002405844375 |
| deploy.FeeManager | 376419 | 1770303031 | 0.000666375696625989 |
| deploy.Escrow | 1537034 | 1675223306 | 0.002574875178914404 |
| deploy.Marketplace | 863445 | 1595144731 | 0.001377319742258295 |
| deploy.Reputation | 446110 | 1522892785 | 0.00067937770031635 |
| deploy.DisputeResolution | 1060746 | 1458503136 | 0.001547101367499456 |
| sale.mint | 168699 | 1181211466 | 0.000199269193102734 |
| sale.approve | 48335 | 1158687409 | 0.000056005155914015 |
| sale.list | 154470 | 1138883442 | 0.00017592332528574 |
| sale.buy | 256569 | 1121612401 | 0.000287770972112169 |
| sale.release | 228470 | 1106540860 | 0.0002528113902842 |
| cancel.mint | 168699 | 1093324675 | 0.000184442779347825 |
| cancel.approve | 48335 | 1081724690 | 0.00005228516289115 |
| cancel.list | 154470 | 1071525563 | 0.00016551855371661 |
| cancel.listing | 32559 | 1062630904 | 0.000034598199603336 |
| refund.mint | 151599 | 1054810538 | 0.000159908222750262 |
| refund.approve | 48335 | 1047993843 | 0.000050654782401405 |
| refund.list | 154470 | 1042004279 | 0.00016095840097713 |
| refund.buy | 261369 | 1036780780 | 0.00027098235568782 |
| refund.voluntary | 70622 | 1032223239 | 0.000072897669584658 |
| disputeRefund.mint | 151599 | 1028204817 | 0.000155874822052383 |
| disputeRefund.approve | 48335 | 1024697031 | 0.000049528730993385 |
| disputeRefund.list | 154470 | 1021614877 | 0.00015780885005019 |
| disputeRefund.buy | 261369 | 1018926930 | 0.00026631591276717 |
| disputeRefund.open | 148138 | 1016581676 | 0.000150594376319288 |
| disputeRefund.evidence | 67895 | 1014519202 | 0.00006888078121979 |
| disputeRefund.review | 52453 | 1012708410 | 0.00005311959422973 |
| disputeRefund.resolve | 151759 | 1011122637 | 0.000153446960268483 |
| disputeRelease.mint | 151599 | 1009739341 | 0.000153075474356259 |
| disputeRelease.approve | 48335 | 1008528076 | 0.00004874720455346 |
| disputeRelease.list | 154470 | 1007463785 | 0.00015562293086895 |
| disputeRelease.buy | 261369 | 1006535616 | 0.000263077207418304 |
| disputeRelease.open | 148138 | 1005725782 | 0.000148986205893916 |
| disputeRelease.evidence | 67895 | 1005013594 | 0.00006823539796463 |
| disputeRelease.review | 52453 | 1004388314 | 0.000052683180234242 |
| disputeRelease.resolve | 169805 | 1003840734 | 0.00017045717583687 |

**Công thức:** phí gas = gasUsed × effectiveGasPrice. Phí giao thức 2,5% là khoản khác: đơn 0,2 ETH trả người bán 0,195 ETH và treasury 0,005 ETH; người gửi giao dịch còn chịu gas. Script kiểm tra chính các biến động số dư này.

Không quy đổi ra VND/USD, không dùng gas price local để dự báo phí testnet/mainnet. Chưa tính transaction cấu hình role/địa chỉ sau deploy vào tổng triển khai. Chi phí IPFS, server và database là off-chain. Đây là một lần đo, không phải benchmark tải hoặc audit. Tx hash trong JSON chỉ thuộc chain thử nghiệm tạm thời của lần chạy, không tra trên explorer công khai.

Dữ liệu máy đọc: [gas-report.json](evidence/gas-report.json).
