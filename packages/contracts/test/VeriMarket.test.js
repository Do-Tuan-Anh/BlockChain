const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriMarket Smart Contract Suite - Core Architecture Tests", function () {
  let nft, feeManager, escrow, marketplace;
  let owner, seller, buyer, feeRecipient, attacker;

  const INITIAL_FEE_BPS = 250; // 2.5%
  const SAMPLE_METADATA_URI = "ipfs://QmProductMetadataHash123456789";
  const ITEM_PRICE = ethers.parseEther("1.0"); // 1 ETH

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient, attacker] = await ethers.getSigners();

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

    // 5. Authorize Marketplace in Escrow
    await escrow.connect(owner).setMarketplace(await marketplace.getAddress());
  });

  describe("1. MarketplaceNFT Minting & Verifiable Metadata", function () {
    it("Should allow seller to mint an NFT certificate linked to IPFS metadata", async function () {
      const tx = await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await expect(tx)
        .to.emit(nft, "ProductNFTMinted")
        .withArgs(1, seller.address, SAMPLE_METADATA_URI);

      expect(await nft.ownerOf(1)).to.equal(seller.address);
      expect(await nft.tokenURI(1)).to.equal(SAMPLE_METADATA_URI);
    });

    it("Should revert if metadata URI is empty", async function () {
      await expect(
        nft.connect(seller).mintProductNFT(seller.address, "")
      ).to.be.revertedWithCustomError(nft, "EmptyMetadataURI");
    });
  });

  describe("2. Marketplace Listing & Price Validation", function () {
    beforeEach(async function () {
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
    });

    it("Should create active listing when token is approved", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);

      const tx = await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await expect(tx)
        .to.emit(marketplace, "ListingCreated")
        .withArgs(1, 1, seller.address, ITEM_PRICE);

      const listing = await marketplace.getListing(1);
      expect(listing.tokenId).to.equal(1);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(ITEM_PRICE);
      expect(listing.status).to.equal(1); // ACTIVE
    });

    it("Should revert if seller tries to list without approval", async function () {
      await expect(
        marketplace.connect(seller).createListing(1, ITEM_PRICE)
      ).to.be.revertedWithCustomError(marketplace, "NotApprovedForMarketplace");
    });

    it("Should allow seller to cancel an active listing", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);

      await expect(marketplace.connect(seller).cancelListing(1))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(1, seller.address);

      const listing = await marketplace.getListing(1);
      expect(listing.status).to.equal(2); // CANCELLED
    });
  });

  describe("3. Atomic Purchase & Escrow Locking", function () {
    beforeEach(async function () {
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
    });

    it("Should atomically lock payment and transfer NFT to Escrow contract upon purchase", async function () {
      const tx = await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });

      await expect(tx)
        .to.emit(marketplace, "ItemPurchased")
        .withArgs(1, 1, 1, buyer.address, seller.address, ITEM_PRICE);

      // NFT must now be held by Escrow contract
      expect(await nft.ownerOf(1)).to.equal(await escrow.getAddress());

      // Listing must be SOLD
      const listing = await marketplace.getListing(1);
      expect(listing.status).to.equal(3); // SOLD

      // Escrow state must be HELD
      const deposit = await escrow.getEscrow(1);
      expect(deposit.amount).to.equal(ITEM_PRICE);
      expect(deposit.buyer).to.equal(buyer.address);
      expect(deposit.seller).to.equal(seller.address);
      expect(deposit.state).to.equal(1); // HELD
    });

    it("Should reject purchase if value does not match exact price", async function () {
      const invalidPrice = ethers.parseEther("0.5");
      await expect(
        marketplace.connect(buyer).buyItem(1, { value: invalidPrice })
      ).to.be.revertedWithCustomError(marketplace, "IncorrectPayment");
    });

    it("Should prevent seller from buying their own listing", async function () {
      await expect(
        marketplace.connect(seller).buyItem(1, { value: ITEM_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "CannotBuyOwnListing");
    });
  });

  describe("4. Delivery Confirmation, Fee Distribution & Escrow Release", function () {
    beforeEach(async function () {
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });
    });

    it("Should release 97.5% net to seller, 2.5% fee to FeeRecipient, and transfer NFT to buyer upon confirmation", async function () {
      const sellerInitialBal = await ethers.provider.getBalance(seller.address);
      const feeInitialBal = await ethers.provider.getBalance(feeRecipient.address);

      const tx = await escrow.connect(buyer).confirmDeliveryAndRelease(1);

      const expectedFee = (ITEM_PRICE * 250n) / 10000n; // 0.025 ETH
      const expectedNet = ITEM_PRICE - expectedFee;       // 0.975 ETH

      await expect(tx)
        .to.emit(escrow, "EscrowReleased")
        .withArgs(1, seller.address, buyer.address, expectedNet, expectedFee);

      // Verify NFT is now owned by Buyer
      expect(await nft.ownerOf(1)).to.equal(buyer.address);

      // Verify Balances
      const sellerFinalBal = await ethers.provider.getBalance(seller.address);
      const feeFinalBal = await ethers.provider.getBalance(feeRecipient.address);

      expect(sellerFinalBal - sellerInitialBal).to.equal(expectedNet);
      expect(feeFinalBal - feeInitialBal).to.equal(expectedFee);

      // Escrow state updated to RELEASED
      const deposit = await escrow.getEscrow(1);
      expect(deposit.state).to.equal(2); // RELEASED
    });

    it("Should prevent double-release attacks", async function () {
      await escrow.connect(buyer).confirmDeliveryAndRelease(1);

      await expect(
        escrow.connect(buyer).confirmDeliveryAndRelease(1)
      ).to.be.revertedWithCustomError(escrow, "InvalidState");
    });

    it("Should reject release attempt from unauthorized third party", async function () {
      await expect(
        escrow.connect(attacker).confirmDeliveryAndRelease(1)
      ).to.be.revertedWithCustomError(escrow, "Unauthorized");
    });

    it("Should revert claimTimeoutRelease if 14-day auto-release period has not elapsed", async function () {
      await expect(
        escrow.connect(seller).claimTimeoutRelease(1)
      ).to.be.revertedWithCustomError(escrow, "AutoReleasePeriodNotElapsed");
    });

    it("Should allow seller to claim escrow funds after 14-day inspection window has elapsed", async function () {
      // Fast-forward EVM time by 14 days + 1 second
      await ethers.provider.send("evm_increaseTime", [14 * 24 * 3600 + 1]);
      await ethers.provider.send("evm_mine");

      const tx = await escrow.connect(seller).claimTimeoutRelease(1);
      const expectedFee = (ITEM_PRICE * 250n) / 10000n;
      const expectedNet = ITEM_PRICE - expectedFee;

      await expect(tx)
        .to.emit(escrow, "EscrowReleased")
        .withArgs(1, seller.address, buyer.address, expectedNet, expectedFee);

      // Verify NFT is transferred to Buyer and Escrow is RELEASED
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      const deposit = await escrow.getEscrow(1);
      expect(deposit.state).to.equal(2); // RELEASED
    });
  });

  describe("5. Order Cancellation & Buyer Refund", function () {
    beforeEach(async function () {
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });
    });

    it("Should refund 100% to buyer and return NFT to seller on cancellation", async function () {
      const buyerInitialBal = await ethers.provider.getBalance(buyer.address);

      const tx = await escrow.connect(seller).refundBuyer(1);
      await expect(tx)
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(1, buyer.address, seller.address, ITEM_PRICE);

      // NFT returned to Seller
      expect(await nft.ownerOf(1)).to.equal(seller.address);

      // Buyer receives full 1.0 ETH refund
      const buyerFinalBal = await ethers.provider.getBalance(buyer.address);
      expect(buyerFinalBal - buyerInitialBal).to.equal(ITEM_PRICE);

      // Escrow state updated to REFUNDED
      const deposit = await escrow.getEscrow(1);
      expect(deposit.state).to.equal(3); // REFUNDED
    });
  });

  describe("6. Dispute Resolution via Centralized Admin Arbitration", function () {
    beforeEach(async function () {
      await nft.connect(seller).mintProductNFT(seller.address, SAMPLE_METADATA_URI);
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(1, ITEM_PRICE);
      await marketplace.connect(buyer).buyItem(1, { value: ITEM_PRICE });
    });

    it("Should allow buyer to open dispute, freezing escrow until admin resolves for buyer", async function () {
      await expect(escrow.connect(buyer).openDispute(1))
        .to.emit(escrow, "EscrowDisputeOpened")
        .withArgs(1, buyer.address);

      let deposit = await escrow.getEscrow(1);
      expect(deposit.state).to.equal(4); // DISPUTED

      // Admin resolves in favor of Buyer (item damaged or not received)
      const buyerInitialBal = await ethers.provider.getBalance(buyer.address);
      await expect(escrow.connect(owner).resolveDispute(1, true))
        .to.emit(escrow, "EscrowDisputeResolved")
        .withArgs(1, true, owner.address);

      expect(await nft.ownerOf(1)).to.equal(seller.address); // Returned to seller
      const buyerFinalBal = await ethers.provider.getBalance(buyer.address);
      expect(buyerFinalBal - buyerInitialBal).to.equal(ITEM_PRICE);
    });

    it("Should allow admin to resolve dispute in favor of seller", async function () {
      await escrow.connect(buyer).openDispute(1);

      // Admin resolves in favor of Seller (carrier proved item was delivered)
      await expect(escrow.connect(owner).resolveDispute(1, false))
        .to.emit(escrow, "EscrowDisputeResolved")
        .withArgs(1, false, owner.address);

      expect(await nft.ownerOf(1)).to.equal(buyer.address); // Delivered to buyer
      const deposit = await escrow.getEscrow(1);
      expect(deposit.state).to.equal(2); // RELEASED
    });
  });
});

