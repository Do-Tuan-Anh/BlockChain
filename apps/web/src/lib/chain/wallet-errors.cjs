const { Interface } = require('ethers');
const abis = require('./abis.json');
const interfaces = Object.values(abis).map(abi => new Interface(abi));

function escrowActionError(state) {
  if (Number(state) === 2) return 'ORDER_ALREADY_RELEASED';
  if (Number(state) === 3) return 'ORDER_ALREADY_REFUNDED';
  return null;
}

function transactionErrorMessage(error, vi = true) {
  const e = error || {};
  const nested = e.info?.error || e.error || e.cause || {};
  const text = [e.message, e.shortMessage, nested.message].filter(Boolean).join(' ');
  const code = e.code;
  const messages = {
    CHAIN_RPC_UNAVAILABLE: ['Blockchain chưa chạy. Mở Docker Desktop rồi chạy npm run demo:up.', 'Blockchain offline. Start Docker Desktop and run npm run demo:up.'],
    WRONG_RPC_CHAIN: ['RPC đang trỏ sai mạng. Kiểm tra TrustChain Local và Chain ID 31337 trước khi thử lại.', 'RPC is connected to the wrong network. Check TrustChain Local and Chain ID 31337 before retrying.'],
    PRODUCT_STORAGE_UNAVAILABLE: ['Chưa đọc hoặc ghim được ảnh/metadata trên IPFS. Kiểm tra dịch vụ IPFS rồi thử lại; bản nháp vẫn được giữ.', 'Could not read or pin the product image/metadata on IPFS. Check IPFS and retry; your draft is preserved.'],
    METADATA_PREPARATION_FAILED: ['Chưa chuẩn bị được dữ liệu NFT. Bản nháp vẫn được giữ; hãy đồng bộ rồi thử lại.', 'Could not prepare NFT metadata. Your draft is preserved; sync and retry.'],
    CHAIN_RESET_REDEPLOY_REQUIRED: ['Blockchain không khớp bản triển khai đã lưu. Chạy npm run demo:up để kiểm tra; không reset dữ liệu.', 'Blockchain deployment mismatch. Run npm run demo:up; do not reset data.'],
    ORDER_ALREADY_RELEASED: ['Đơn này đã giải ngân và chuyển NFT cho người mua. Không cần xác nhận lần nữa.', 'This order has already released payment and transferred the NFT. No further confirmation is needed.'],
    ORDER_ALREADY_REFUNDED: ['Đơn này đã hoàn tiền. Không thể giải ngân lại.', 'This order has already been refunded and cannot be released.'],
    LINK_THIS_WALLET_FIRST: ['Account MetaMask đang chọn không khớp ví đã liên kết. Chọn đúng account của tài khoản đang đăng nhập.', 'Select the MetaMask account linked to the signed-in user.'],
    TRANSACTION_REVERTED: ['Giao dịch bị hợp đồng từ chối. Dữ liệu đã được đồng bộ lại; kiểm tra trạng thái đơn trước khi thử tiếp.', 'The contract reverted the transaction. State has been refreshed; check the order before retrying.'],
  };
  for (const [key, value] of Object.entries(messages)) if (text.includes(key)) return value[vi ? 0 : 1];
  if (code === 4001 || code === 'ACTION_REJECTED' || nested.code === 4001) return vi ? 'Bạn đã từ chối yêu cầu trong ví.' : 'Request rejected in wallet.';
  if (code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(text)) return vi ? 'Ví không đủ ETH để trả giá sản phẩm và phí gas.' : 'Not enough ETH for the item price and gas.';
  if (code === 'NONCE_EXPIRED' || /nonce too low|nonce too high|incorrect nonce|replacement transaction underpriced/i.test(text)) return vi ? 'Số thứ tự giao dịch (nonce) trong MetaMask không khớp blockchain. Kiểm tra Activity và giao dịch đang chờ; không bấm xác nhận liên tục.' : 'MetaMask transaction nonce does not match the blockchain. Check Activity and pending transactions before retrying.';
  const data = e.data || nested.data;
  if (typeof data === 'string') {
    for (const iface of interfaces) {
      let parsed;
      try { parsed = iface.parseError(data); } catch { continue; }
      if (!parsed) continue;
      if (parsed.name === 'InvalidState') {
        const key = escrowActionError(parsed.args[0]);
        if (key) return transactionErrorMessage(new Error(key), vi);
      }
      if (parsed.name === 'Unauthorized' || parsed.name === 'ERC721IncorrectOwner') return vi ? 'Ví đang chọn không có quyền thực hiện thao tác này. Kiểm tra ví người mua/người bán.' : 'The selected wallet is not authorized. Check the buyer/seller account.';
      return vi ? `Hợp đồng từ chối: ${parsed.name}. Hãy đồng bộ và kiểm tra trạng thái hiện tại.` : `Contract rejected: ${parsed.name}. Sync and check the current state.`;
    }
  }
  if (e.receipt?.status === 0) return transactionErrorMessage(new Error('TRANSACTION_REVERTED'), vi);
  return e.shortMessage || e.message || (vi ? 'Chưa hoàn tất giao dịch. Kiểm tra Activity trong MetaMask để xem chi tiết.' : 'Transaction not completed. Check MetaMask Activity for details.');
}

module.exports = { escrowActionError, transactionErrorMessage };
