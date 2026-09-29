// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "./Escrow.sol";

/**
 * @title Marketplace
 * @notice Non-custodial listing coordinator and checkout entry point for VeriMarket.
 * Atomically transitions purchased items into escrow custody.
 */
contract Marketplace is ReentrancyGuard, Pausable, Ownable2Step {
    enum ListingStatus {
        NONE,
        ACTIVE,
        CANCELLED,
        SOLD
    }

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        ListingStatus status;
        uint64 createdAt;
    }

    IERC721 public immutable nftContract;
    Escrow public immutable escrowContract;

    uint256 private _nextListingId;
    uint256 private _nextOrderId;

    // listingId => Listing
    mapping(uint256 => Listing) private _listings;

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event ItemPurchased(
        uint256 indexed listingId,
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address buyer,
        address seller,
        uint256 price
    );

    error InvalidParameters();
    error NotTokenOwner(address caller, address actualOwner);
    error NotApprovedForMarketplace();
    error ListingNotActive(uint256 listingId);
    error Unauthorized();
    error IncorrectPayment(uint256 provided, uint256 required);
    error CannotBuyOwnListing();

    constructor(
        address initialOwner,
        address _nftContract,
        address payable _escrowContract
    ) Ownable(initialOwner) {
        if (_nftContract == address(0) || _escrowContract == address(0)) revert InvalidParameters();
        nftContract = IERC721(_nftContract);
        escrowContract = Escrow(_escrowContract);
        _nextListingId = 1;
        _nextOrderId = 1;
    }

    /**
     * @notice Lists an NFT for sale at a fixed price in native currency (wei).
     * @param tokenId ERC-721 token ID
     * @param price Listing price in wei
     */
    function createListing(uint256 tokenId, uint256 price) external whenNotPaused returns (uint256) {
        if (price == 0) revert InvalidParameters();
        if (nftContract.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner(msg.sender, nftContract.ownerOf(tokenId));
        }
        if (!nftContract.isApprovedForAll(msg.sender, address(this)) && nftContract.getApproved(tokenId) != address(this)) {
            revert NotApprovedForMarketplace();
        }

        uint256 listingId = _nextListingId++;

        _listings[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            status: ListingStatus.ACTIVE,
            createdAt: uint64(block.timestamp)
        });

        emit ListingCreated(listingId, tokenId, msg.sender, price);
        return listingId;
    }

    /**
     * @notice Cancels an active listing.
     * @param listingId Target listing ID
     */
    function cancelListing(uint256 listingId) external whenNotPaused {
        Listing storage listing = _listings[listingId];
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive(listingId);
        if (msg.sender != listing.seller && msg.sender != owner()) revert Unauthorized();

        listing.status = ListingStatus.CANCELLED;
        emit ListingCancelled(listingId, listing.seller);
    }

    /**
     * @notice Purchases a listed product.
     * Atomically transfers NFT to Escrow contract and forwards buyer payment to Escrow.
     * @param listingId Target listing ID
     * @return orderId Unique order tracking identifier generated on-chain
     */
    function buyItem(uint256 listingId) external payable nonReentrant whenNotPaused returns (uint256) {
        Listing storage listing = _listings[listingId];
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive(listingId);
        if (msg.sender == listing.seller) revert CannotBuyOwnListing();
        if (msg.value != listing.price) revert IncorrectPayment(msg.value, listing.price);

        listing.status = ListingStatus.SOLD;
        uint256 orderId = _nextOrderId++;

        // 1. Transfer NFT from Seller to Escrow contract
        nftContract.safeTransferFrom(listing.seller, address(escrowContract), listing.tokenId);

        // 2. Deposit payment into Escrow
        escrowContract.depositPayment{value: msg.value}(
            orderId,
            listingId,
            listing.tokenId,
            listing.seller,
            msg.sender
        );

        emit ItemPurchased(listingId, orderId, listing.tokenId, msg.sender, listing.seller, msg.value);
        return orderId;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        if (_listings[listingId].status == ListingStatus.NONE) revert InvalidParameters();
        return _listings[listingId];
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}

