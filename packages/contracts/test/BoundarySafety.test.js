const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
describe('TrustChain boundary and negative scenarios', function () {
  async function fixture() {
    const [owner, seller, buyer, outsider] = await ethers.getSigners();
    const nft = await (await ethers.getContractFactory('MarketplaceNFT')).deploy(owner.address);
    const fees = await (await ethers.getContractFactory('FeeManager')).deploy(owner.address, 250, owner.address);
    const escrow = await (await ethers.getContractFactory('Escrow')).deploy(owner.address, nft.target, fees.target);
    const market = await (await ethers.getContractFactory('Marketplace')).deploy(owner.address, nft.target, escrow.target);
    const reputation = await (await ethers.getContractFactory('Reputation')).deploy(owner.address);
    const dispute = await (await ethers.getContractFactory('DisputeResolution')).deploy(owner.address, escrow.target, reputation.target);
    await escrow.setMarketplace(market.target); await escrow.setDisputeResolution(dispute.target);
    await nft.connect(seller).mintProductNFT(seller.address, 'ipfs://contract-unit-test-fixture');
    await nft.connect(seller).approve(market.target, 1);
    await market.connect(seller).createListing(1, ethers.parseEther('1'));
    return { owner, seller, buyer, outsider, nft, fees, escrow, market, dispute };
  }
  it('rejects a purchase after NFT approval is revoked, preserving payment and listing state', async () => {
    const { nft, seller, buyer, market, escrow } = await loadFixture(fixture);
    await nft.connect(seller).approve(ethers.ZeroAddress, 1);
    await expect(market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') })).to.be.reverted;
    expect((await market.getListing(1)).status).to.equal(1);
    expect(await ethers.provider.getBalance(escrow.target)).to.equal(0);
    expect(await nft.ownerOf(1)).to.equal(seller.address);
  });
  it('rejects stale listings after the NFT is transferred to another owner', async () => {
    const { nft, seller, buyer, outsider, market, escrow } = await loadFixture(fixture);
    await nft.connect(seller).transferFrom(seller.address, outsider.address, 1);
    await expect(market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') })).to.be.reverted;
    expect(await nft.ownerOf(1)).to.equal(outsider.address);
    expect(await ethers.provider.getBalance(escrow.target)).to.equal(0);
  });
  it('blocks third-party cancellation and non-owner pause', async () => {
    const { market, outsider } = await loadFixture(fixture);
    await expect(market.connect(outsider).cancelListing(1)).to.be.revertedWithCustomError(market, 'Unauthorized');
    await expect(market.connect(outsider).pause()).to.be.revertedWithCustomError(market, 'OwnableUnauthorizedAccount');
  });
  it('blocks purchases while paused and after cancellation', async () => {
    const { market, buyer, seller } = await loadFixture(fixture);
    await market.pause();
    await expect(market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') })).to.be.revertedWithCustomError(market, 'EnforcedPause');
    await market.unpause(); await market.connect(seller).cancelListing(1);
    await expect(market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') })).to.be.revertedWithCustomError(market, 'ListingNotActive');
  });
  it('rejects empty dispute evidence and unrelated parties', async () => {
    const { market, buyer, outsider, dispute } = await loadFixture(fixture);
    await market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') });
    await expect(dispute.connect(buyer).openDispute(1, ethers.ZeroHash)).to.be.revertedWithCustomError(dispute, 'InvalidParameters');
    await expect(dispute.connect(outsider).openDispute(1, ethers.id('evidence'))).to.be.revertedWithCustomError(dispute, 'Unauthorized');
  });
  it('blocks buyer-initiated refunds and disputes after settlement', async () => {
    const { market, buyer, escrow, dispute } = await loadFixture(fixture);
    await market.connect(buyer).buyItem(1, { value: ethers.parseEther('1') });
    await expect(escrow.connect(buyer).refundBuyer(1)).to.be.revertedWithCustomError(escrow, 'Unauthorized');
    await escrow.connect(buyer).confirmDeliveryAndRelease(1);
    await expect(dispute.connect(buyer).openDispute(1, ethers.id('late evidence'))).to.be.revertedWithCustomError(escrow, 'InvalidState');
  });
});
