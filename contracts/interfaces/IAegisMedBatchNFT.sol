// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAegisMedBatchNFT
 * @notice Interface for Dynamic NFT Digital Product Passports representing pharmaceutical batches.
 */
interface IAegisMedBatchNFT {
    enum BatchState {
        MANUFACTURED,         // 0: Produced by certified pharma lab
        QUALITY_CERTIFIED,    // 1: QA approved potency & sterility
        IN_TRANSIT,           // 2: In custody of certified cold-chain carrier
        DISTRIBUTOR_CUSTODY,  // 3: Safely received at wholesale hub
        PHARMACY_RECEIVED,    // 4: Delivered to dispensing pharmacy/hospital
        DISPENSING,           // 5: Active dispensation to patients
        RECALLED_SPOILAGE,    // 6: Terminal: Breached cold chain or contaminated
        COMPLETED             // 7: Terminal: All units successfully dispensed
    }

    struct BatchMetadata {
        string ndcCode;               // National Drug Code / GTIN (e.g., 0069-0202-01)
        string drugName;              // Trade name & Active Ingredient
        string ipfsCertificateHash;   // IPFS CID of Certificate of Analysis (CoA)
        bytes32 unitMerkleRoot;       // Cryptographic root of all serialized unit packages
        uint32 totalUnits;            // Total serialized units minted
        uint32 dispensedUnits;        // Count of verified dispensed units
        int16 minTempCelsius;         // Cold-chain lower bound (e.g. 2 for 2°C)
        int16 maxTempCelsius;         // Cold-chain upper bound (e.g. 8 for 8°C)
        uint64 manufacturedAt;        // Epoch timestamp of production
        uint64 expiresAt;             // Epoch timestamp of drug expiration
        BatchState state;             // Current on-chain FSM state
        address currentCustodian;     // Current legal custodian
        address manufacturer;         // Originating manufacturer address
    }

    struct TemperatureLog {
        int16 recordedTemp;
        uint64 timestamp;
        string sensorId;
        string location;
    }

    event BatchMinted(
        uint256 indexed batchId,
        address indexed manufacturer,
        string ndcCode,
        bytes32 unitMerkleRoot,
        uint32 totalUnits
    );

    event QualityCertified(
        uint256 indexed batchId,
        address indexed certifier,
        string ipfsCertificateHash
    );

    event CustodyTransferred(
        uint256 indexed batchId,
        address indexed from,
        address indexed to,
        BatchState newState,
        int16 handoverTemp
    );

    event ColdChainBreach(
        uint256 indexed batchId,
        int16 observedTemp,
        int16 threshold,
        string sensorId,
        uint64 timestamp
    );

    event UnitDispensed(
        uint256 indexed batchId,
        bytes32 indexed unitNullifier,
        address indexed pharmacy,
        bytes32 patientHash
    );

    function mintBatch(
        string calldata ndcCode,
        string calldata drugName,
        string calldata tokenUri,
        bytes32 unitMerkleRoot,
        uint32 totalUnits,
        int16 minTempCelsius,
        int16 maxTempCelsius,
        uint64 expiresAt
    ) external returns (uint256);

    function certifyQuality(
        uint256 batchId,
        string calldata ipfsCertificateHash
    ) external;

    function reportTemperatureTelemetry(
        uint256 batchId,
        int16 observedTemp,
        string calldata sensorId,
        string calldata location
    ) external;

    function verifyAndDispenseUnit(
        uint256 batchId,
        bytes32 unitHash,
        bytes32[] calldata merkleProof,
        bytes32 patientHash
    ) external returns (bool);

    function isUnitDispensed(bytes32 unitNullifier) external view returns (bool);

    function getBatch(uint256 batchId) external view returns (BatchMetadata memory);
}

