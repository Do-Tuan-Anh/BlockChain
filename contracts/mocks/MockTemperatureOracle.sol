// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAegisMedBatchNFT.sol";

/**
 * @title MockTemperatureOracle
 * @notice Simulates an autonomous IoT hardware gateway or Chainlink Oracle feed for cold-chain monitoring.
 */
contract MockTemperatureOracle {
    address public owner;
    IAegisMedBatchNFT public batchNFT;

    event SensorDataReported(uint256 indexed batchId, int16 temperature, string sensorId, string gpsCoordinates);

    constructor(address _batchNFT) {
        owner = msg.sender;
        batchNFT = IAegisMedBatchNFT(_batchNFT);
    }

    function setBatchNFT(address _batchNFT) external {
        require(msg.sender == owner, "Only owner");
        batchNFT = IAegisMedBatchNFT(_batchNFT);
    }

    function pushReading(
        uint256 batchId,
        int16 currentTemperature,
        string calldata sensorId,
        string calldata gpsCoordinates
    ) external {
        batchNFT.reportTemperatureTelemetry(batchId, currentTemperature, sensorId, gpsCoordinates);
        emit SensorDataReported(batchId, currentTemperature, sensorId, gpsCoordinates);
    }

    function simulateRefrigerationFailure(uint256 batchId, string calldata sensorId) external {
        batchNFT.reportTemperatureTelemetry(batchId, 25, sensorId, "CARGO_BAY_FAILSAFE");
        emit SensorDataReported(batchId, 25, sensorId, "CARGO_BAY_FAILSAFE");
    }
}

