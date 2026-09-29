// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IAegisMedBatchNFT.sol";
import "./interfaces/IAegisMedRegistry.sol";

/**
 * @title AegisMedBatchNFT
 * @notice Dynamic NFT Digital Product Passport representing pharmaceutical batches.
 * Features on-chain state machine, Merkle unit nullifiers for packaging anti-replay,
 * automated cold-chain IoT threshold triggers, and EIP-712 custody handoffs.
 */
contract AegisMedBatchNFT is ERC721URIStorage, EIP712, ReentrancyGuard, IAegisMedBatchNFT {
    using ECDSA for bytes32;

    IAegisMedRegistry public immutable registry;
    uint256 private _nextBatchId;

    bytes32 public constant CUSTODY_TRANSFER_TYPEHASH = keccak256(
        "CustodyTransfer(uint256 batchId,address from,address to,uint8 targetState,int16 handoverTemp,uint256 nonce,uint256 deadline)"
    );

    // batchId => BatchMetadata
    mapping(uint256 => BatchMetadata) private _batches;

    // batchId => array of temperature logs
    mapping(uint256 => TemperatureLog[]) private _temperatureLogs;

    // unitHash (leaf) => whether it has already been dispensed (anti-replay nullifier)
    mapping(bytes32 => bool) public override isUnitDispensed;

    // custodian address => nonce for EIP-712 handshakes
    mapping(address => uint256) public nonces;

    // Custom errors for gas efficiency
    error UnauthorizedActor(address caller, bytes32 requiredRole);
    error ActorNotActive(address actor);
    error BatchDoesNotExist(uint256 batchId);
    error InvalidStateTransition(BatchState current, BatchState target);
    error BatchIsRecalled(uint256 batchId);
    error BatchIsExpired(uint256 batchId, uint64 expiresAt, uint64 currentTime);
    error BatchNotDispensing(uint256 batchId, BatchState state);
    error InvalidMerkleProof(bytes32 unitHash);
    error UnitAlreadyDispensed(bytes32 unitNullifier);
    error InvalidCustodian(address expected, address actual);
    error SignatureExpired(uint256 deadline, uint256 currentTime);
    error InvalidSignature();
    error InvalidParameters();

    modifier onlyRegisteredRole(bytes32 role) {
        if (!registry.hasRole(role, msg.sender)) {
            revert UnauthorizedActor(msg.sender, role);
        }
        if (!registry.isActorActive(msg.sender)) {
            revert ActorNotActive(msg.sender);
        }
        _;
    }

    modifier batchExists(uint256 batchId) {
        if (_batches[batchId].manufacturedAt == 0) {
            revert BatchDoesNotExist(batchId);
        }
        _;
    }

    constructor(address registryAddress)
        ERC721("AegisMed Pharmaceutical Passport", "AEGIS-MED")
        EIP712("AegisMedProtocol", "1.0.0")
    {
        if (registryAddress == address(0)) revert InvalidParameters();
        registry = IAegisMedRegistry(registryAddress);
        _nextBatchId = 1;
    }

    /**
     * @notice Mints a new Dynamic NFT representing an entire pharmaceutical manufacturing batch.
     * @param ndcCode FDA National Drug Code / GTIN (e.g. "0069-0202-01")
     * @param drugName Brand and generic drug formulation
     * @param tokenUri IPFS metadata URI containing batch master records
     * @param unitMerkleRoot Merkle tree root calculated from all serialized package identifiers
     * @param totalUnits Total unit count manufactured in this lot
     * @param minTempCelsius Lower safe temperature threshold in Celsius (e.g. 2 for 2°C)
     * @param maxTempCelsius Upper safe temperature threshold in Celsius (e.g. 8 for 8°C)
     * @param expiresAt Expiration epoch timestamp
     */
    function mintBatch(
        string calldata ndcCode,
        string calldata drugName,
        string calldata tokenUri,
        bytes32 unitMerkleRoot,
        uint32 totalUnits,
        int16 minTempCelsius,
        int16 maxTempCelsius,
        uint64 expiresAt
    ) external override onlyRegisteredRole(registry.MANUFACTURER_ROLE()) returns (uint256) {
        if (totalUnits == 0 || minTempCelsius >= maxTempCelsius || expiresAt <= block.timestamp) {
            revert InvalidParameters();
        }
        if (unitMerkleRoot == bytes32(0)) {
            revert InvalidParameters();
        }

        uint256 batchId = _nextBatchId++;

        _batches[batchId] = BatchMetadata({
            ndcCode: ndcCode,
            drugName: drugName,
            ipfsCertificateHash: "",
            unitMerkleRoot: unitMerkleRoot,
            totalUnits: totalUnits,
            dispensedUnits: 0,
            minTempCelsius: minTempCelsius,
            maxTempCelsius: maxTempCelsius,
            manufacturedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            state: BatchState.MANUFACTURED,
            currentCustodian: msg.sender,
            manufacturer: msg.sender
        });

        _safeMint(msg.sender, batchId);
        _setTokenURI(batchId, tokenUri);

        emit BatchMinted(batchId, msg.sender, ndcCode, unitMerkleRoot, totalUnits);
        return batchId;
    }

    /**
     * @notice Attaches lab Quality Assurance / Certificate of Analysis (CoA) to the batch NFT.
     */
    function certifyQuality(
        uint256 batchId,
        string calldata ipfsCertificateHash
    ) external override batchExists(batchId) {
        BatchMetadata storage batch = _batches[batchId];

        bool isRegulator = registry.hasRole(registry.REGULATOR_ROLE(), msg.sender);
        bool isManufacturer = (msg.sender == batch.manufacturer && registry.hasRole(registry.MANUFACTURER_ROLE(), msg.sender));
        if (!isRegulator && !isManufacturer) {
            revert UnauthorizedActor(msg.sender, registry.REGULATOR_ROLE());
        }

        if (batch.state != BatchState.MANUFACTURED) {
            revert InvalidStateTransition(batch.state, BatchState.QUALITY_CERTIFIED);
        }

        batch.ipfsCertificateHash = ipfsCertificateHash;
        batch.state = BatchState.QUALITY_CERTIFIED;

        emit QualityCertified(batchId, msg.sender, ipfsCertificateHash);
    }

    /**
     * @notice Direct custody transition between registered actors with physical temperature inspection.
     */
    function transferCustody(
        uint256 batchId,
        address newCustodian,
        BatchState newState,
        int16 handoverTemp
    ) external batchExists(batchId) nonReentrant {
        BatchMetadata storage batch = _batches[batchId];

        if (batch.currentCustodian != msg.sender) {
            revert InvalidCustodian(batch.currentCustodian, msg.sender);
        }
        if (batch.state == BatchState.RECALLED_SPOILAGE || batch.state == BatchState.COMPLETED) {
            revert BatchIsRecalled(batchId);
        }
        if (!registry.isActorActive(newCustodian)) {
            revert ActorNotActive(newCustodian);
        }

        _validateTransition(batch.state, newState, newCustodian);

        batch.currentCustodian = newCustodian;
        if (_checkColdChainBound(batchId, batch, handoverTemp)) {
            newState = BatchState.RECALLED_SPOILAGE;
        }
        batch.state = newState;

        _transfer(msg.sender, newCustodian, batchId);

        emit CustodyTransferred(batchId, msg.sender, newCustodian, newState, handoverTemp);
    }

    /**
     * @notice Cryptographic EIP-712 mutual dual-signature handoff for high-value cold-chain consignments.
     */
    function transferCustodyWithHandshake(
        uint256 batchId,
        address newCustodian,
        BatchState newState,
        int16 handoverTemp,
        uint256 deadline,
        bytes calldata fromSignature,
        bytes calldata toSignature
    ) external batchExists(batchId) nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired(deadline, block.timestamp);

        BatchMetadata storage batch = _batches[batchId];
        address currentCustodian = batch.currentCustodian;

        if (batch.state == BatchState.RECALLED_SPOILAGE || batch.state == BatchState.COMPLETED) {
            revert BatchIsRecalled(batchId);
        }

        _validateTransition(batch.state, newState, newCustodian);

        bytes32 structHash = keccak256(
            abi.encode(
                CUSTODY_TRANSFER_TYPEHASH,
                batchId,
                currentCustodian,
                newCustodian,
                uint8(newState),
                handoverTemp,
                nonces[currentCustodian]++,
                deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);

        address signerFrom = ECDSA.recover(digest, fromSignature);
        address signerTo = ECDSA.recover(digest, toSignature);

        if (signerFrom != currentCustodian || signerTo != newCustodian) {
            revert InvalidSignature();
        }

        batch.currentCustodian = newCustodian;
        if (_checkColdChainBound(batchId, batch, handoverTemp)) {
            newState = BatchState.RECALLED_SPOILAGE;
        }
        batch.state = newState;

        _transfer(currentCustodian, newCustodian, batchId);

        emit CustodyTransferred(batchId, currentCustodian, newCustodian, newState, handoverTemp);
    }

    /**
     * @notice Allows a receiving pharmacy to open the batch for unit-level patient dispensing.
     */
    function activateDispensing(uint256 batchId) external batchExists(batchId) {
        BatchMetadata storage batch = _batches[batchId];

        if (batch.currentCustodian != msg.sender) revert InvalidCustodian(batch.currentCustodian, msg.sender);
        if (!registry.hasRole(registry.PHARMACY_ROLE(), msg.sender)) {
            revert UnauthorizedActor(msg.sender, registry.PHARMACY_ROLE());
        }
        if (batch.state != BatchState.PHARMACY_RECEIVED) {
            revert InvalidStateTransition(batch.state, BatchState.DISPENSING);
        }

        batch.state = BatchState.DISPENSING;
    }

    /**
     * @notice Cold-chain telemetry reporting. Called by ORACLE_ROLE (IoT Sensor Gateways / Chainlink Keepers).
     * Automatically recalls the batch if a critical thermal breach is detected.
     */
    function reportTemperatureTelemetry(
        uint256 batchId,
        int16 observedTemp,
        string calldata sensorId,
        string calldata location
    ) external override batchExists(batchId) {
        if (!registry.hasRole(registry.ORACLE_ROLE(), msg.sender) && msg.sender != _batches[batchId].currentCustodian) {
            revert UnauthorizedActor(msg.sender, registry.ORACLE_ROLE());
        }

        BatchMetadata storage batch = _batches[batchId];

        _temperatureLogs[batchId].push(TemperatureLog({
            recordedTemp: observedTemp,
            timestamp: uint64(block.timestamp),
            sensorId: sensorId,
            location: location
        }));

        if (observedTemp < batch.minTempCelsius || observedTemp > batch.maxTempCelsius) {
            batch.state = BatchState.RECALLED_SPOILAGE;
            emit ColdChainBreach(batchId, observedTemp, observedTemp > batch.maxTempCelsius ? batch.maxTempCelsius : batch.minTempCelsius, sensorId, uint64(block.timestamp));
        }
    }

    /**
     * @notice Verifies an individual package's authenticity and dispenses it to a patient.
     * Prevents duplicate/counterfeit dispensing using on-chain Merkle Nullifiers.
     * @param batchId The batch NFT ID
     * @param unitHash keccak256 hash of (batchId, serialNumber, secretSalt)
     * @param merkleProof Array of sibling hashes proving membership in batch.unitMerkleRoot
     * @param patientHash Anonymized hash of patient identifier for auditability
     */
    function verifyAndDispenseUnit(
        uint256 batchId,
        bytes32 unitHash,
        bytes32[] calldata merkleProof,
        bytes32 patientHash
    ) external override batchExists(batchId) nonReentrant returns (bool) {
        BatchMetadata storage batch = _batches[batchId];

        if (!registry.hasRole(registry.PHARMACY_ROLE(), msg.sender)) {
            revert UnauthorizedActor(msg.sender, registry.PHARMACY_ROLE());
        }
        if (batch.state == BatchState.RECALLED_SPOILAGE) {
            revert BatchIsRecalled(batchId);
        }
        if (batch.state != BatchState.DISPENSING && batch.state != BatchState.PHARMACY_RECEIVED) {
            revert BatchNotDispensing(batchId, batch.state);
        }
        if (block.timestamp > batch.expiresAt) {
            revert BatchIsExpired(batchId, batch.expiresAt, uint64(block.timestamp));
        }
        if (isUnitDispensed[unitHash]) {
            revert UnitAlreadyDispensed(unitHash);
        }

        bool isValid = MerkleProof.verify(merkleProof, batch.unitMerkleRoot, unitHash);
        if (!isValid) {
            revert InvalidMerkleProof(unitHash);
        }

        isUnitDispensed[unitHash] = true;
        batch.dispensedUnits++;

        if (batch.dispensedUnits >= batch.totalUnits) {
            batch.state = BatchState.COMPLETED;
        }

        emit UnitDispensed(batchId, unitHash, msg.sender, patientHash);
        return true;
    }

    /**
     * @notice Public verification endpoint for patients/doctors to check authenticity and cold-chain compliance before taking medicine.
     */
    function verifyUnitAuthenticity(
        uint256 batchId,
        bytes32 unitHash,
        bytes32[] calldata merkleProof
    ) external view batchExists(batchId) returns (
        bool isValid,
        bool isAlreadyDispensed,
        bool isRecalled,
        BatchState currentState,
        string memory drugName,
        uint64 expiresAt
    ) {
        BatchMetadata storage batch = _batches[batchId];
        isValid = MerkleProof.verify(merkleProof, batch.unitMerkleRoot, unitHash);
        isAlreadyDispensed = isUnitDispensed[unitHash];
        isRecalled = (batch.state == BatchState.RECALLED_SPOILAGE);
        currentState = batch.state;
        drugName = batch.drugName;
        expiresAt = batch.expiresAt;
    }

    function getBatch(uint256 batchId) external view override batchExists(batchId) returns (BatchMetadata memory) {
        return _batches[batchId];
    }

    function getTemperatureLogs(uint256 batchId) external view batchExists(batchId) returns (TemperatureLog[] memory) {
        return _temperatureLogs[batchId];
    }

    function _validateTransition(BatchState current, BatchState target, address newCustodian) internal view {
        if (current == BatchState.QUALITY_CERTIFIED && target == BatchState.IN_TRANSIT) {
            if (!registry.hasRole(registry.CARRIER_ROLE(), newCustodian)) {
                revert UnauthorizedActor(newCustodian, registry.CARRIER_ROLE());
            }
        } else if (current == BatchState.IN_TRANSIT && target == BatchState.DISTRIBUTOR_CUSTODY) {
            if (!registry.hasRole(registry.DISTRIBUTOR_ROLE(), newCustodian)) {
                revert UnauthorizedActor(newCustodian, registry.DISTRIBUTOR_ROLE());
            }
        } else if (current == BatchState.DISTRIBUTOR_CUSTODY && target == BatchState.IN_TRANSIT) {
            if (!registry.hasRole(registry.CARRIER_ROLE(), newCustodian)) {
                revert UnauthorizedActor(newCustodian, registry.CARRIER_ROLE());
            }
        } else if ((current == BatchState.IN_TRANSIT || current == BatchState.DISTRIBUTOR_CUSTODY) && target == BatchState.PHARMACY_RECEIVED) {
            if (!registry.hasRole(registry.PHARMACY_ROLE(), newCustodian)) {
                revert UnauthorizedActor(newCustodian, registry.PHARMACY_ROLE());
            }
        } else {
            revert InvalidStateTransition(current, target);
        }
    }

    function _checkColdChainBound(uint256 batchId, BatchMetadata storage batch, int16 temp) internal returns (bool) {
        if (temp < batch.minTempCelsius || temp > batch.maxTempCelsius) {
            batch.state = BatchState.RECALLED_SPOILAGE;
            emit ColdChainBreach(batchId, temp, temp > batch.maxTempCelsius ? batch.maxTempCelsius : batch.minTempCelsius, "HANDOVER_CHECK", uint64(block.timestamp));
            return true;
        }
        return false;
    }
}

