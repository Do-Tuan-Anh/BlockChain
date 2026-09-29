// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./FeeManager.sol";

/**
 * @title Escrow
 * @notice Trust-minimized escrow mechanism for VeriMarket P2P transactions.
 * Locks buyer payment and holds product NFT until physical delivery confirmation,
 * refund, or dispute resolution.
 */
contract Escrow is IERC721Receiver, ReentrancyGuard, Pausable, Ownable2Step {
    enum EscrowState {
        NONE,
        HELD,
        RELEASED,
        REFUNDED,
        DISPUTED
    }

    struct EscrowDeposit {
        uint256 orderId;
        uint256 listingId;
        uint256 tokenId;
        address payable seller;
        address buyer;
        uint256 amount;
        EscrowState state;
        uint64 createdAt;
    }

    IERC721 public immutable nftContract;
    FeeManager public immutable feeManager;
    address public marketplaceContract;
    address public disputeResolutionContract;
    address public reputationContract;

    uint64 public constant AUTO_RELEASE_PERIOD = 14 days;

    // orderId => EscrowDeposit
    mapping(uint256 => EscrowDeposit) private _deposits;

    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);
    event DisputeResolutionUpdated(address indexed oldContract, address indexed newContract);
    event ReputationContractUpdated(address indexed oldContract, address indexed newContract);
    event EscrowDeposited(
        uint256 indexed orderId,
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address buyer,
        address seller,
        uint256 amount
    );
    event EscrowReleased(
        uint256 indexed orderId,
        address indexed seller,
        address indexed buyer,
        uint256 sellerAmount,
        uint256 feeAmount
    );
    event EscrowRefunded(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed seller,
        uint256 refundAmount
    );
    event EscrowDisputeOpened(uint256 indexed orderId, address indexed openedBy);
    event EscrowDisputeResolved(uint256 indexed orderId, bool refundedToBuyer, address indexed resolver);

    error OnlyMarketplace();
    error Unauthorized();
    error InvalidState(EscrowState current, EscrowState required);
    error DepositAlreadyExists(uint256 orderId);
    error DepositNotFound(uint256 orderId);
    error InvalidParameters();
    error EtherTransferFailed();
    error AutoReleasePeriodNotElapsed(uint256 elapsed, uint256 required);

    modifier onlyMarketplace() {
        if (msg.sender != marketplaceContract) revert OnlyMarketplace();
        _;
    }

    constructor(
        address initialOwner,
        address _nftContract,
        address _feeManager
    ) Ownable(initialOwner) {
        if (_nftContract == address(0) || _feeManager == address(0)) revert InvalidParameters();
        nftContract = IERC721(_nftContract);
        feeManager = FeeManager(payable(_feeManager));
    }

    function setMarketplace(address _marketplace) external onlyOwner {
        if (_marketplace == address(0)) revert InvalidParameters();
        emit MarketplaceUpdated(marketplaceContract, _marketplace);
        marketplaceContract = _marketplace;
    }

    function setDisputeResolution(address _disputeResolution) external onlyOwner {
        if (_disputeResolution == address(0)) revert InvalidParameters();
        emit DisputeResolutionUpdated(disputeResolutionContract, _disputeResolution);
        disputeResolutionContract = _disputeResolution;
    }

    function setReputation(address _reputation) external onlyOwner {
        if (_reputation == address(0)) revert InvalidParameters();
        emit ReputationContractUpdated(reputationContract, _reputation);
        reputationContract = _reputation;
    }

    /**
     * @notice Locks buyer payment in escrow. Called atomically by Marketplace during buyItem().
     */
    function depositPayment(
        uint256 orderId,
        uint256 listingId,
        uint256 tokenId,
        address payable seller,
        address buyer
    ) external payable onlyMarketplace whenNotPaused {
        if (orderId == 0 || msg.value == 0 || seller == address(0) || buyer == address(0)) {
            revert InvalidParameters();
        }
        if (_deposits[orderId].state != EscrowState.NONE) {
            revert DepositAlreadyExists(orderId);
        }

        _deposits[orderId] = EscrowDeposit({
            orderId: orderId,
            listingId: listingId,
            tokenId: tokenId,
            seller: seller,
            buyer: buyer,
            amount: msg.value,
            state: EscrowState.HELD,
            createdAt: uint64(block.timestamp)
        });

        emit EscrowDeposited(orderId, listingId, tokenId, buyer, seller, msg.value);
    }

    /**
     * @notice Buyer confirms physical item delivery; releases payment to seller and transfers NFT to buyer.
     * Can also be triggered by administrator to resolve an uncontested delivery.
     */
    function confirmDeliveryAndRelease(uint256 orderId) external nonReentrant whenNotPaused {
        EscrowDeposit storage deposit = _deposits[orderId];
        if (deposit.state == EscrowState.NONE) revert DepositNotFound(orderId);
        if (deposit.state != EscrowState.HELD && deposit.state != EscrowState.DISPUTED) {
            revert InvalidState(deposit.state, EscrowState.HELD);
        }
        if (msg.sender != deposit.buyer && msg.sender != owner()) {
            revert Unauthorized();
        }

        deposit.state = EscrowState.RELEASED;

        (uint256 feeAmount, uint256 netAmount) = feeManager.calculateFee(deposit.amount);

        // 1. Transfer NFT from Escrow to Buyer
        nftContract.safeTransferFrom(address(this), deposit.buyer, deposit.tokenId);

        // 2. Pay Seller net proceeds
        (bool successSeller, ) = deposit.seller.call{value: netAmount}("");
        if (!successSeller) revert EtherTransferFailed();

        // 3. Pay Protocol fee if applicable
        if (feeAmount > 0) {
            (bool successFee, ) = feeManager.feeRecipient().call{value: feeAmount}("");
            if (!successFee) revert EtherTransferFailed();
        }

        // 4. Update on-chain reputation if contract configured
        if (reputationContract != address(0)) {
            (bool repOk, ) = reputationContract.call(
                abi.encodeWithSignature("recordSuccessfulTrade(address,address,uint256)", deposit.seller, deposit.buyer, deposit.amount)
            );
            repOk; // silence unused return
        }

        emit EscrowReleased(orderId, deposit.seller, deposit.buyer, netAmount, feeAmount);
    }

    /**
     * @notice Allows the seller to claim payment if the buyer has neither confirmed delivery nor opened a dispute within the 14-day inspection window.
     */
    function claimTimeoutRelease(uint256 orderId) external nonReentrant whenNotPaused {
        EscrowDeposit storage deposit = _deposits[orderId];
        if (deposit.state == EscrowState.NONE) revert DepositNotFound(orderId);
        if (deposit.state != EscrowState.HELD) revert InvalidState(deposit.state, EscrowState.HELD);
        if (msg.sender != deposit.seller && msg.sender != owner()) revert Unauthorized();

        uint256 elapsed = block.timestamp - deposit.createdAt;
        if (elapsed < AUTO_RELEASE_PERIOD) {
            revert AutoReleasePeriodNotElapsed(elapsed, AUTO_RELEASE_PERIOD);
        }

        deposit.state = EscrowState.RELEASED;

        (uint256 feeAmount, uint256 netAmount) = feeManager.calculateFee(deposit.amount);

        // 1. Transfer NFT from Escrow to Buyer
        nftContract.safeTransferFrom(address(this), deposit.buyer, deposit.tokenId);

        // 2. Pay Seller net proceeds
        (bool successSeller, ) = deposit.seller.call{value: netAmount}("");
        if (!successSeller) revert EtherTransferFailed();

        // 3. Pay Protocol fee if applicable
        if (feeAmount > 0) {
            (bool successFee, ) = feeManager.feeRecipient().call{value: feeAmount}("");
            if (!successFee) revert EtherTransferFailed();
        }

        // 4. Update on-chain reputation if contract configured
        if (reputationContract != address(0)) {
            (bool repOk, ) = reputationContract.call(
                abi.encodeWithSignature("recordSuccessfulTrade(address,address,uint256)", deposit.seller, deposit.buyer, deposit.amount)
            );
            repOk;
        }

        emit EscrowReleased(orderId, deposit.seller, deposit.buyer, netAmount, feeAmount);
    }

    /**
     * @notice Refunds 100% of buyer payment and returns NFT to seller.
     * Callable by seller (voluntary cancellation before shipping) or administrator.
     */
    function refundBuyer(uint256 orderId) external nonReentrant whenNotPaused {
        EscrowDeposit storage deposit = _deposits[orderId];
        if (deposit.state == EscrowState.NONE) revert DepositNotFound(orderId);
        if (deposit.state != EscrowState.HELD && deposit.state != EscrowState.DISPUTED) {
            revert InvalidState(deposit.state, EscrowState.HELD);
        }
        if (msg.sender != deposit.seller && msg.sender != owner()) {
            revert Unauthorized();
        }

        deposit.state = EscrowState.REFUNDED;
        uint256 refundAmount = deposit.amount;

        // 1. Return NFT to Seller
        nftContract.safeTransferFrom(address(this), deposit.seller, deposit.tokenId);

        // 2. Return Ether to Buyer
        (bool successBuyer, ) = payable(deposit.buyer).call{value: refundAmount}("");
        if (!successBuyer) revert EtherTransferFailed();

        emit EscrowRefunded(orderId, deposit.buyer, deposit.seller, refundAmount);
    }

    /**
     * @notice Buyer, Seller, DisputeResolution, or Owner opens a formal dispute, freezing escrow funds.
     */
    function openDispute(uint256 orderId) external whenNotPaused {
        EscrowDeposit storage deposit = _deposits[orderId];
        if (deposit.state == EscrowState.NONE) revert DepositNotFound(orderId);
        if (deposit.state != EscrowState.HELD) revert InvalidState(deposit.state, EscrowState.HELD);
        if (
            msg.sender != deposit.buyer &&
            msg.sender != deposit.seller &&
            msg.sender != disputeResolutionContract &&
            msg.sender != owner()
        ) {
            revert Unauthorized();
        }

        deposit.state = EscrowState.DISPUTED;
        emit EscrowDisputeOpened(orderId, msg.sender);
    }

    /**
     * @notice Administrator arbitration to settle a contested order.
     * @notice Arbitration to settle a contested order. Callable by Owner or DisputeResolution contract.
     * @param orderId Target order
     * @param refundToBuyer If true: 100% refund to buyer, NFT to seller. If false: net funds to seller, NFT to buyer.
     */
    function resolveDispute(uint256 orderId, bool refundToBuyer) external nonReentrant {
        if (msg.sender != owner() && msg.sender != disputeResolutionContract) revert Unauthorized();
        EscrowDeposit storage deposit = _deposits[orderId];
        if (deposit.state != EscrowState.DISPUTED) revert InvalidState(deposit.state, EscrowState.DISPUTED);

        if (refundToBuyer) {
            deposit.state = EscrowState.REFUNDED;
            uint256 refundAmount = deposit.amount;

            nftContract.safeTransferFrom(address(this), deposit.seller, deposit.tokenId);

            (bool successBuyer, ) = payable(deposit.buyer).call{value: refundAmount}("");
            if (!successBuyer) revert EtherTransferFailed();

            emit EscrowRefunded(orderId, deposit.buyer, deposit.seller, refundAmount);
        } else {
            deposit.state = EscrowState.RELEASED;
            (uint256 feeAmount, uint256 netAmount) = feeManager.calculateFee(deposit.amount);

            nftContract.safeTransferFrom(address(this), deposit.buyer, deposit.tokenId);

            (bool successSeller, ) = deposit.seller.call{value: netAmount}("");
            if (!successSeller) revert EtherTransferFailed();

            if (feeAmount > 0) {
                (bool successFee, ) = feeManager.feeRecipient().call{value: feeAmount}("");
                if (!successFee) revert EtherTransferFailed();
            }

            emit EscrowReleased(orderId, deposit.seller, deposit.buyer, netAmount, feeAmount);
        }

        emit EscrowDisputeResolved(orderId, refundToBuyer, msg.sender);
    }

    function getEscrow(uint256 orderId) external view returns (EscrowDeposit memory) {
        if (_deposits[orderId].state == EscrowState.NONE) revert DepositNotFound(orderId);
        return _deposits[orderId];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

