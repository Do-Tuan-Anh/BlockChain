# AegisMed Technical Architecture & Design Document

## 1. System Topology

The AegisMed Protocol comprises three distinct operational layers:
1. **Accreditation & Identity Layer (`AegisMedRegistry.sol`)**:
   - Manages role assignments (`REGULATOR_ROLE`, `MANUFACTURER_ROLE`, `CARRIER_ROLE`, `DISTRIBUTOR_ROLE`, `PHARMACY_ROLE`, `ORACLE_ROLE`).
   - Stores legal entity metadata, FDA Establishment Identifiers (FEI), and DEA numbers.
   - Provides instant regulatory suspension mechanism.
2. **Batch Digital Product Passport Layer (`AegisMedBatchNFT.sol`)**:
   - Dynamic ERC-721 token representing physical pharmaceutical manufacturing batches.
   - Maintains on-chain Finite State Machine (FSM).
   - Stores 32-byte Merkle Root representing all serialized unit packages.
   - Maintains cryptographic nullifier mapping (`isUnitDispensed[unitHash]`).
   - Implements EIP-712 typed structured data verification for dual-signed custodial transfers.
3. **Autonomous Physical Telemetry Layer (`MockTemperatureOracle.sol`)**:
   - Simulates certified IoT sensors / Chainlink node gateways.
   - Periodically reports ambient temperature and GPS checkpoints.
   - Automatically quarantines batch upon temperature violation.

---

## 2. Interaction Sequence Diagrams

### 2.1 Batch Minting & Custody Handover Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Reg as FDA / Regulator
    actor Mfg as Manufacturer (Pfizer)
    actor Log as Carrier (FedEx Cold Chain)
    participant RegCont as AegisMedRegistry
    participant NFTCont as AegisMedBatchNFT

    Reg->>RegCont: registerActor(Mfg, MANUFACTURER_ROLE)
    Reg->>RegCont: registerActor(Log, CARRIER_ROLE)
    Note over Mfg: Generate 100k Serialized Units & Compute Merkle Root
    Mfg->>NFTCont: mintBatch(ndc, name, uri, merkleRoot, units, 2°C, 8°C, expiry)
    NFTCont-->>Mfg: Batch NFT #1 Minted (State: MANUFACTURED)
    Mfg->>NFTCont: certifyQuality(batchId, ipfsCoA)
    NFTCont-->>Mfg: State -> QUALITY_CERTIFIED
    
    Note over Mfg,Log: Mutual Physical Inspection & Temperature Check (4°C)
    Mfg->>NFTCont: transferCustody(batchId, carrierAddress, IN_TRANSIT, 4)
    NFTCont-->>Log: Custody Transferred (State: IN_TRANSIT)
```

### 2.2 Cold-Chain Autonomous Excursion Quarantine
```mermaid
sequenceDiagram
    autonumber
    actor IoT as IoT Sensor / Oracle
    participant NFTCont as AegisMedBatchNFT
    actor Pharm as Hospital Pharmacy

    IoT->>NFTCont: reportTemperatureTelemetry(batchId, temp=25°C, sensorId, GPS)
    Note over NFTCont: 25°C > MaxTemp (8°C) EXCURSION!
    NFTCont->>NFTCont: State Transition -> RECALLED_SPOILAGE
    NFTCont-->>IoT: Emit ColdChainBreach Event
    
    Pharm->>NFTCont: verifyAndDispenseUnit(batchId, leaf, proof, patient)
    NFTCont-->>Pharm: REVERT: BatchIsRecalled()
    Note over Pharm: Dispensing locked. Patient protected from spoiled vaccine!
```

### 2.3 Point-of-Care Unit Dispensing & Anti-Replay Nullifier
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient
    actor Pharm as Hospital Pharmacist
    participant NFTCont as AegisMedBatchNFT

    Patient->>Pharm: Requests Prescribed Vaccine
    Pharm->>NFTCont: verifyUnitAuthenticity(batchId, unitLeaf, merkleProof)
    NFTCont-->>Pharm: Valid=True, Dispensed=False, Recalled=False
    Pharm->>NFTCont: verifyAndDispenseUnit(batchId, unitLeaf, merkleProof, patientHash)
    Note over NFTCont: MerkleProof Verified
    Note over NFTCont: nullifiers[unitLeaf] = true
    NFTCont-->>Pharm: Emit UnitDispensed Event
    
    Note over Patient: Malicious actor obtains empty discarded packaging
    actor Counterfeiter as Counterfeiter
    Counterfeiter->>Pharm: Attempts to re-dispense refill of same serial
    Pharm->>NFTCont: verifyAndDispenseUnit(batchId, unitLeaf, merkleProof, fraudPatient)
    NFTCont-->>Pharm: REVERT: UnitAlreadyDispensed()
```

---

## 3. Gas Consumption & Space Complexity Analysis

| Operation | Space Complexity (On-Chain) | Time Complexity | Estimated Gas (Solidity 0.8.24) |
| :--- | :--- | :--- | :--- |
| `mintBatch` (100,000 units) | $O(1)$ (32 bytes Merkle root) | $O(1)$ | $\sim 142,000$ gas |
| `certifyQuality` | $O(1)$ (IPFS string) | $O(1)$ | $\sim 35,000$ gas |
| `transferCustody` | $O(1)$ (address + state) | $O(1)$ | $\sim 48,000$ gas |
| `reportTemperatureTelemetry` | $O(1)$ (appends log) | $O(1)$ | $\sim 42,000$ gas |
| `verifyAndDispenseUnit` ($N=100,000$) | $O(1)$ (1 storage bit nullifier) | $O(\log_2 N) \approx 17$ hashes | $\sim 32,000$ gas |
| `transferCustodyWithHandshake` (EIP-712) | $O(1)$ | $O(1)$ (2 ecrecover) | $\sim 65,000$ gas |

---

## 4. Contract Inheritance Hierarchy

```text
OpenZeppelin ERC721URIStorage
      ▲
      │
      ├─────── OpenZeppelin EIP712
      │             ▲
      │             │
      ├─────── OpenZeppelin ReentrancyGuard
      │             ▲
      │             │
AegisMedBatchNFT ───┴── IAegisMedBatchNFT
```

