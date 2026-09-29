const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateBatchMerkleTree, getProofForUnit } = require("../scripts/generate-merkle");

describe("AegisMed Protocol - Comprehensive Test Suite", function () {
  let registry, batchNFT, oracle;
  let admin, regulator, manufacturer, carrier, distributor, pharmacy, patient, attacker;
  let MANUFACTURER_ROLE, CARRIER_ROLE, DISTRIBUTOR_ROLE, PHARMACY_ROLE, ORACLE_ROLE, REGULATOR_ROLE;

  const BATCH_ID = 1;
  const TOTAL_UNITS = 20;
  const MIN_TEMP = 2; // 2°C
  const MAX_TEMP = 8; // 8°C
  let expiresAt;
  let merkleTree, merkleRoot, units;

  beforeEach(async function () {
    [admin, regulator, manufacturer, carrier, distributor, pharmacy, patient, attacker] = await ethers.getSigners();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("AegisMedRegistry");
    registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();

    REGULATOR_ROLE = await registry.REGULATOR_ROLE();
    MANUFACTURER_ROLE = await registry.MANUFACTURER_ROLE();
    CARRIER_ROLE = await registry.CARRIER_ROLE();
    DISTRIBUTOR_ROLE = await registry.DISTRIBUTOR_ROLE();
    PHARMACY_ROLE = await registry.PHARMACY_ROLE();
    ORACLE_ROLE = await registry.ORACLE_ROLE();

    // Deploy Batch NFT
    const BatchNFT = await ethers.getContractFactory("AegisMedBatchNFT");
    batchNFT = await BatchNFT.deploy(await registry.getAddress());
    await batchNFT.waitForDeployment();

    // Deploy Mock Oracle
    const Oracle = await ethers.getContractFactory("MockTemperatureOracle");
    oracle = await Oracle.deploy(await batchNFT.getAddress());
    await oracle.waitForDeployment();

    // Grant regulator role to regulator account
    await registry.connect(admin).grantRole(REGULATOR_ROLE, regulator.address);

    // Whitelist participants via Regulator
    await registry.connect(regulator).registerActor(
      manufacturer.address,
      MANUFACTURER_ROLE,
      "BioPharma Labs Inc",
      "FDA-FEI-100200",
      "US-FDA"
    );
    await registry.connect(regulator).registerActor(
      carrier.address,
      CARRIER_ROLE,
      "Polar Express Cold Chain",
      "DOT-CC-3321",
      "US-DOT"
    );
    await registry.connect(regulator).registerActor(
      distributor.address,
      DISTRIBUTOR_ROLE,
      "Global Health Distribution Hub",
      "DEA-DIST-9911",
      "US-DEA"
    );
    await registry.connect(regulator).registerActor(
      pharmacy.address,
      PHARMACY_ROLE,
      "Central City Medical Dispensary",
      "STATE-PHARM-8832",
      "US-State"
    );
    await registry.connect(regulator).registerActor(
      await oracle.getAddress(),
      ORACLE_ROLE,
      "IoT Cold Chain Sensor Gateway",
      "ISO-17025-TEMP",
      "Global"
    );

    // Generate Merkle tree for batch #1
    const generated = generateBatchMerkleTree(BATCH_ID, TOTAL_UNITS);
    merkleTree = generated.merkleTree;
    merkleRoot = generated.root;
    units = generated.units;

    const latestBlock = await ethers.provider.getBlock("latest");
    expiresAt = latestBlock.timestamp + 365 * 24 * 60 * 60; // 1 year from now
  });

  describe("1. Regulatory Participant Whitelisting & Access Control", function () {
    it("Should allow regulator to register verified actors", async function () {
      const info = await registry.getActorInfo(manufacturer.address);
      expect(info.legalEntityName).to.equal("BioPharma Labs Inc");
      expect(info.isActive).to.be.true;
      expect(await registry.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
    });

    it("Should revert if non-regulator attempts to register an actor", async function () {
      await expect(
        registry.connect(attacker).registerActor(
          attacker.address,
          MANUFACTURER_ROLE,
          "Fake Labs",
          "FAKE-000",
          "US"
        )
      ).to.be.reverted;
    });

    it("Should allow regulator to suspend an actor during safety audits", async function () {
      await registry.connect(regulator).setActorStatus(carrier.address, false);
      expect(await registry.isActorActive(carrier.address)).to.be.false;
    });
  });

  describe("2. Batch NFT Minting & Quality Assurance", function () {
    it("Should allow registered manufacturer to mint a batch NFT with Merkle root", async function () {
      const tx = await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );

      await expect(tx)
        .to.emit(batchNFT, "BatchMinted")
        .withArgs(BATCH_ID, manufacturer.address, "NDC-59267-100-01", merkleRoot, TOTAL_UNITS);

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.drugName).to.equal("mRNA Therapeutic Vaccine 50mcg");
      expect(batch.unitMerkleRoot).to.equal(merkleRoot);
      expect(batch.state).to.equal(0); // MANUFACTURED
      expect(batch.currentCustodian).to.equal(manufacturer.address);
    });

    it("Should reject minting by unauthorized entity", async function () {
      await expect(
        batchNFT.connect(attacker).mintBatch(
          "NDC-00000",
          "Counterfeit Drug",
          "ipfs://fake",
          merkleRoot,
          TOTAL_UNITS,
          MIN_TEMP,
          MAX_TEMP,
          expiresAt
        )
      ).to.be.revertedWithCustomError(batchNFT, "UnauthorizedActor");
    });

    it("Should allow certifying lab quality analysis and advance state to QUALITY_CERTIFIED", async function () {
      await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );

      await expect(
        batchNFT.connect(manufacturer).certifyQuality(BATCH_ID, "ipfs://QmLabCertificateOfAnalysisHash789")
      )
        .to.emit(batchNFT, "QualityCertified")
        .withArgs(BATCH_ID, manufacturer.address, "ipfs://QmLabCertificateOfAnalysisHash789");

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.state).to.equal(1); // QUALITY_CERTIFIED
      expect(batch.ipfsCertificateHash).to.equal("ipfs://QmLabCertificateOfAnalysisHash789");
    });
  });

  describe("3. Supply Chain Custody Handshake & Cold-Chain Enforcement", function () {
    beforeEach(async function () {
      await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );
      await batchNFT.connect(manufacturer).certifyQuality(BATCH_ID, "ipfs://QmLabCoA");
    });

    it("Should execute sequential custodial handoffs between whitelisted actors", async function () {
      // 1. Manufacturer -> Carrier (State: IN_TRANSIT, temp 4°C)
      await batchNFT.connect(manufacturer).transferCustody(BATCH_ID, carrier.address, 2, 4);
      let batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.currentCustodian).to.equal(carrier.address);
      expect(batch.state).to.equal(2); // IN_TRANSIT

      // 2. Carrier -> Distributor (State: DISTRIBUTOR_CUSTODY, temp 5°C)
      await batchNFT.connect(carrier).transferCustody(BATCH_ID, distributor.address, 3, 5);
      batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.currentCustodian).to.equal(distributor.address);
      expect(batch.state).to.equal(3); // DISTRIBUTOR_CUSTODY

      // 3. Distributor -> Pharmacy (State: PHARMACY_RECEIVED, temp 4°C)
      await batchNFT.connect(distributor).transferCustody(BATCH_ID, pharmacy.address, 4, 4);
      batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.currentCustodian).to.equal(pharmacy.address);
      expect(batch.state).to.equal(4); // PHARMACY_RECEIVED
    });

    it("Should automatically RECALL batch if handover temperature breaches safe bounds", async function () {
      // Handover with 14°C (exceeds max safe temp of 8°C)
      await batchNFT.connect(manufacturer).transferCustody(BATCH_ID, carrier.address, 2, 14);

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.state).to.equal(6); // RECALLED_SPOILAGE

      // Subsequent transfer attempts must fail
      await expect(
        batchNFT.connect(carrier).transferCustody(BATCH_ID, distributor.address, 3, 4)
      ).to.be.revertedWithCustomError(batchNFT, "BatchIsRecalled");
    });

    it("Should prevent skipping lifecycle states (e.g. Manufacturer directly jumping to Dispensing)", async function () {
      await expect(
        batchNFT.connect(manufacturer).transferCustody(BATCH_ID, pharmacy.address, 5, 4)
      ).to.be.revertedWithCustomError(batchNFT, "InvalidStateTransition");
    });
  });

  describe("4. Autonomous IoT Sensor Oracle & Spoilage Protection", function () {
    beforeEach(async function () {
      await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );
      await batchNFT.connect(manufacturer).certifyQuality(BATCH_ID, "ipfs://QmLabCoA");
      await batchNFT.connect(manufacturer).transferCustody(BATCH_ID, carrier.address, 2, 4);
    });

    it("Should record compliant in-transit telemetry readings", async function () {
      await oracle.pushReading(BATCH_ID, 4, "SENSOR-TRUCK-01", "39.0438° N, 77.4874° W");
      await oracle.pushReading(BATCH_ID, 5, "SENSOR-TRUCK-01", "39.9526° N, 75.1652° W");

      const logs = await batchNFT.getTemperatureLogs(BATCH_ID);
      expect(logs.length).to.equal(2);
      expect(logs[0].recordedTemp).to.equal(4);
      expect(logs[1].recordedTemp).to.equal(5);

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.state).to.equal(2); // Still IN_TRANSIT
    });

    it("Should trigger autonomous RECALLED_SPOILAGE when IoT sensor detects critical temperature excursion", async function () {
      // Simulate refrigeration failure (e.g. 25°C)
      await expect(oracle.simulateRefrigerationFailure(BATCH_ID, "SENSOR-TRUCK-01"))
        .to.emit(batchNFT, "ColdChainBreach");

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.state).to.equal(6); // RECALLED_SPOILAGE
    });
  });

  describe("5. Unit-Level Merkle Verification & Anti-Replay Nullifiers (Anti-Counterfeiting)", function () {
    beforeEach(async function () {
      await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );
      await batchNFT.connect(manufacturer).certifyQuality(BATCH_ID, "ipfs://QmLabCoA");
      await batchNFT.connect(manufacturer).transferCustody(BATCH_ID, carrier.address, 2, 4);
      await batchNFT.connect(carrier).transferCustody(BATCH_ID, pharmacy.address, 4, 4);
      await batchNFT.connect(pharmacy).activateDispensing(BATCH_ID);
    });

    it("Should verify patient packaging authenticity and successfully dispense serialized unit", async function () {
      const sampleUnit = units[0];
      const proof = getProofForUnit(merkleTree, sampleUnit.leaf);
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("PATIENT-SSN-9982"));

      // Check public verification before dispense
      const [isValid, isDispensed, isRecalled] = await batchNFT.verifyUnitAuthenticity(
        BATCH_ID,
        sampleUnit.leaf,
        proof
      );
      expect(isValid).to.be.true;
      expect(isDispensed).to.be.false;
      expect(isRecalled).to.be.false;

      // Dispense unit
      await expect(
        batchNFT.connect(pharmacy).verifyAndDispenseUnit(BATCH_ID, sampleUnit.leaf, proof, patientHash)
      )
        .to.emit(batchNFT, "UnitDispensed")
        .withArgs(BATCH_ID, sampleUnit.leaf, pharmacy.address, patientHash);

      expect(await batchNFT.isUnitDispensed(sampleUnit.leaf)).to.be.true;
      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.dispensedUnits).to.equal(1);
    });

    it("CRITICAL: Should prevent package reuse / replay attack (Double-Dispensing Revert)", async function () {
      const sampleUnit = units[1];
      const proof = getProofForUnit(merkleTree, sampleUnit.leaf);
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("PATIENT-ID-1"));

      // First dispense succeeds
      await batchNFT.connect(pharmacy).verifyAndDispenseUnit(BATCH_ID, sampleUnit.leaf, proof, patientHash);

      // Counterfeiter collects genuine empty vial/box and tries to scan/dispense again
      await expect(
        batchNFT.connect(pharmacy).verifyAndDispenseUnit(BATCH_ID, sampleUnit.leaf, proof, patientHash)
      ).to.be.revertedWithCustomError(batchNFT, "UnitAlreadyDispensed");
    });

    it("Should reject counterfeit unit not present in Merkle root", async function () {
      const fakeLeaf = ethers.keccak256(ethers.toUtf8Bytes("COUNTERFEIT-SERIAL-9999"));
      const fakeProof = getProofForUnit(merkleTree, units[0].leaf); // Mismatched proof
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("PATIENT-ID-2"));

      await expect(
        batchNFT.connect(pharmacy).verifyAndDispenseUnit(BATCH_ID, fakeLeaf, fakeProof, patientHash)
      ).to.be.revertedWithCustomError(batchNFT, "InvalidMerkleProof");
    });

    it("Should forbid dispensing if batch was recalled due to cold-chain breach", async function () {
      // Trigger breach
      await oracle.simulateRefrigerationFailure(BATCH_ID, "SENSOR-HOSPITAL-FREEZER");

      const sampleUnit = units[2];
      const proof = getProofForUnit(merkleTree, sampleUnit.leaf);
      const patientHash = ethers.keccak256(ethers.toUtf8Bytes("PATIENT-ID-3"));

      await expect(
        batchNFT.connect(pharmacy).verifyAndDispenseUnit(BATCH_ID, sampleUnit.leaf, proof, patientHash)
      ).to.be.revertedWithCustomError(batchNFT, "BatchIsRecalled");
    });
  });

  describe("6. EIP-712 Cryptographic Handshake Verification", function () {
    beforeEach(async function () {
      await batchNFT.connect(manufacturer).mintBatch(
        "NDC-59267-100-01",
        "mRNA Therapeutic Vaccine 50mcg",
        "ipfs://QmBatchMasterRecordHash123",
        merkleRoot,
        TOTAL_UNITS,
        MIN_TEMP,
        MAX_TEMP,
        expiresAt
      );
      await batchNFT.connect(manufacturer).certifyQuality(BATCH_ID, "ipfs://QmLabCoA");
    });

    it("Should execute custody transfer with valid EIP-712 dual signatures", async function () {
      const currentCustodian = manufacturer;
      const newCustodian = carrier;
      const newState = 2; // IN_TRANSIT
      const handoverTemp = 4;
      const latestBlock = await ethers.provider.getBlock("latest");
      const deadline = latestBlock.timestamp + 3600;
      const nonce = await batchNFT.nonces(currentCustodian.address);

      const domain = {
        name: "AegisMedProtocol",
        version: "1.0.0",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await batchNFT.getAddress(),
      };

      const types = {
        CustodyTransfer: [
          { name: "batchId", type: "uint256" },
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "targetState", type: "uint8" },
          { name: "handoverTemp", type: "int16" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const value = {
        batchId: BATCH_ID,
        from: currentCustodian.address,
        to: newCustodian.address,
        targetState: newState,
        handoverTemp: handoverTemp,
        nonce: nonce,
        deadline: deadline,
      };

      const fromSig = await currentCustodian.signTypedData(domain, types, value);
      const toSig = await newCustodian.signTypedData(domain, types, value);

      await expect(
        batchNFT.transferCustodyWithHandshake(
          BATCH_ID,
          newCustodian.address,
          newState,
          handoverTemp,
          deadline,
          fromSig,
          toSig
        )
      )
        .to.emit(batchNFT, "CustodyTransferred")
        .withArgs(BATCH_ID, currentCustodian.address, newCustodian.address, newState, handoverTemp);

      const batch = await batchNFT.getBatch(BATCH_ID);
      expect(batch.currentCustodian).to.equal(newCustodian.address);
      expect(batch.state).to.equal(newState);
    });
  });
});

