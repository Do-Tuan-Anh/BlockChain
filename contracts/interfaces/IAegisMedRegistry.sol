// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title IAegisMedRegistry
 * @notice Interface for decentralized participant role-based verification compliant with FDA DSCSA regulations.
 */
interface IAegisMedRegistry is IAccessControl {
    function REGULATOR_ROLE() external view returns (bytes32);
    function MANUFACTURER_ROLE() external view returns (bytes32);
    function CARRIER_ROLE() external view returns (bytes32);
    function DISTRIBUTOR_ROLE() external view returns (bytes32);
    function PHARMACY_ROLE() external view returns (bytes32);
    function ORACLE_ROLE() external view returns (bytes32);

    struct ActorInfo {
        string legalEntityName;
        string licenseNumber;      // e.g. FDA Establishment Identifier (FEI) or DEA number
        string jurisdiction;       // e.g. "US-FDA", "EU-EMA"
        bool isActive;
        uint256 registeredAt;
    }

    event ActorRegistered(address indexed actor, bytes32 indexed role, string legalEntityName, string licenseNumber);
    event ActorRevoked(address indexed actor, bytes32 indexed role, string reason);
    event ActorStatusToggled(address indexed actor, bool isActive);

    function registerActor(
        address actor,
        bytes32 role,
        string calldata legalEntityName,
        string calldata licenseNumber,
        string calldata jurisdiction
    ) external;

    function revokeActor(address actor, bytes32 role, string calldata reason) external;

    function isActorActive(address actor) external view returns (bool);

    function getActorInfo(address actor) external view returns (ActorInfo memory);
}

