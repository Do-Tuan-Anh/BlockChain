// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title Reputation
 * @notice TrustChain On-Chain Sybil-Resistant Reputation Ledger.
 * Records verifiable trade volumes and dispute metrics exclusively upon successful
 * smart-contract escrow completion or arbitrator ruling.
 * Prevents arbitrary manipulation, self-rating, and off-chain review gaming.
 */
contract Reputation is Ownable2Step {
    struct UserReputation {
        uint256 successfulTradesCount;
        uint256 completedDeliveriesCount;
        uint256 totalVolumeWei;
        uint256 disputesWon;
        uint256 disputesLost;
    }

    // Mapping from user address => UserReputation
    mapping(address => UserReputation) private _reputations;

    // Authorized callers (e.g. Escrow.sol, DisputeResolution.sol)
    mapping(address => bool) public authorizedCallers;

    event CallerAuthorized(address indexed caller, bool authorized);
    event ReputationUpdated(
        address indexed user,
        uint256 successfulTradesCount,
        uint256 totalVolumeWei
    );
    event DisputeResultRecorded(
        address indexed winner,
        address indexed loser,
        uint256 orderId
    );

    error UnauthorizedCaller();
    error InvalidAddress();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setCallerAuthorization(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert InvalidAddress();
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    /**
     * @notice Records an on-chain completed escrow trade.
     * Callable exclusively by authorized Escrow contract.
     */
    function recordSuccessfulTrade(
        address seller,
        address buyer,
        uint256 volumeWei
    ) external onlyAuthorized {
        if (seller == address(0) || buyer == address(0)) revert InvalidAddress();

        // Increment seller reputation (successful sale & delivery)
        UserReputation storage sRep = _reputations[seller];
        sRep.successfulTradesCount += 1;
        sRep.completedDeliveriesCount += 1;
        sRep.totalVolumeWei += volumeWei;
        emit ReputationUpdated(seller, sRep.successfulTradesCount, sRep.totalVolumeWei);

        // Increment buyer reputation (verified purchase volume)
        UserReputation storage bRep = _reputations[buyer];
        bRep.successfulTradesCount += 1;
        bRep.totalVolumeWei += volumeWei;
        emit ReputationUpdated(buyer, bRep.successfulTradesCount, bRep.totalVolumeWei);
    }

    /**
     * @notice Records the outcome of an adjudicated dispute.
     * Callable exclusively by authorized DisputeResolution contract.
     */
    function recordDisputeOutcome(
        address winner,
        address loser,
        uint256 orderId
    ) external onlyAuthorized {
        if (winner != address(0)) {
            _reputations[winner].disputesWon += 1;
        }
        if (loser != address(0)) {
            _reputations[loser].disputesLost += 1;
        }
        emit DisputeResultRecorded(winner, loser, orderId);
    }

    /**
     * @notice Returns comprehensive on-chain reputation metrics for any user address.
     */
    function getReputation(address user)
        external
        view
        returns (
            uint256 successfulTradesCount,
            uint256 completedDeliveriesCount,
            uint256 totalVolumeWei,
            uint256 disputesWon,
            uint256 disputesLost
        )
    {
        UserReputation memory rep = _reputations[user];
        return (
            rep.successfulTradesCount,
            rep.completedDeliveriesCount,
            rep.totalVolumeWei,
            rep.disputesWon,
            rep.disputesLost
        );
    }
}

