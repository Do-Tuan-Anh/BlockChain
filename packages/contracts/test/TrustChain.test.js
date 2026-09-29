const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustChain Comprehensive Smart Contract Test Suite", function () {
  let nft, feeManager, escrow, marketplace, reputation, disputeResolution;
  let owner, seller, buyer, feeRecipient, arbitrator, attacker;

  const INITIAL_FEE_BPS = 250; // 2.5%
  const SAMPLE_METADATA_URI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/metadata.json";
  const ITEM_PRICE = ethers.parseEther("1.0"); // 1 ETH
  const SAMPLE_EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes("Damaged package on delivery photo proof"));
  const SAMPLE_REBUTTAL_HASH = ethers.keccak256(ethers.toUtf8Bytes("FedEx courier delivery slip signed by buyer"));

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient, arbitrator, attacker] = await ethers.getSigners();

    // 1. Deploy MarketplaceNFT
    const NFTFactory = await ethers.getContractFactory("MarketplaceNFT");
    nft = await NFTFactory.deploy(owner.address);
    await nft.waitForDeployment();

    // 2. Deploy FeeManager
    const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
    feeManager = await FeeManagerFactory.deploy(owner.address, INITIAL_FEE_BPS, feeRecipient.address);
    await feeManager.waitForDeployment();

    // 3. Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(
      owner.address,
      await nft.getAddress(),
      await feeManager.getAddress()
    );
    await escrow.waitForDeployment();

    // 4. Deploy Marketplace
    const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
    marketplace = await MarketplaceFactory.deploy(
      owner.address,
      await nft.getAddress(),
      await escrow.getAddress()
    );
    await marketplace.waitForDeployment();

    // 5. Deploy Reputation
    const ReputationFactory = await ethers.getContractFactory("Reputation");
    reputation = await ReputationFactory.deploy(owner.address);
    await reputation.waitForDeployment();

    // 6. Deploy DisputeResolution
    const DisputeFactory = await ethers.getContractFactory("DisputeResolution");
    disputeResolution = await DisputeFactory.deploy(
      owner.address,
      await escrow.getAddress(),
      await reputation.getAddress()
    );
    await disputeResolution.waitForDeployment();

    // 7. Configure Integrations & Authorizations
    await escrow.connect(owner).setMarketplace(await marketplace.getAddress());
    await escrow.connect(owner).setDisputeResolution(await disputeResolution.getAddress());
    await escrow.connect(owner).setReputation(await reputation.getAddress());

    // Authorize Escrow and DisputeResolution in Reputation
    await reputation.connect(owner).setCallerAuthorization(await escrow.getAddress(), true);
    await reputation.connect(owner).setCallerAuthorization(await disputeResolution.getAddress(), true);

    // Grant ARBITRATOR_ROLE to arbitrator signer
    const ARBITRATOR_ROLE = await disputeResolution.ARBITRATOR_ROLE();
    await disputeResolution.connect(owner).grantRole(ARBITRATOR_ROLE, arbitrator.address);
  });

  describe("1. Reputation System & Sybil Resistance", function () {
    it("Should prevent unauthorized callers from altering reputation", async function () {
      await expect(
        reputation.connect(attacker).recordSuccessfulTrade(seller.address, buyer.address, ITEM_PRICE)
      ).to.be.revertedWithCustomError(reputation, "UnauthorizedCaller");
    });

    it("Should record verified trades and volume through Escrow delivery confirmation", async function () {
      // Setup order: mint -> list -> buy
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });

      // Confirm delivery
      await escrow.connect(buyer).confirmDeliveryAndRelease(1);

      // Verify seller on-chain reputation updated
      const sellerRep = await reputation.getReputation(seller.address);
      expect(sellerRep.successfulTradesCount).to.equal(1);
      expect(sellerRep.completedDeliveriesCount).to.equal(1);
      expect(sellerRep.totalVolumeWei).to.equal(ITEM_PRICE);

      // Verify buyer on-chain reputation updated
      const buyerRep = await reputation.getReputation(buyer.address);
      expect(buyerRep.successfulTradesCount).to.equal(1);
      expect(buyerRep.totalVolumeWei).to.equal(ITEM_PRICE);
    });
  });

  describe("2. Dispute Resolution & Evidence Hashing", function () {
    beforeEach(async function () {
      // Mint, list, buy item
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });
    });

    it("Should allow buyer to open a dispute with cryptographic evidence hash", async function () {
      const tx = await disputeResolution.connect(buyer).openDispute(1, SAMPLE_EVIDENCE_HASH);
      await expect(tx)
        .to.emit(disputeResolution, "DisputeOpened")
        .withArgs(1, buyer.address, SAMPLE_EVIDENCE_HASH);

      const dispute = await disputeResolution.getDispute(1);
      expect(dispute.openedBy).to.equal(buyer.address);
      expect(dispute.buyerEvidenceHash).to.equal(SAMPLE_EVIDENCE_HASH);
      expect(dispute.state).to.equal(1); // DisputeState.OPEN

      // Verify Escrow is frozen in DISPUTED state
      const escrowDeposit = await escrow.getEscrow(1);
      expect(escrowDeposit.state).to.equal(4); // EscrowState.DISPUTED
    });

    it("Should allow seller to submit rebuttal evidence hash", async function () {
      await disputeResolution.connect(buyer).openDispute(1, SAMPLE_EVIDENCE_HASH);

      const tx = await disputeResolution.connect(seller).submitEvidence(1, SAMPLE_REBUTTAL_HASH);
      await expect(tx)
        .to.emit(disputeResolution, "EvidenceSubmitted")
        .withArgs(1, seller.address, SAMPLE_REBUTTAL_HASH);

      const dispute = await disputeResolution.getDispute(1);
      expect(dispute.sellerEvidenceHash).to.equal(SAMPLE_REBUTTAL_HASH);
    });

    it("Should allow authorized arbitrator to rule in favor of Buyer (Refund)", async function () {
      await disputeResolution.connect(buyer).openDispute(1, SAMPLE_EVIDENCE_HASH);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      // Arbitrator rules REFUND_BUYER (ruling = 1)
      const tx = await disputeResolution.connect(arbitrator).resolveDispute(1, 1);
      await expect(tx)
        .to.emit(disputeResolution, "DisputeResolved")
        .withArgs(1, 1, arbitrator.address);

      // Verify buyer received 100% refund
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(ITEM_PRICE);

      // Verify NFT returned to seller
      expect(await nft.ownerOf(1)).to.equal(seller.address);

      // Verify dispute record
      const dispute = await disputeResolution.getDispute(1);
      expect(dispute.state).to.equal(3); // RESOLVED_BUYER

      // Verify seller penalized with dispute lost
      const sellerRep = await reputation.getReputation(seller.address);
      expect(sellerRep.disputesLost).to.equal(1);

      // Verify buyer logged dispute won
      const buyerRep = await reputation.getReputation(buyer.address);
      expect(buyerRep.disputesWon).to.equal(1);
    });

    it("Should allow authorized arbitrator to rule in favor of Seller (Release)", async function () {
      await disputeResolution.connect(buyer).openDispute(1, SAMPLE_EVIDENCE_HASH);

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      // Arbitrator rules RELEASE_SELLER (ruling = 2)
      await disputeResolution.connect(arbitrator).resolveDispute(1, 2);

      // Seller receives net proceeds (1.0 ETH - 2.5% fee = 0.975 ETH)
      const expectedNet = ethers.parseEther("0.975");
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedNet);

      // Buyer receives NFT
      expect(await nft.ownerOf(1)).to.equal(buyer.address);

      // Verify buyer penalized with frivolous dispute loss
      const buyerRep = await reputation.getReputation(buyer.address);
      expect(buyerRep.disputesLost).to.equal(1);
    });

    it("Should prevent non-arbitrators from resolving disputes", async function () {
      await disputeResolution.connect(buyer).openDispute(1, SAMPLE_EVIDENCE_HASH);

      await expect(
        disputeResolution.connect(attacker).resolveDispute(1, 1)
      ).to.be.revertedWithCustomError(disputeResolution, "AccessControlUnauthorizedAccount");
    });
  });
});

