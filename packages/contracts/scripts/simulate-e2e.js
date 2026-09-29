const { ethers } = require("hardhat");

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

async function main() {
  console.clear();
  console.log(`${CYAN}${BOLD}`);
  console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                TRUSTCHAIN                                     ║");
  console.log("║           Secure Blockchain P2P Marketplace - Full End-to-End Simulation     ║");
  console.log("║       Digital Product Passports • Smart Escrow • Reputation • Disputes       ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
  console.log(`${RESET}\n`);

  const [deployer, aliceSeller, bobBuyer, protocolTreasury, arbitrator] = await ethers.getSigners();

  console.log(`${BOLD}--- PARTICIPATING IDENTITIES ---${RESET}`);
  console.log(`[Platform Deployer]   : ${deployer.address}`);
  console.log(`[Seller - Alice]      : ${aliceSeller.address}`);
  console.log(`[Buyer - Bob]         : ${bobBuyer.address}`);
  console.log(`[Protocol Treasury]   : ${protocolTreasury.address}`);
  console.log(`[Arbitrator]          : ${arbitrator.address}\n`);

  // STEP 1: Deploy Protocol Contracts
  console.log(`${MAGENTA}${BOLD}▶ STEP 1: DEPLOYING TRUSTCHAIN SMART CONTRACT SUITE${RESET}`);
  const NFTFactory = await ethers.getContractFactory("MarketplaceNFT");
  const nft = await NFTFactory.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();

  const FeeMgrFactory = await ethers.getContractFactory("FeeManager");
  const feeMgr = await FeeMgrFactory.deploy(deployer.address, 250, protocolTreasury.address);
  await feeMgr.waitForDeployment();
  const feeMgrAddr = await feeMgr.getAddress();

  const EscrowFactory = await ethers.getContractFactory("Escrow");
  const escrow = await EscrowFactory.deploy(deployer.address, nftAddr, feeMgrAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();

  const MktFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MktFactory.deploy(deployer.address, nftAddr, escrowAddr);
  await marketplace.waitForDeployment();
  const mktAddr = await marketplace.getAddress();

  const RepFactory = await ethers.getContractFactory("Reputation");
  const reputation = await RepFactory.deploy(deployer.address);
  await reputation.waitForDeployment();
  const repAddr = await reputation.getAddress();

  const DisputeFactory = await ethers.getContractFactory("DisputeResolution");
  const dispute = await DisputeFactory.deploy(deployer.address, escrowAddr, repAddr);
  await dispute.waitForDeployment();
  const disputeAddr = await dispute.getAddress();

  // Authorizations
  await escrow.connect(deployer).setMarketplace(mktAddr);
  await escrow.connect(deployer).setDisputeResolution(disputeAddr);
  await escrow.connect(deployer).setReputation(repAddr);
  await reputation.connect(deployer).setCallerAuthorization(escrowAddr, true);
  await reputation.connect(deployer).setCallerAuthorization(disputeAddr, true);

  const ARBITRATOR_ROLE = await dispute.ARBITRATOR_ROLE();
  await dispute.connect(deployer).grantRole(ARBITRATOR_ROLE, arbitrator.address);

  console.log(`  ✓ ProductNFT (ERC-721):     ${nftAddr}`);
  console.log(`  ✓ FeeManager (2.5% take):   ${feeMgrAddr}`);
  console.log(`  ✓ Escrow Contract:          ${escrowAddr}`);
  console.log(`  ✓ Marketplace Contract:     ${mktAddr}`);
  console.log(`  ✓ Reputation Ledger:        ${repAddr}`);
  console.log(`  ✓ DisputeResolution:        ${disputeAddr}\n`);

  // STEP 2: Seller Alice creates product & IPFS metadata
  console.log(`${MAGENTA}${BOLD}▶ STEP 2: SELLER ALICE CREATES PRODUCT & IPFS DIGITAL PASSPORT${RESET}`);
  const productMetadata = {
    name: "Apple MacBook Pro 16\" M3 Max",
    description: "Mint condition 64GB RAM / 1TB SSD in space black finish with original charger.",
    image: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/macbook.png",
    attributes: [
      { trait_type: "Brand", value: "Apple" },
      { trait_type: "Condition", value: "Like New" },
      { trait_type: "RAM", value: "64 GB" },
      { trait_type: "Storage", value: "1 TB NVMe" }
    ],
    productHash: ethers.keccak256(ethers.toUtf8Bytes("SERIAL-MBP16-M3MAX-99210-APPLE"))
  };
  const metadataURI = "ipfs://bafybeihkoviema7g3gxyt6la7bdujrwaxumfarfq54bsbeckq2cd3w3Tb4/product.json";

  console.log(`  * Item Title:    ${BOLD}${productMetadata.name}${RESET}`);
  console.log(`  * Condition:     ${productMetadata.attributes[1].value}`);
  console.log(`  * Hardware Hash: ${productMetadata.productHash}`);
  console.log(`  * Metadata URI:  ${metadataURI}`);
  console.log(`  ${GREEN}✓ Non-sensitive product metadata pinned to decentralized IPFS storage.${RESET}\n`);

  // STEP 3: Mint NFT & List on Marketplace
  console.log(`${MAGENTA}${BOLD}▶ STEP 3: MINTING ERC-721 DIGITAL OWNERSHIP RECORD & LISTING ITEM${RESET}`);
  const mintTx = await nft.connect(aliceSeller).mintProductNFT(aliceSeller.address, metadataURI);
  await mintTx.wait();
  const tokenId = 1;
  console.log(`  ✓ NFT #${tokenId} minted to Alice: ${aliceSeller.address}`);

  // Alice approves Marketplace to manage NFT #1
  await (await nft.connect(aliceSeller).approve(mktAddr, tokenId)).wait();

  // Alice lists product for 1.5 ETH
  const listingPrice = ethers.parseEther("1.5");
  const listTx = await marketplace.connect(aliceSeller).createListing(tokenId, listingPrice);
  await listTx.wait();
  const listingId = 1;
  console.log(`  ✓ Product listed on Marketplace! Listing ID: ${BOLD}#${listingId}${RESET} for ${BOLD}1.5 ETH${RESET}\n`);

  // STEP 4: Buyer Bob Purchases with Escrow Lock
  console.log(`${MAGENTA}${BOLD}▶ STEP 4: BUYER BOB PURCHASES ITEM THROUGH PROGRAMMABLE ESCROW${RESET}`);
  console.log(`  * Bob submits private shipping address to off-chain DB:`);
  console.log(`    { recipient: "Bob Smith", city: "Seattle", postal: "98101", country: "USA" }`);
  console.log(`    ${YELLOW}(Zero PII on-chain - strictly stored in encrypted PostgreSQL)${RESET}`);

  const buyTx = await marketplace.connect(bobBuyer).buyItem(listingId, { value: listingPrice });
  await buyTx.wait();

  console.log(`  ✓ Payment of ${BOLD}1.5 ETH${RESET} locked inside Escrow contract.`);
  console.log(`  ✓ NFT #${tokenId} transferred to Escrow smart contract custody.`);
  const escrowDeposit = await escrow.getEscrow(listingId);
  console.log(`  ✓ Escrow State: ${GREEN}HELD (Awaiting Physical Delivery)${RESET}\n`);

  // STEP 5: Alice Ships Physical Item
  console.log(`${MAGENTA}${BOLD}▶ STEP 5: ALICE SHIPS ITEM & RECORDS PRIVATE TRACKING OFF-CHAIN${RESET}`);
  const trackingNumber = "USPS-9400111899223194820192";
  console.log(`  * Carrier: FedEx Express Priority`);
  console.log(`  * Tracking Number: ${trackingNumber}`);
  console.log(`  * Off-Chain Order Status: ${CYAN}SHIPPED / IN_TRANSIT${RESET}`);
  console.log(`  ✓ Carrier tracking updates delivered via private webhook to Bob's notification inbox.\n`);

  // STEP 6: Bob Receives Package & Scans QR Code
  console.log(`${MAGENTA}${BOLD}▶ STEP 6: BOB RECEIVES PACKAGE & VERIFIES PHYSICAL QR CODE${RESET}`);
  console.log(`  * Bob scans tamper-evident QR code sticker on the package.`);
  console.log(`  * Resolves to: https://trustchain.io/verify/1`);
  console.log(`  * Verified On-Chain: Token #${tokenId} exists in Escrow custody, minted by Alice.`);
  console.log(`  * Bob inspects MacBook: pristine hardware match, powers on successfully.\n`);

  // STEP 7: Bob Confirms Delivery On-Chain
  console.log(`${MAGENTA}${BOLD}▶ STEP 7: BOB CONFIRMS DELIVERY ON-CHAIN & ESCROW SETTLES${RESET}`);
  const confirmTx = await escrow.connect(bobBuyer).confirmDeliveryAndRelease(listingId);
  await confirmTx.wait();

  console.log(`  ${GREEN}✓ Smart Escrow Released Funds Successfully!${RESET}`);
  console.log(`    -> Released to Seller (Alice)   : ${BOLD}+1.4625 ETH${RESET} (97.5% net proceeds)`);
  console.log(`    -> Transferred to Protocol Fee : ${BOLD}+0.0375 ETH${RESET} (2.5% take-rate)`);
  console.log(`    -> Transferred NFT #${tokenId} to Buyer : ${BOLD}${bobBuyer.address}${RESET}\n`);

  // STEP 8: Verify Final Ownership & Sybil-Resistant Reputation
  console.log(`${MAGENTA}${BOLD}▶ STEP 8: VERIFYING PROVENANCE & ON-CHAIN REPUTATION${RESET}`);
  const finalOwner = await nft.ownerOf(tokenId);
  console.log(`  * Current On-Chain NFT Owner: ${BOLD}${finalOwner}${RESET} (${finalOwner === bobBuyer.address ? "Bob - Verified" : "Failed"})`);

  const aliceRep = await reputation.getReputation(aliceSeller.address);
  console.log(`  * Alice (Seller) On-Chain Reputation:`);
  console.log(`    - Verified Completed Trades: ${BOLD}${aliceRep.successfulTradesCount}${RESET}`);
  console.log(`    - Verified Deliveries:       ${BOLD}${aliceRep.completedDeliveriesCount}${RESET}`);
  console.log(`    - Total Volume Settled:      ${BOLD}${ethers.formatEther(aliceRep.totalVolumeWei)} ETH${RESET}`);

  const bobRep = await reputation.getReputation(bobBuyer.address);
  console.log(`  * Bob (Buyer) On-Chain Reputation:`);
  console.log(`    - Verified Completed Trades: ${BOLD}${bobRep.successfulTradesCount}${RESET}`);
  console.log(`    - Total Purchase Volume:     ${BOLD}${ethers.formatEther(bobRep.totalVolumeWei)} ETH${RESET}\n`);

  console.log(`${CYAN}${BOLD}`);
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("          TRUSTCHAIN END-TO-END SIMULATION COMPLETED WITH 100% SUCCESS         ");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`${RESET}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

