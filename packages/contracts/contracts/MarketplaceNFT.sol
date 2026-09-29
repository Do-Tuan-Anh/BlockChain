// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title MarketplaceNFT
 * @notice ERC-721 token representing physical e-commerce products with verifiable decentralized metadata.
 * Does not store private personal info (PII); points immutably to IPFS metadata.
 */
contract MarketplaceNFT is ERC721URIStorage, Ownable2Step {
    uint256 private _nextTokenId;

    event ProductNFTMinted(uint256 indexed tokenId, address indexed creator, string metadataURI);

    error InvalidRecipient();
    error EmptyMetadataURI();

    constructor(address initialOwner)
        ERC721("VeriMarket Physical Asset Certificate", "VMKT")
        Ownable(initialOwner)
    {
        _nextTokenId = 1;
    }

    /**
     * @notice Mints a new product certificate NFT.
     * @param to Recipient address (seller/creator)
     * @param metadataURI IPFS URI containing non-sensitive product attributes (ipfs://...)
     */
    function mintProductNFT(address to, string calldata metadataURI) external returns (uint256) {
        if (to == address(0)) revert InvalidRecipient();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit ProductNFTMinted(tokenId, to, metadataURI);
        return tokenId;
    }

    /**
     * @notice Burns an NFT if a physical product is decommissioned or destroyed.
     */
    function burn(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender && owner() != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _burn(tokenId);
    }
}

