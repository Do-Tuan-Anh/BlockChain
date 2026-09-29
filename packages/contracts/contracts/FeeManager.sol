// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title FeeManager
 * @notice Protocol treasury and commission controller for VeriMarket.
 */
contract FeeManager is Ownable2Step {
    uint16 public constant MAX_FEE_BPS = 1000; // Maximum 10% fee cap
    uint16 public feeBps;                      // Basis points (e.g. 250 = 2.5%)
    address payable public feeRecipient;

    event FeeBpsUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    error InvalidFeeBps(uint16 feeBps, uint16 maxFeeBps);
    error InvalidRecipient();
    error TransferFailed();

    constructor(address initialOwner, uint16 initialFeeBps, address payable initialRecipient)
        Ownable(initialOwner)
    {
        if (initialFeeBps > MAX_FEE_BPS) revert InvalidFeeBps(initialFeeBps, MAX_FEE_BPS);
        if (initialRecipient == address(0)) revert InvalidRecipient();

        feeBps = initialFeeBps;
        feeRecipient = initialRecipient;
    }

    /**
     * @notice Computes the protocol commission and net seller proceeds.
     * @param grossAmount Total gross purchase amount in wei
     * @return feeAmount Marketplace commission
     * @return netAmount Amount payable to seller
     */
    function calculateFee(uint256 grossAmount) external view returns (uint256 feeAmount, uint256 netAmount) {
        feeAmount = (grossAmount * feeBps) / 10000;
        netAmount = grossAmount - feeAmount;
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFeeBps(newFeeBps, MAX_FEE_BPS);
        emit FeeBpsUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function setFeeRecipient(address payable newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidRecipient();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    /**
     * @notice Allows protocol treasury to accept ether.
     */
    receive() external payable {}
}

