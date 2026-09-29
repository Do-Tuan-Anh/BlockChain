// Shared TypeScript definitions for VeriMarket

export enum Role {
  BUYER = "BUYER",
  SELLER = "SELLER",
  ADMIN = "ADMIN",
}

export enum ProductStatus {
  DRAFT = "DRAFT",
  MINTED = "MINTED",
  LISTED = "LISTED",
  SOLD = "SOLD",
  ARCHIVED = "ARCHIVED",
}

export enum ProductCondition {
  NEW = "NEW",
  LIKE_NEW = "LIKE_NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
}

export enum ListingStatus {
  ACTIVE = "ACTIVE",
  CANCELLED = "CANCELLED",
  SOLD = "SOLD",
}

export enum OrderStatus {
  PURCHASE_PENDING = "PURCHASE_PENDING",
  PAID = "PAID",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  DISPUTED = "DISPUTED",
}

export enum PaymentStatus {
  ESCROWED = "ESCROWED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
}

export enum ShipmentStatus {
  PREPARING = "PREPARING",
  SHIPPED = "SHIPPED",
  IN_TRANSIT = "IN_TRANSIT",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
}

export enum DisputeStatus {
  OPEN = "OPEN",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED_REFUND = "RESOLVED_REFUND",
  RESOLVED_PAYMENT = "RESOLVED_PAYMENT",
}

export enum DisputeReason {
  NOT_RECEIVED = "NOT_RECEIVED",
  DAMAGED = "DAMAGED",
  NOT_AS_DESCRIBED = "NOT_AS_DESCRIBED",
  OTHER = "OTHER",
}

export interface NFTMetadataAttribute {
  trait_type: string;
  value: string | number;
}

export interface ProductNFTMetadata {
  name: string;
  description: string;
  image: string; // ipfs://...
  external_url?: string;
  attributes: NFTMetadataAttribute[];
  productHash: string;
}

export interface SIWEMessageParams {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  user: {
    id: string;
    walletAddress: string;
    username: string;
    role: Role;
    avatarUrl?: string;
    isVerified: boolean;
  };
}

export interface BlockchainListing {
  listingId: string;
  tokenId: string;
  seller: string;
  price: string;
  status: ListingStatus;
}

export interface BlockchainEscrowRecord {
  orderId: string;
  listingId: string;
  tokenId: string;
  seller: string;
  buyer: string;
  amount: string;
  state: "NONE" | "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED";
}

