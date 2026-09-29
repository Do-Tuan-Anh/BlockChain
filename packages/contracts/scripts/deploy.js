const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("===============================================================");
  console.log("        VeriMarket Protocol: Deployment Pipeline              ");
  console.log("        TrustChain Protocol: Deployment Pipeline              ");
  console.log("===============================================================\n");

  const [deployer, feeRecipient] = await ethers.getSigners();
  const [deployer, feeRecipient, arbitrator] = await ethers.getSigners();
  console.log(`Deployer Address:      ${deployer.address}`);
  console.log(`Fee Recipient Address: ${feeRecipient.address}\n`);
  console.log(`Fee Recipient Address: ${feeRecipient.address}`);
  console.log(`Arbitrator Address:    ${(arbitrator || deployer).address}\n`);

  // 1. Deploy MarketplaceNFT
  console.log("1. Deploying MarketplaceNFT (ERC-721)...");
  console.log("1. Deploying MarketplaceNFT (ERC-721 Digital Product Passport)...");
  const NFTFactory = await ethers.getContractFactory("MarketplaceNFT");
  const nft = await NFTFactory.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`   ✓ MarketplaceNFT deployed at: ${nftAddress}`);

  // 2. Deploy FeeManager (2.5% protocol fee)
  console.log("2. Deploying FeeManager (250 bps = 2.5%)...");
  const FeeManagerFactory = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManagerFactory.deploy(deployer.address, 250, feeRecipient.address);
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  console.log(`   ✓ FeeManager deployed at: ${feeManagerAddress}`);

  // 3. Deploy Escrow
  console.log("3. Deploying Escrow...");
  const EscrowFactory = await ethers.getContractFactory("Escrow");
  const escrow = await EscrowFactory.deploy(deployer.address, nftAddress, feeManagerAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`   ✓ Escrow deployed at: ${escrowAddress}`);

  // 4. Deploy Marketplace
  console.log("4. Deploying Marketplace...");
  const MarketplaceFactory = await ethers.getContractFactory("Marketplace");
  const marketplace = await MarketplaceFactory.deploy(deployer.address, nftAddress, escrowAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`   ✓ Marketplace deployed at: ${marketplaceAddress}`);

  // 5. Connect Marketplace to Escrow
  console.log("5. Authorizing Marketplace in Escrow contract...");
  const tx = await escrow.connect(deployer).setMarketplace(marketplaceAddress);
  await tx.wait();
  console.log("   ✓ Marketplace authorized as exclusive Escrow depositor.");
  // 5. Deploy Reputation
  console.log("5. Deploying Reputation...");
  const ReputationFactory = await ethers.getContractFactory("Reputation");
  const reputation = await ReputationFactory.deploy(deployer.address);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`   ✓ Reputation deployed at: ${reputationAddress}`);

  // 6. Deploy DisputeResolution
  console.log("6. Deploying DisputeResolution...");
  const DisputeFactory = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeFactory.deploy(
    deployer.address,
    escrowAddress,
    reputationAddress
  );
  await disputeResolution.waitForDeployment();
  const disputeAddress = await disputeResolution.getAddress();
  console.log(`   ✓ DisputeResolution deployed at: ${disputeAddress}`);

  // 7. Authorize Integrations
  console.log("7. Configuring Contract Authorizations...");
  await (await escrow.connect(deployer).setMarketplace(marketplaceAddress)).wait();
  await (await escrow.connect(deployer).setDisputeResolution(disputeAddress)).wait();
  await (await escrow.connect(deployer).setReputation(reputationAddress)).wait();
  console.log("   ✓ Escrow connected to Marketplace, DisputeResolution & Reputation.");

  await (await reputation.connect(deployer).setCallerAuthorization(escrowAddress, true)).wait();
  await (await reputation.connect(deployer).setCallerAuthorization(disputeAddress, true)).wait();
  console.log("   ✓ Reputation authorized Escrow and DisputeResolution.");

  if (arbitrator) {
    const ARBITRATOR_ROLE = await disputeResolution.ARBITRATOR_ROLE();
    await (await disputeResolution.connect(deployer).grantRole(ARBITRATOR_ROLE, arbitrator.address)).wait();
    console.log(`   ✓ Granted ARBITRATOR_ROLE to ${arbitrator.address}`);
  }

  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      MarketplaceNFT: nftAddress,
      FeeManager: feeManagerAddress,
      Escrow: escrowAddress,
      Marketplace: marketplaceAddress,
      Reputation: reputationAddress,
      DisputeResolution: disputeAddress,
    },
    treasury: feeRecipient.address,
    arbitrator: (arbitrator || deployer).address,
  };

  const dataDir = path.join(__dirname, "../../../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(dataDir, "trustchain-deployments.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  fs.writeFileSync(
    path.join(dataDir, "verimarket-deployments.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n===============================================================");
  console.log("   Deployment Complete! Config: data/verimarket-deployments.json");
  console.log("   Deployment Complete! Config saved to: data/trustchain-deployments.json");
  console.log("===============================================================\n");

  return { nft, feeManager, escrow, marketplace };
  return { nft, feeManager, escrow, marketplace, reputation, disputeResolution };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { main };

