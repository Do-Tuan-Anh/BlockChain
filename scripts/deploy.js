const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("===============================================================");
  console.log("     AegisMed Protocol: Enterprise Deployment Pipeline        ");
  console.log("===============================================================\n");

  const [deployer, manufacturer, carrier, distributor, pharmacy, oracleSigner] = await ethers.getSigners();

  console.log(`Deployer / Regulator:  ${deployer.address}`);
  console.log(`Manufacturer:          ${manufacturer.address}`);
  console.log(`Carrier (Logistics):   ${carrier.address}`);
  console.log(`Distributor (Hub):     ${distributor.address}`);
  console.log(`Hospital Pharmacy:     ${pharmacy.address}`);
  console.log(`IoT Oracle Gateway:    ${oracleSigner.address}\n`);

  // 1. Deploy AegisMedRegistry
  console.log("1. Deploying AegisMedRegistry...");
  const RegistryFactory = await ethers.getContractFactory("AegisMedRegistry");
  const registry = await RegistryFactory.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`   ✓ AegisMedRegistry deployed at: ${registryAddress}`);

  // 2. Deploy AegisMedBatchNFT
  console.log("2. Deploying AegisMedBatchNFT (Dynamic NFT Digital Product Passport)...");
  const BatchNFTFactory = await ethers.getContractFactory("AegisMedBatchNFT");
  const batchNFT = await BatchNFTFactory.deploy(registryAddress);
  await batchNFT.waitForDeployment();
  const batchNFTAddress = await batchNFT.getAddress();
  console.log(`   ✓ AegisMedBatchNFT deployed at: ${batchNFTAddress}`);

  // 3. Deploy MockTemperatureOracle
  console.log("3. Deploying MockTemperatureOracle...");
  const OracleFactory = await ethers.getContractFactory("MockTemperatureOracle");
  const oracle = await OracleFactory.deploy(batchNFTAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`   ✓ MockTemperatureOracle deployed at: ${oracleAddress}`);

  // 4. Register Stakeholders & Roles
  console.log("\n4. Granting regulatory accreditations and roles...");
  const MANUFACTURER_ROLE = await registry.MANUFACTURER_ROLE();
  const CARRIER_ROLE = await registry.CARRIER_ROLE();
  const DISTRIBUTOR_ROLE = await registry.DISTRIBUTOR_ROLE();
  const PHARMACY_ROLE = await registry.PHARMACY_ROLE();
  const ORACLE_ROLE = await registry.ORACLE_ROLE();

  await registry.registerActor(
    manufacturer.address,
    MANUFACTURER_ROLE,
    "Pfizer-BioNTech Global Manufacturing",
    "FDA-FEI-3004621122",
    "US-FDA"
  );
  console.log(`   ✓ Whitelisted Manufacturer: Pfizer-BioNTech (${manufacturer.address})`);

  await registry.registerActor(
    carrier.address,
    CARRIER_ROLE,
    "FedEx Custom Critical Cold Chain Logistics",
    "DOT-CC-901844",
    "Global-IATA"
  );
  console.log(`   ✓ Whitelisted Cold-Chain Carrier: FedEx Custom Critical (${carrier.address})`);

  await registry.registerActor(
    distributor.address,
    DISTRIBUTOR_ROLE,
    "McKesson National Distribution Hub",
    "DEA-DIST-772910",
    "US-National"
  );
  console.log(`   ✓ Whitelisted Distributor: McKesson (${distributor.address})`);

  await registry.registerActor(
    pharmacy.address,
    PHARMACY_ROLE,
    "Johns Hopkins Hospital Clinical Pharmacy",
    "MD-CLINIC-440219",
    "State-MD-DHMH"
  );
  console.log(`   ✓ Whitelisted Hospital Pharmacy: Johns Hopkins (${pharmacy.address})`);

  await registry.registerActor(
    oracleAddress,
    ORACLE_ROLE,
    "Chainlink / Sensitech IoT Telemetry Gateway",
    "IOT-SENS-889100",
    "ISO-17025"
  );
  console.log(`   ✓ Whitelisted IoT Sensor Oracle Contract: (${oracleAddress})`);

  // Export deployment metadata
  const deployments = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    contracts: {
      AegisMedRegistry: registryAddress,
      AegisMedBatchNFT: batchNFTAddress,
      MockTemperatureOracle: oracleAddress,
    },
    actors: {
      regulator: deployer.address,
      manufacturer: manufacturer.address,
      carrier: carrier.address,
      distributor: distributor.address,
      pharmacy: pharmacy.address,
      oracle: oracleAddress,
    },
  };

  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, "deployments.json"), JSON.stringify(deployments, null, 2));

  console.log("\n===============================================================");
  console.log("   Deployment Complete! Config saved to data/deployments.json  ");
  console.log("===============================================================\n");

  return { registry, batchNFT, oracle };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };

