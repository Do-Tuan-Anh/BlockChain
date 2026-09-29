# AegisMed: Decentralized Pharmaceutical Cold-Chain Provenance & Dynamic NFT Protocol

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Framework-Hardhat-yellow)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/Contracts-OpenZeppelin%20v5-blue)](https://openzeppelin.com/contracts/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **A research-grade blockchain architecture designed to eliminate counterfeit pharmaceuticals and cold-chain spoilage using Dynamic NFTs (dNFTs), Merkle Nullifier Trees, and Autonomous IoT Oracles.**

---

## 🔬 The Real-World Problem

According to the **World Health Organization (WHO)**:
- Over **10.5% of medicines** in developing nations are substandard or falsified, causing hundreds of thousands of preventable deaths and \$200B in illicit revenue annually.
- **Packaging Replay Attacks**: Counterfeiters collect authentic discarded medicine packaging, vials, and blister packs, refill them with toxic or inert ingredients, and resell them. Centralized databases only verify that a barcode *exists*, failing to detect that it has already been used.
- **Cold-Chain Spoilage**: 25–50% of temperature-sensitive biologics (such as mRNA vaccines and insulin) experience thermal breakdown during transit. These excursions are frequently concealed or detected too late.

---

## 💡 Academic & Technical Highlights

This project is tailored for academic evaluation, featuring cryptographic rigor and practical software engineering:

1. **Dynamic NFTs as Digital Product Passports (DPPs)**:
   - Each manufacturing batch is minted as an ERC-721 token implementing an on-chain **Finite State Machine (FSM)**.
   - States: `MANUFACTURED` ➔ `QUALITY_CERTIFIED` ➔ `IN_TRANSIT` ➔ `DISTRIBUTOR_CUSTODY` ➔ `PHARMACY_RECEIVED` ➔ `DISPENSING` ➔ `RECALLED_SPOILAGE` ➔ `COMPLETED`.

2. **$O(1)$ Scalability via Merkle Nullifier Trees**:
   - Instead of minting 100,000 individual NFT tokens on-chain (which would cost tens of thousands of dollars in gas), the contract stores a single 32-byte **Merkle root** representing all serialized units.
   - Individual vials are verified at point of care in $O(\log N)$ steps.
   - **Anti-Replay Nullifier Map**: Once dispensed, the leaf hash is permanently recorded as nullified on-chain. Any subsequent scan of the same packaging immediately reverts with `UnitAlreadyDispensed()`, permanently stopping vial harvesting and counterfeit refills!

3. **Autonomous Cold-Chain IoT Oracles**:
   - Certified IoT temperature dataloggers report telemetry directly on-chain.
   - If ambient temperature breaches biological stability thresholds (e.g. $<2^\circ\text{C}$ or $>8^\circ\text{C}$), the smart contract **atomically transitions into `RECALLED_SPOILAGE`**, locking all subsequent transfers and dispensations at the EVM bytecode level.

4. **EIP-712 Dual-Signed Custodial Handshakes**:
   - High-value consignments require mutual typed cryptographic signatures between releasing custodians and receiving custodians.

5. **Regulatory Alignment**:
   - Compliant with **FDA Drug Supply Chain Security Act (DSCSA)** Section 582 and **EU Falsified Medicines Directive (Directive 2011/62/EU)**.

---

## 📁 Repository Structure

```text
d:\Blockchn\
├── contracts/
│   ├── AegisMedRegistry.sol        # Stakeholder whitelisting & RBAC (Regulator, Mfg, Carrier, Pharmacy)
│   ├── AegisMedBatchNFT.sol        # Core Dynamic NFT with FSM, Merkle roots, nullifiers & cold-chain checks
│   ├── interfaces/
│   │   ├── IAegisMedRegistry.sol   # Registry interface & role definitions
│   │   └── IAegisMedBatchNFT.sol   # Batch NFT interface & structs
│   └── mocks/
│       └── MockTemperatureOracle.sol # IoT sensor oracle simulator for automated telemetry & excursion triggers
├── test/
│   └── AegisMed.test.js            # Comprehensive test suite covering full lifecycle & edge cases
├── scripts/
│   ├── generate-merkle.js          # Merkle tree generator & proof builder for serialized units
│   ├── deploy.js                   # Deployment pipeline with role assignments & config export
│   └── simulate-supply-chain.js    # Interactive terminal simulation for demonstrations
├── docs/
│   ├── WHITE_PAPER.md              # Research white paper with mathematical models & threat analysis
│   └── ARCHITECTURE.md             # Technical architecture, sequence diagrams & gas benchmarks
├── hardhat.config.js               # Solidity 0.8.24 compiler and network configurations
└── package.json                    # Project dependencies
```

---

## 🚀 Quick Start Guide

### 1. Installation
```powershell
npm.cmd install
```

### 2. Compile Smart Contracts
```powershell
npm.cmd run compile
```

### 3. Run the Automated Test Suite
```powershell
npm.cmd run test
```

Expected output:
```text
  AegisMed Protocol - Comprehensive Test Suite
    1. Regulatory Participant Whitelisting & Access Control
      ✔ Should allow regulator to register verified actors
      ✔ Should revert if non-regulator attempts to register an actor
      ✔ Should allow regulator to suspend an actor during safety audits
    2. Batch NFT Minting & Quality Assurance
      ✔ Should allow registered manufacturer to mint a batch NFT with Merkle root
      ✔ Should reject minting by unauthorized entity
      ✔ Should allow certifying lab quality analysis and advance state to QUALITY_CERTIFIED
    3. Supply Chain Custody Handshake & Cold-Chain Enforcement
      ✔ Should execute sequential custodial handoffs between whitelisted actors
      ✔ Should automatically RECALL batch if handover temperature breaches safe bounds
      ✔ Should prevent skipping lifecycle states
    4. Autonomous IoT Sensor Oracle & Spoilage Protection
      ✔ Should record compliant in-transit telemetry readings
      ✔ Should trigger autonomous RECALLED_SPOILAGE when IoT sensor detects critical temperature excursion
    5. Unit-Level Merkle Verification & Anti-Replay Nullifiers (Anti-Counterfeiting)
      ✔ Should verify patient packaging authenticity and successfully dispense serialized unit
      ✔ CRITICAL: Should prevent package reuse / replay attack (Double-Dispensing Revert)
      ✔ Should reject counterfeit unit not present in Merkle root
      ✔ Should forbid dispensing if batch was recalled due to cold-chain breach
    6. EIP-712 Cryptographic Handshake Verification
      ✔ Should execute custody transfer with valid EIP-712 dual signatures

  16 passing
```

### 4. Run the Live End-to-End Terminal Simulation
To demonstrate the complete lifecycle to your professor with real-time colored output:
```powershell
npm.cmd run simulate
```

This simulation will walk through:
1. Protocol deployment & FDA DSCSA actor registration.
2. Generating a cryptographic Merkle tree for 100 medicine vials.
3. Dynamic NFT batch minting and QA lab certification.
4. Physical custody handoff to a cold-chain carrier at 4°C.
5. In-transit IoT telemetry logs along an interstate transport route.
6. Safe intake at Johns Hopkins Hospital Dispensary.
7. Patient point-of-care QR code scan & Merkle proof verification.
8. **Live Replay Attack Block**: Proving that refilling authentic packaging fails on-chain.
9. **Live Thermal Failure**: Simulating a truck refrigeration compressor failure and witnessing the smart contract automatically quarantine the batch.

---

## 🎓 Professor Presentation Talking Points

1. **Why NFTs instead of a regular database or ERC-20?**
   - Centralized databases have single points of failure and are prone to reconciliation disputes across rival pharma companies and carriers.
   - ERC-20 tokens are fungible and cannot carry unique manufacturing lot metadata, inspection certificates, or state machines.
   - Dynamic NFTs represent discrete, indivisible batches that evolve over time as they progress through physical transit.

2. **How does this solve the scalability / gas cost problem?**
   - By decoupling batch-level state tracking (NFT) from unit-level verification (Merkle Trees).
   - The blockchain only stores a 32-byte hash (`unitMerkleRoot`). Even a batch of 1,000,000 vaccine vials requires only $O(1)$ storage on-chain.

3. **How does it stop counterfeiters from cloning packaging?**
   - Each genuine package contains a scratch-off salt combined with a serial number.
   - When scanned, the smart contract checks an on-chain **Nullifier map**.
   - Even if a counterfeiter copies the QR code or refills the vial, the first person to dispense the legitimate unit nullifies it permanently. Any subsequent scan will fail with `UnitAlreadyDispensed()`.

---

## 📜 License
MIT License. Developed for academic and research demonstration.

