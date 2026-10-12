const { ethers, network } = require('hardhat');
const { main: deploy } = require('./deploy');
const { pinBytes } = require('../../../apps/web/src/lib/ipfs.cjs');
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
async function main() {
  if (network.name !== 'hardhat') throw new Error('Gas report must use the isolated hardhat network, never the active demo chain.');
  const [owner, treasury, arbitrator, seller, buyer] = await ethers.getSigners();
  process.env.TREASURY_ADDRESS = treasury.address;
  process.env.ARBITRATOR_ADDRESS = arbitrator.address;
  const instances = await deploy({ writeFiles: false });
  const { MarketplaceNFT: nft, Marketplace: market, Escrow: escrow, DisputeResolution: disputes } = instances;
  const measurements = [];
  async function measure(label, tx) {
    const receipt = await (await tx).wait();
    assert.equal(receipt.status, 1);
    measurements.push({ label, gasUsed: receipt.gasUsed.toString(), gasPriceWei: receipt.gasPrice.toString(), feeWei: receipt.fee.toString(), txHash: receipt.hash, blockNumber: receipt.blockNumber });
    return receipt;
  }
  for (const [name, instance] of Object.entries(instances)) await measure(`deploy.${name}`, instance.deploymentTransaction());
  const metadata = Buffer.from(JSON.stringify({ name: 'TrustChain gas benchmark', description: 'Public reproducible benchmark metadata', attributes: [{ trait_type: 'purpose', value: 'academic-benchmark' }] }));
  const uri = await pinBytes(metadata);
  let token = 0, listing = 0, order = 0;
  async function create(label) {
    token++; listing++;
    await measure(`${label}.mint`, nft.connect(seller).mintProductNFT(seller.address, uri));
    await measure(`${label}.approve`, nft.connect(seller).approve(market.target, token));
    await measure(`${label}.list`, market.connect(seller).createListing(token, ethers.parseEther('0.2')));
  }
  async function buy(label) {
    order++;
    await measure(`${label}.buy`, market.connect(buyer).buyItem(listing, { value: ethers.parseEther('0.2') }));
    assert.equal(await nft.ownerOf(token), escrow.target);
  }
  await create('sale'); await buy('sale');
  const sellerBefore = await ethers.provider.getBalance(seller.address), treasuryBefore = await ethers.provider.getBalance(treasury.address);
  await measure('sale.release', escrow.connect(buyer).confirmDeliveryAndRelease(order));
  assert.equal(await nft.ownerOf(token), buyer.address);
  assert.equal((await ethers.provider.getBalance(seller.address)) - sellerBefore, ethers.parseEther('0.195'));
  assert.equal((await ethers.provider.getBalance(treasury.address)) - treasuryBefore, ethers.parseEther('0.005'));
  await create('cancel'); await measure('cancel.listing', market.connect(seller).cancelListing(listing));
  await create('refund'); await buy('refund');
  await measure('refund.voluntary', escrow.connect(seller).refundBuyer(order));
  assert.equal(await nft.ownerOf(token), seller.address);
  for (const ruling of [1, 2]) {
    const label = ruling === 1 ? 'disputeRefund' : 'disputeRelease';
    await create(label); await buy(label);
    await measure(`${label}.open`, disputes.connect(buyer).openDispute(order, ethers.id('Buyer evidence')));
    await measure(`${label}.evidence`, disputes.connect(seller).submitEvidence(order, ethers.id('Seller evidence')));
    await measure(`${label}.review`, disputes.connect(arbitrator).markUnderReview(order));
    await measure(`${label}.resolve`, disputes.connect(arbitrator).resolveDispute(order, ruling));
    assert.equal(await nft.ownerOf(token), ruling === 1 ? seller.address : buyer.address);
  }
  const result = { generatedAt: new Date().toISOString(), network: 'isolated Hardhat (not Sepolia)', chainId: 31337, compiler: '0.8.28', evmVersion: 'cancun', viaIR: true, optimizerRuns: 200, metadataUri: uri, metadataBytes: metadata.length, measurements };
  const docs = path.resolve(__dirname, '../../../docs'); fs.mkdirSync(path.join(docs, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(docs, 'evidence/gas-report.json'), JSON.stringify(result, null, 2) + '\n');
  const rows = measurements.map(m => `| ${m.label} | ${m.gasUsed} | ${m.gasPriceWei} | ${ethers.formatEther(m.feeWei)} |`).join('\n');
  fs.writeFileSync(path.join(docs, 'GAS_REPORT.md'), `# Báo cáo gas TrustChain\n\nĐo lúc ${result.generatedAt} trên **Hardhat local cô lập**, không phải Sepolia. Solidity 0.8.28, Cancun, viaIR, optimizer 200 runs. Các giá trị lấy từ receipt giao dịch thực thi thành công.\n\nLặp lại: chạy IPFS rồi \`npm.cmd run report:gas\`. Script không ghi đè manifest deployment đang dùng bởi web.\n\nMetadata IPFS thật: \`${uri}\`, ${metadata.length} bytes. Mint với URI/độ dài khác, storage lần đầu hay đã có, và compiler khác có thể thay đổi gas.\n\n| Thao tác | Gas used | Gas price (wei) | Phí thực thi local (ETH) |\n|---|---:|---:|---:|\n${rows}\n\n**Công thức:** phí gas = gasUsed × effectiveGasPrice. Phí giao thức 2,5% là khoản khác: đơn 0,2 ETH trả người bán 0,195 ETH và treasury 0,005 ETH; người gửi giao dịch còn chịu gas. Script kiểm tra chính các biến động số dư này.\n\nKhông quy đổi ra VND/USD, không dùng gas price local để dự báo phí testnet/mainnet. Chưa tính transaction cấu hình role/địa chỉ sau deploy vào tổng triển khai. Chi phí IPFS, server và database là off-chain. Đây là một lần đo, không phải benchmark tải hoặc audit. Tx hash trong JSON chỉ thuộc chain thử nghiệm tạm thời của lần chạy, không tra trên explorer công khai.\n\nDữ liệu máy đọc: [gas-report.json](evidence/gas-report.json).\n`);
  console.log(`Saved ${measurements.length} receipts to docs/GAS_REPORT.md and docs/evidence/gas-report.json`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
