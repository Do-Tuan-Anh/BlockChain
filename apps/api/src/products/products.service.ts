import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductCondition, ProductStatus } from "@verimarket/types";
import { ethers } from "ethers";

export interface CreateProductDto {
  title: string;
  description: string;
  category: string;
  condition: ProductCondition;
  brand?: string;
  model?: string;
  basePrice: string; // in ETH
  imageUrls: string[];
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prepares ERC-721 compliant metadata JSON for IPFS pinning.
   */
  prepareNFTMetadata(dto: CreateProductDto, imageIpfsUri: string) {
    const productHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${dto.title}-${dto.brand || ""}-${dto.model || ""}-${Date.now()}`)
    );

    return {
      name: dto.title,
      description: dto.description,
      image: imageIpfsUri,
      attributes: [
        { trait_type: "Category", value: dto.category },
        { trait_type: "Condition", value: dto.condition },
        ...(dto.brand ? [{ trait_type: "Brand", value: dto.brand }] : []),
        ...(dto.model ? [{ trait_type: "Model", value: dto.model }] : []),
        { trait_type: "Currency", value: "ETH" },
        { trait_type: "BasePrice", value: dto.basePrice }
      ],
      productHash
    };
  }

  async findAll(params: {
    category?: string;
    condition?: ProductCondition;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    // In production, execute Prisma query with pagination & filters
    return {
      items: [
        {
          id: "prod-001",
          title: "Nike Air Max 1 '86 OG Big Bubble",
          description: "Authentic collectible sneakers in original vintage packaging.",
          category: "Footwear",
          condition: ProductCondition.NEW,
          brand: "Nike",
          basePrice: "0.5",
          currency: "ETH",
          status: ProductStatus.LISTED,
          nftTokenId: "1",
          nftContractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          metadataUri: "ipfs://QmMetadataCid123456789/product.json",
          images: [
            {
              id: "img-001",
              ipfsUri: "ipfs://QmSneakerImageCid987654321/nike-air-max-1.jpg",
              gatewayUrl: "https://ipfs.io/ipfs/QmSneakerImageCid987654321/nike-air-max-1.jpg"
            }
          ],
          seller: {
            username: "alice_collector",
            walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            rating: "5.0",
            reviewCount: 42
          }
        }
      ],
      total: 1,
      page: params.page || 1,
      limit: params.limit || 12
    };
  }

  async findOne(id: string) {
    if (id !== "prod-001" && id !== "1") {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return (await this.findAll({}))["items"][0];
  }
}

