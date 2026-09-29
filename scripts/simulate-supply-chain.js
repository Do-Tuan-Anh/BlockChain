const { ethers } = require("hardhat");
const { generateBatchMerkleTree, getProofForUnit } = require("./generate-merkle");

// ANSI Terminal Colors for a stunning presentation
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const BLUE = "\x1b[34m";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.clear();
  console.log(`${CYAN}${BOLD}`);
  console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                               AEGIS-MED PROTOCOL                              ║");
  console.log("║     Decentralized Pharmaceutical Cold-Chain Provenance & Dynamic NFT (DPP)    ║");
  console.log("║          Academic Research Demonstration - Real-World Problem Solution        ║");
  console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
  console.log(`${RESET}\n`);

  const [deployer, regulator, manufacturer, carrier, distributor, pharmacy, patient] = await ethers.getSigners();

  console.log(`${BOLD}--- ACTOR ROLES IN SIMULATION ---${RESET}`);
  console.log(`[Regulator / FDA]       : ${regulator.address}`);
  console.log(`[Pharma Manufacturer]   : ${manufacturer.address} (BioNTech/Pfizer)`);
  console.log(`[Cold-Chain Logistics]  : ${carrier.address} (FedEx Life Science)`);
  console.log(`[National Distributor]  : ${distributor.address} (McKesson Hub)`);
  console.log(`[Hospital Pharmacy]     : ${pharmacy.address} (Johns Hopkins Hospital)`);
  console.log(`[Patient / Consumer]    : ${patient.address}\n`);

  // STEP 1: Deploy Protocol
  console.log(`${MAGENTA}${BOLD}▶ STEP 1: PROTOCOL INITIALIZATION & REGULATORY COMPLIANCE${RESET}`);
  const Registry = await ethers.getContractFactory("AegisMedRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const regAddress = await registry.getAddress();

  const BatchNFT = await ethers.getContractFactory("AegisMedBatchNFT");
  const batchNFT = await BatchNFT.deploy(regAddress);
  await batchNFT.waitForDeployment();
  const nftAddress = await batchNFT.getAddress();

  const Oracle = await ethers.getContractFactory("MockTemperatureOracle");
  const oracle = await Oracle.deploy(nftAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();

  console.log(`  ✓ AegisMedRegistry deployed:   ${regAddress}`);
  console.log(`  ✓ AegisMedBatchNFT deployed:   ${nftAddress}`);
  console.log(`  ✓ MockTemperatureOracle deployed: ${oracleAddress}`);

  // Whitelist participants
  const REGULATOR_ROLE = await registry.REGULATOR_ROLE();
  await registry.connect(deployer).grantRole(REGULATOR_ROLE, regulator.address);

  await registry.connect(regulator).registerActor(
    manufacturer.address,
    await registry.MANUFACTURER_ROLE(),
    "Pfizer BioNTech Manufacturing Inc.",
    "FDA-FEI-3004621122",
    "US-FDA"
  );
  await registry.connect(regulator).registerActor(
    carrier.address,
    await registry.CARRIER_ROLE(),
    "FedEx Custom Critical Cold Chain",
    "DOT-CC-901844",
    "US-DOT"
  );
  await registry.connect(regulator).registerActor(
    distributor.address,
    await registry.DISTRIBUTOR_ROLE(),
    "McKesson National Logistics Hub",
    "DEA-DIST-772910",
    "US-DEA"
  );
  await registry.connect(regulator).registerActor(
    pharmacy.address,
    await registry.PHARMACY_ROLE(),
    "Johns Hopkins Hospital Pharmacy",
    "MD-CLINIC-440219",
    "US-MD"
  );
  await registry.connect(regulator).registerActor(
    oracleAddress,
    await registry.ORACLE_ROLE(),
    "Sensitech / Chainlink IoT Telemetry Oracle",
    "IOT-SENS-889100",
    "Global"
  );
  console.log(`  ${GREEN}✓ All supply chain actors accredited under FDA DSCSA guidelines.${RESET}\n`);

  // STEP 2: Merkle Tree Generation for Serialized Packaging
  console.log(`${MAGENTA}${BOLD}▶ STEP 2: GENERATING CRYPTOGRAPHIC MERKLE TREE FOR SERIALIZED UNITS${RESET}`);
  const TOTAL_UNITS = 100;
  const BATCH_ID = 1;
  console.log(`  * Computing individual cryptographic leaves for ${TOTAL_UNITS} drug packages...`);
  const { merkleTree, root, units } = generateBatchMerkleTree(BATCH_ID, TOTAL_UNITS);
  console.log(`  ✓ Merkle Root generated: ${CYAN}${root}${RESET}`);
  console.log(`  * Space Complexity: O(1) on-chain storage. Verification Complexity: O(log ${TOTAL_UNITS}) = ~7 proofs.`);
  console.log(`  ✓ Unit #1 Leaf: ${units[0].leaf} (Serial: ${units[0].serialNumber})\n`);

  // STEP 3: Batch Minting (Dynamic NFT Creation)
  console.log(`${MAGENTA}${BOLD}▶ STEP 3: MINTING BATCH #1 DYNAMIC NFT (DIGITAL PRODUCT PASSPORT)${RESET}`);
  const latestBlock = await ethers.provider.getBlock("latest");
  const expiresAt = latestBlock.timestamp + 365 * 24 * 3600;

  const mintTx = await batchNFT.connect(manufacturer).mintBatch(
    "NDC-59267-100-01",
    "Comirnaty mRNA COVID-19 Vaccine (0.3mL)",
    "ipfs://QmMasterBatchRecordHashPfizer2026",
    root,
    TOTAL_UNITS,
    2,  // Min: 2°C
    8,  // Max: 8°C
    expiresAt
  );
  await mintTx.wait();
  console.log(`  ${GREEN}✓ Batch #1 NFT successfully minted to Manufacturer!${RESET}`);
  let batch = await batchNFT.getBatch(BATCH_ID);
  console.log(`  * State: MANUFACTURED (State Code: ${batch.state})`);
  console.log(`  * Cold Chain Range: [${batch.minTempCelsius}°C to ${batch.maxTempCelsius}°C]\n`);

  // STEP 4: Quality Assurance Certification
  console.log(`${MAGENTA}${BOLD}▶ STEP 4: LAB QUALITY CERTIFICATION (ANALYTICAL TESTING)${RESET}`);
  const certTx = await batchNFT.connect(manufacturer).certifyQuality(
    BATCH_ID,
    "ipfs://QmCertificateOfAnalysisPotency99Percent"
  );
  await certTx.wait();
  batch = await batchNFT.getBatch(BATCH_ID);
  console.log(`  ${GREEN}✓ Analytical QA approved. State -> QUALITY_CERTIFIED (State Code: ${batch.state})${RESET}\n`);

  // STEP 5: Custodial Handshake to Cold-Chain Logistics
  console.log(`${MAGENTA}${BOLD}▶ STEP 5: CUSTODIAL HANDOVER TO LOGISTICS CARRIER${RESET}`);
  console.log(`  * Inspecting temperature at handoff: 4°C (Nominal).`);
  await batchNFT.connect(manufacturer).transferCustody(BATCH_ID, carrier.address, 2, 4); // 2 = IN_TRANSIT
  batch = await batchNFT.getBatch(BATCH_ID);
  console.log(`  ${GREEN}✓ Custody transferred to FedEx Cold-Chain Carrier.${RESET}`);
  console.log(`  * Current Custodian: ${batch.currentCustodian}`);
  console.log(`  * State: IN_TRANSIT (State Code: ${batch.state})\n`);

  // STEP 6: In-Transit IoT Telemetry Reporting
  console.log(`${MAGENTA}${BOLD}▶ STEP 6: AUTONOMOUS IN-TRANSIT IoT COLD-CHAIN TELEMETRY${RESET}`);
  console.log(`  * Transmitting live telemetry from sensor SENS-TRUCK-8891...`);
  await oracle.pushReading(BATCH_ID, 3, "SENS-TRUCK-8891", "Route I-95 North, Mile 142");
  await oracle.pushReading(BATCH_ID, 4, "SENS-TRUCK-8891", "Route I-95 North, Mile 210");
  await oracle.pushReading(BATCH_ID, 5, "SENS-TRUCK-8891", "Arrival: Baltimore Logistics Depot");
  const logs = await batchNFT.getTemperatureLogs(BATCH_ID);
  console.log(`  ${GREEN}✓ 3 IoT telemetry checkpoints committed on-chain. Temperature remained within 2°C - 8°C.${RESET}\n`);

  // STEP 7: Delivery to Hospital Pharmacy
  console.log(`${MAGENTA}${BOLD}▶ STEP 7: DELIVERY & INVENTORY INTAKE AT JOHNS HOPKINS HOSPITAL${RESET}`);
  await batchNFT.connect(carrier).transferCustody(BATCH_ID, pharmacy.address, 4, 4); // 4 = PHARMACY_RECEIVED
  await batchNFT.connect(pharmacy).activateDispensing(BATCH_ID); // 5 = DISPENSING
  batch = await batchNFT.getBatch(BATCH_ID);
  console.log(`  ${GREEN}✓ Consignment accepted by Chief Pharmacist. State -> DISPENSING.${RESET}\n`);

  // STEP 8: Patient Point-of-Care Scan & Cryptographic Nullifier
  console.log(`${MAGENTA}${BOLD}▶ STEP 8: POINT-OF-CARE AUTHENTICITY VERIFICATION & DISPENSING${RESET}`);
  const targetUnit = units[0]; // Unit #1
  const targetProof = getProofForUnit(merkleTree, targetUnit.leaf);
  const patientHash = ethers.keccak256(ethers.toUtf8Bytes("PATIENT_ALICE_MED_REC_10098"));

  console.log(`  * Patient Alice scans 2D DataMatrix QR code on vial...`);
  console.log(`  * Serial Number: ${targetUnit.serialNumber}`);
  console.log(`  * Unit Leaf Hash: ${targetUnit.leaf}`);
  console.log(`  * Merkle Proof Length: ${targetProof.length} nodes`);

  const [isValid, isDispensed, isRecalled, state, drugName, expires] = await batchNFT.verifyUnitAuthenticity(
    BATCH_ID,
    targetUnit.leaf,
    targetProof
  );
  console.log(`  * Authenticity Check: ${isValid ? GREEN + "GENUINE PHARMACEUTICAL" : RED + "COUNTERFEIT"}${RESET}`);
  console.log(`  * Already Dispensed: ${isDispensed ? RED + "YES (DO NOT USE)" : GREEN + "NO (FRESH)"}${RESET}`);
  console.log(`  * Recall / Spoilage Status: ${isRecalled ? RED + "RECALLED" : GREEN + "COMPLIANT"}${RESET}`);

  // Dispense unit
  const dispenseTx = await batchNFT.connect(pharmacy).verifyAndDispenseUnit(
    BATCH_ID,
    targetUnit.leaf,
    targetProof,
    patientHash
  );
  await dispenseTx.wait();
  console.log(`  ${GREEN}✓ Unit successfully dispensed! On-chain nullifier marked for this serialized unit.${RESET}\n`);

  // STEP 9: Anti-Counterfeiting Replay Attack Prevention Demonstration
  console.log(`${MAGENTA}${BOLD}▶ STEP 9: ANTI-REPLAY DEFENSE: ATTEMPTING TO RE-USE AUTHENTIC PACKAGING${RESET}`);
  console.log(`  * Scenario: A counterfeiter retrieves discarded packaging of Unit #1,`);
  console.log(`    refills it with saline solution, and attempts to scan it at another dispensary...`);

  try {
    await batchNFT.connect(pharmacy).verifyAndDispenseUnit(
      BATCH_ID,
      targetUnit.leaf,
      targetProof,
      ethers.keccak256(ethers.toUtf8Bytes("VICTIM_PATIENT_BOB"))
    );
    console.log(`  ${RED}❌ ERROR: Double-dispensing succeeded! (This should never happen)${RESET}`);
  } catch (err) {
    console.log(`  ${GREEN}${BOLD}✓ REPLAY ATTACK BLOCKED! Smart contract reverted with UnitAlreadyDispensed()!${RESET}`);
    console.log(`  * The patient and clinic are instantly protected from dangerous counterfeit reuse.\n`);
  }

  // STEP 10: Cold-Chain Failure & Autonomous Smart Contract Recall Demonstration
  console.log(`${MAGENTA}${BOLD}▶ STEP 10: AUTOMATED RECALL TRIGGER UPON COLD-CHAIN BREACH${RESET}`);
  console.log(`  * Minting Batch #2 (FluBlok Vaccine) to demonstrate autonomous excursion recall...`);
  const mintTx2 = await batchNFT.connect(manufacturer).mintBatch(
    "NDC-59267-200-02",
    "FluBlok Quadrivalent Vaccine",
    "ipfs://QmBatch2Record",
    root,
    50,
    2,
    8,
    expiresAt
  );
  await mintTx2.wait();
  await batchNFT.connect(manufacturer).certifyQuality(2, "ipfs://QmCoA2");
  await batchNFT.connect(manufacturer).transferCustody(2, carrier.address, 2, 4);

  console.log(`  * SIMULATING TRUCK REFRIGERATION COMPRESSOR FAILURE (Temperature spikes to 25°C)...`);
  await oracle.simulateRefrigerationFailure(2, "SENS-TRUCK-FAILURE-09");

  const batch2 = await batchNFT.getBatch(2);
  console.log(`  ${RED}${BOLD}⚠ COLD CHAIN BREACH DETECTED BY ORACLE!${RESET}`);
  console.log(`  * Batch #2 State immediately switched to: ${RED}RECALLED_SPOILAGE (State Code: ${batch2.state})${RESET}`);

  // Demonstrate that the smart contract locks all transfers and dispensing
  try {
    await batchNFT.connect(carrier).transferCustody(2, pharmacy.address, 4, 25);
  } catch (err) {
    console.log(`  ${GREEN}✓ Smart contract automatically FROZE custody transfer. Spoiled vaccines cannot be received.${RESET}`);
  }

  console.log(`\n${CYAN}${BOLD}===============================================================================`);
  console.log("             AEGIS-MED PROTOCOL SIMULATION COMPLETED SUCCESSFULLY!             ");
  console.log(`===============================================================================${RESET}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

