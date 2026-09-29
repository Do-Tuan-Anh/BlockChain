// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAegisMedRegistry.sol";

/**
 * @title AegisMedRegistry
 * @dev Decentralized participant registry for pharmaceutical supply chain stakeholders.
 * Provides on-chain attestation for FDA/EMA regulated entities (Manufacturers, Carriers, Pharmacies, Oracles).
 */
contract AegisMedRegistry is AccessControl, IAegisMedRegistry {
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant CARRIER_ROLE = keccak256("CARRIER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PHARMACY_ROLE = keccak256("PHARMACY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    mapping(address => ActorInfo) private _actors;

    error ActorAlreadyRegistered(address actor);
    error ActorNotRegistered(address actor);
    error ActorSuspended(address actor);
    error InvalidZeroAddress();
    error EmptyStringArgument();

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(REGULATOR_ROLE, initialAdmin);

        _setRoleAdmin(MANUFACTURER_ROLE, REGULATOR_ROLE);
        _setRoleAdmin(CARRIER_ROLE, REGULATOR_ROLE);
        _setRoleAdmin(DISTRIBUTOR_ROLE, REGULATOR_ROLE);
        _setRoleAdmin(PHARMACY_ROLE, REGULATOR_ROLE);
        _setRoleAdmin(ORACLE_ROLE, REGULATOR_ROLE);
    }

    /**
     * @notice Registers a new stakeholder in the supply chain. Only callable by REGULATOR_ROLE.
     */
    function registerActor(
        address actor,
        bytes32 role,
        string calldata legalEntityName,
        string calldata licenseNumber,
        string calldata jurisdiction
    ) external onlyRole(REGULATOR_ROLE) {
        if (actor == address(0)) revert InvalidZeroAddress();
        if (bytes(legalEntityName).length == 0 || bytes(licenseNumber).length == 0) {
            revert EmptyStringArgument();
        }

        _actors[actor] = ActorInfo({
            legalEntityName: legalEntityName,
            licenseNumber: licenseNumber,
            jurisdiction: jurisdiction,
            isActive: true,
            registeredAt: block.timestamp
        });

        _grantRole(role, actor);
        emit ActorRegistered(actor, role, legalEntityName, licenseNumber);
    }

    /**
     * @notice Revokes a stakeholder's role and flags their account as inactive.
     */
    function revokeActor(
        address actor,
        bytes32 role,
        string calldata reason
    ) external onlyRole(REGULATOR_ROLE) {
        if (actor == address(0)) revert InvalidZeroAddress();
        _actors[actor].isActive = false;
        _revokeRole(role, actor);
        emit ActorRevoked(actor, role, reason);
    }

    /**
     * @notice Toggles active status of an actor without removing assigned roles.
     */
    function setActorStatus(address actor, bool isActive) external onlyRole(REGULATOR_ROLE) {
        if (_actors[actor].registeredAt == 0) revert ActorNotRegistered(actor);
        _actors[actor].isActive = isActive;
        emit ActorStatusToggled(actor, isActive);
    }

    function isActorActive(address actor) external view returns (bool) {
        return _actors[actor].isActive;
    }

    function getActorInfo(address actor) external view returns (ActorInfo memory) {
        return _actors[actor];
    }
}
