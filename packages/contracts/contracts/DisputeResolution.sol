// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Escrow.sol";
import "./Reputation.sol";

/**
 * @title DisputeResolution
 * @notice Decentralized Arbitration & Evidence Verification Contract for TrustChain.
 * Anchors off-chain cryptographic evidence hashes on-chain while orchestrating
 * trust-minimized escrow freeze, refund, and release mechanics.
 */
contract DisputeResolution is AccessControl {
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    enum DisputeState {
        NONE,
        OPEN,
        UNDER_REVIEW,
        RESOLVED_BUYER,
        RESOLVED_SELLER,
        CANCELLED
    }

    enum Ruling {
        NONE,
        REFUND_BUYER,
        RELEASE_SELLER
    }

    struct DisputeRecord {
        uint256 orderId;
        address openedBy;
        bytes32 buyerEvidenceHash;
        bytes32 sellerEvidenceHash;
        DisputeState state;
        Ruling ruling;
        uint64 openedAt;
        uint64 resolvedAt;
        address arbitrator;
    }

    Escrow public immutable escrowContract;
    Reputation public immutable reputationContract;

    // orderId => DisputeRecord
    mapping(uint256 => DisputeRecord) private _disputes;

    event DisputeOpened(
        uint256 indexed orderId,
        address indexed openedBy,
        bytes32 evidenceHash
    );
    event EvidenceSubmitted(
        uint256 indexed orderId,
        address indexed submitter,
        bytes32 evidenceHash
    );
    event DisputeStateChanged(
        uint256 indexed orderId,
        DisputeState newState
    );
    event DisputeResolved(
        uint256 indexed orderId,
        Ruling ruling,
        address indexed arbitrator
    );

    error DisputeAlreadyExists(uint256 orderId);
    error DisputeNotFound(uint256 orderId);
    error InvalidDisputeState(DisputeState current, DisputeState required);
    error Unauthorized();
    error InvalidParameters();

    constructor(
        address admin,
        address _escrowContract,
        address _reputationContract
    ) {
        if (admin == address(0) || _escrowContract == address(0) || _reputationContract == address(0)) {
            revert InvalidParameters();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE, admin);

        escrowContract = Escrow(payable(_escrowContract));
        reputationContract = Reputation(_reputationContract);
    }

    /**
     * @notice Opens a formal dispute for an order, locking evidence hash and freezing funds in Escrow.
     */
    function openDispute(uint256 orderId, bytes32 evidenceHash) external {
        if (evidenceHash == bytes32(0)) revert InvalidParameters();
        if (_disputes[orderId].state != DisputeState.NONE) {
            revert DisputeAlreadyExists(orderId);
        }

        Escrow.EscrowDeposit memory deposit = escrowContract.getEscrow(orderId);
        if (msg.sender != deposit.buyer && msg.sender != deposit.seller) {
            revert Unauthorized();
        }

        // Freeze escrow funds
        escrowContract.openDispute(orderId);

        bytes32 buyerHash = (msg.sender == deposit.buyer) ? evidenceHash : bytes32(0);
        bytes32 sellerHash = (msg.sender == deposit.seller) ? evidenceHash : bytes32(0);

        _disputes[orderId] = DisputeRecord({
            orderId: orderId,
            openedBy: msg.sender,
            buyerEvidenceHash: buyerHash,
            sellerEvidenceHash: sellerHash,
            state: DisputeState.OPEN,
            ruling: Ruling.NONE,
            openedAt: uint64(block.timestamp),
            resolvedAt: 0,
            arbitrator: address(0)
        });

        emit DisputeOpened(orderId, msg.sender, evidenceHash);
    }

    /**
     * @notice Allows either party to submit additional rebuttal evidence hash.
     */
    function submitEvidence(uint256 orderId, bytes32 evidenceHash) external {
        DisputeRecord storage dispute = _disputes[orderId];
        if (dispute.state != DisputeState.OPEN && dispute.state != DisputeState.UNDER_REVIEW) {
            revert InvalidDisputeState(dispute.state, DisputeState.OPEN);
        }

        Escrow.EscrowDeposit memory deposit = escrowContract.getEscrow(orderId);
        if (msg.sender == deposit.buyer) {
            dispute.buyerEvidenceHash = evidenceHash;
        } else if (msg.sender == deposit.seller) {
            dispute.sellerEvidenceHash = evidenceHash;
        } else {
            revert Unauthorized();
        }

        emit EvidenceSubmitted(orderId, msg.sender, evidenceHash);
    }

    /**
     * @notice Transitions dispute to UNDER_REVIEW by an active arbitrator.
     */
    function markUnderReview(uint256 orderId) external onlyRole(ARBITRATOR_ROLE) {
        DisputeRecord storage dispute = _disputes[orderId];
        if (dispute.state != DisputeState.OPEN) {
            revert InvalidDisputeState(dispute.state, DisputeState.OPEN);
        }
        dispute.state = DisputeState.UNDER_REVIEW;
        dispute.arbitrator = msg.sender;
        emit DisputeStateChanged(orderId, DisputeState.UNDER_REVIEW);
    }

    /**
     * @notice Arbitrator delivers final ruling, executing atomic escrow refund/release and reputation impact.
     */
    function resolveDispute(uint256 orderId, Ruling ruling) external onlyRole(ARBITRATOR_ROLE) {
        if (ruling != Ruling.REFUND_BUYER && ruling != Ruling.RELEASE_SELLER) {
            revert InvalidParameters();
        }

        DisputeRecord storage dispute = _disputes[orderId];
        if (dispute.state != DisputeState.OPEN && dispute.state != DisputeState.UNDER_REVIEW) {
            revert InvalidDisputeState(dispute.state, DisputeState.OPEN);
        }

        Escrow.EscrowDeposit memory deposit = escrowContract.getEscrow(orderId);

        dispute.ruling = ruling;
        dispute.resolvedAt = uint64(block.timestamp);
        dispute.arbitrator = msg.sender;

        if (ruling == Ruling.REFUND_BUYER) {
            dispute.state = DisputeState.RESOLVED_BUYER;
            // 1. Escrow refunds buyer, returns NFT to seller
            escrowContract.resolveDispute(orderId, true);
            // 2. Log reputation fault against seller
            reputationContract.recordDisputeOutcome(deposit.buyer, deposit.seller, orderId);
        } else {
            dispute.state = DisputeState.RESOLVED_SELLER;
            // 1. Escrow releases funds to seller, transfers NFT to buyer
            escrowContract.resolveDispute(orderId, false);
            // 2. Log reputation fault against buyer (frivolous dispute)
            reputationContract.recordDisputeOutcome(deposit.seller, deposit.buyer, orderId);
        }

        emit DisputeResolved(orderId, ruling, msg.sender);
    }

    function getDispute(uint256 orderId) external view returns (DisputeRecord memory) {
        if (_disputes[orderId].state == DisputeState.NONE) revert DisputeNotFound(orderId);
        return _disputes[orderId];
    }
}

