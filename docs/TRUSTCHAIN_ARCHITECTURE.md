# TRUSTCHAIN: Master System Architecture & Engineering Blueprint

> **Academic & Production-Grade Specification for a Decentralized P2P Physical Goods Marketplace**  
> *Combining EVM Smart-Contract Escrow, ERC-721 Digital Product Passports, EIP-4361 Wallet Authentication, and Privacy-Preserving Off-Chain Relational Storage.*

---

## Executive Summary & Core Design Thesis

### "What Does Blockchain Actually Solve in TrustChain?"

In traditional e-commerce (e.g., eBay, Amazon, Craigslist), trust is either entirely centralized (the platform acts as a custodial escrow and monopoly intermediary, charging 10%–15% take-rates while retaining absolute power to freeze accounts without recourse) or non-existent (cash-in-hand P2P classifieds where counterparty risk and fraud run rampant).

**TrustChain** deploys blockchain exclusively for the architectural functions where decentralization, cryptographic guarantees, and censorship-resistant settlement provide indisputable real-world utility:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE TRUSTCHAIN TRUST LAYER                              │
├───────────────────────────────┬─────────────────────────────────────────────────────────┤
│ Concrete Blockchain Property  │ Concrete Architectural Problem Solved in TrustChain      │
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 1. Programmable Escrow        │ Eliminates counterparty risk in physical trade without a│
│    (Smart Contracts)          │ custodial banking intermediary. Funds cannot be seized  │
│                               │ or withheld arbitrarily by marketplace operators.       │
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 2. Tamper-Resistant Ledger    │ Guarantees an immutable, auditable log of financial     │
│    (EVM State & Events)       │ state transitions (Locked -> Shipped -> Delivered ->   │
│                               │ Released/Refunded) that no database admin can rewrite.  │
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 3. Digital Product Passport   │ Creates an unforgeable, chronologically linked chain of │
│    (ERC-721 Non-Fungible)     │ custody across secondary/tertiary resales, proving past │
│                               │ transaction prices, dates, and previous wallet owners.  │
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 4. Cryptographic Identity     │ Replaces brittle passwords, password leaks, credential  │
│    (EIP-4361 SIWE Signatures) │ stuffing, and email hijacking with secp256k1 signatures.│
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 5. Off-Chain Proof of Data    │ Encrypts private shipping and dispute evidence off-chain│
│    Integrity (Keccak-256)     │ while anchoring cryptographic hashes on-chain to prevent│
│                               │ retroactive tampering or forged claims.                 │
├───────────────────────────────┼─────────────────────────────────────────────────────────┤
│ 6. Sybil-Resistant Reputation │ Ties seller reputation scores exclusively to verified,   │
│    (Soulbound Metrics)        │ on-chain completed escrow settlements, preventing fake  │
│                               │ review-stuffing and self-purchase rating inflation.     │
└───────────────────────────────┴─────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Strict Anti-Gimmick Rule & Zero PII On-Chain**:
> The physical object itself cannot be "put inside a blockchain block". TrustChain clearly distinguishes between **legal physical possession**, **seller-attested condition**, and **cryptographically verifiable digital ownership record**. Full names, phone numbers, home shipping addresses, GPS coordinates, tracking numbers, and raw dispute photographs are **NEVER placed on the public blockchain**.

---

## 1. Network Selection & Technical Justification

### Recommended Network: **Base Sepolia (Ethereum Layer 2)**

| Evaluation Criteria | Ethereum Sepolia (L1) | Polygon Amoy (PoS) | Base Sepolia (OP Stack L2) | **TrustChain Decision** |
| :--- | :--- | :--- | :--- | :--- |
| **Security Heritage** | Native L1 Proof-of-Stake | Independent PoS Validator Set | Inherits Ethereum L1 Fraud Proof Security | **Base Sepolia** (Full L1 inheritance) |
| **Transaction Fee** | \$2.50 – \$35.00 per tx | < \$0.01 per tx | **< \$0.005 per tx** (Post-Dencun EIP-4844) | **Base Sepolia** (Micro-cent fees for P2P) |
| **Block Time / Finality**| 12 seconds | ~2.1 seconds | **2.0 seconds** | **Base Sepolia** (Web2-like latency) |
| **Account Abstraction** | High gas overhead for ERC-4337 | Supported | First-class Coinbase Smart Wallet integration | **Base Sepolia** (Seamless onboarding) |
| **EVM Equivalence** | Native | EVM Compatible | **100% Bytecode Equivalent** to EVM Cancun | **Base Sepolia** (Zero tooling friction) |

**Justification Summary:**  
For a P2P physical goods marketplace selling items ranging from \$20 to \$2,000, paying \$15 in Ethereum L1 gas fees to lock and release escrow is economically absurd. **Base Sepolia** provides the ideal balance: micro-cent transaction fees via EIP-4844 blob storage, 2-second block confirmations for rapid UI updates, complete EVM equivalence (Hardhat, OpenZeppelin v5, viem/wagmi), and the robust security backing of the Ethereum L1 rollup settlement.

---

## 2. System Architecture & Topology

TrustChain utilizes a decoupled, three-tier hybrid topology:
1. **Presentation & Web3 Layer (`apps/web`)**: Next.js App Router, Tailwind CSS, shadcn/ui, wagmi/viem for Web3 provider interaction.
2. **Application & Private Data Layer (`apps/api` + PostgreSQL + Redis)**: NestJS modular service handling EIP-4361 SIWE authentication, off-chain PII (shipping addresses, tracking numbers), IPFS metadata staging, and search.
3. **Decentralized Settlement & Indexing Layer (`packages/contracts` + `apps/indexer`)**: Modular Solidity smart contracts deployed on Base Sepolia, observed by a resilient background blockchain event indexer that synchronizes on-chain state changes into PostgreSQL idempotently.

```mermaid
flowchart TB
    subgraph Client["Frontend Client (Next.js 14 + Wagmi)"]
        UI["Marketplace UI & Dashboard"]
        Wallet["Web3 Provider (MetaMask / Coinbase Smart Wallet)"]
    end

    subgraph OffChain["Secure Backend & Application Storage"]
        API["NestJS API Gateway"]
        AuthModule["EIP-4361 SIWE Auth Guard"]
        PG[(PostgreSQL 16 DB\n• User Profiles & PII\n• Shipping Addresses\n• Off-chain Search/Catalog)]
        Redis[(Redis 7 Cache\n• Nonce TTL\n• Rate Limiting)]
        IPFS["Decentralized Storage (IPFS / Pinata)\n• Product Media\n• ERC-721 Metadata JSON"]
    end

    subgraph OnChain["Base Sepolia Blockchain (EVM Cancun)"]
        NFT["ProductNFT.sol (ERC-721)"]
        Market["Marketplace.sol (Listing Registry)"]
        Escrow["Escrow.sol (Payment & Custody)"]
        Rep["Reputation.sol (On-Chain Score)"]
        Dispute["DisputeResolution.sol (Arbitration)"]
        FeeMgr["FeeManager.sol (Platform Fee)"]
    end

    subgraph Indexing["Blockchain Event Synchronization"]
        Worker["Event Indexer Worker\n(viem watchContractEvent + Catchup Scan)"]
    end

    UI -->|1. REST / JSON (JWT Session)| API
    Wallet -->|2. EIP-712 Signatures & Nonces| API
    Wallet -->|3. On-chain Transactions (Escrow/Buy/Confirm)| OnChain
    API -->|Read/Write PII & Nonces| PG
    API -->|Nonce Cache & Session TTL| Redis
    API -->|Pin Product Metadata & Photos| IPFS
    
    OnChain -->|Emit State Machine Events| Worker
    Worker -->|Sync Verified Blockchain State| PG
    PG -.->|Reflect Real-time Status| UI
```

---

## 3. End-to-End Sequence Diagrams

### 3.1. Wallet Authentication (EIP-4361 Sign-In with Ethereum)

Prevents password leaks, credential stuffing, and replay attacks using single-use cryptographic nonces.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Wallet
    participant Web as Next.js Client
    participant API as NestJS API
    participant Redis as Redis (Nonce Cache)
    participant PG as PostgreSQL

    User->>Web: Click "Connect Wallet"
    Web->>API: GET /api/v1/auth/nonce?address=0x123...
    API->>Redis: SETEX nonce:0x123 300 "rand-uuid-token"
    API-->>Web: 200 OK { nonce: "rand-uuid-token" }
    
    Web->>User: Request EIP-4361 Message Signature via Wallet
    Note over User: Signs standard SIWE text:<br/>"TrustChain wants you to sign in with...<br/>Nonce: rand-uuid-token<br/>Issued At: 2026-09-24T..."
    User-->>Web: Returns ECDSA Signature (0xabc...)
    
    Web->>API: POST /api/v1/auth/verify { address, signature, message }
    API->>Redis: GET nonce:0x123
    Note over API: 1. Verify message.nonce == stored nonce<br/>2. Verify message not expired<br/>3. Recover signer address via viem.recoverAddress()<br/>4. Assert recoveredAddress == address
    API->>Redis: DEL nonce:0x123 (Prevent Replay)
    API->>PG: Upsert User (walletAddress: 0x123)
    API-->>Web: 200 OK { accessToken: "jwt-token-..." }
    Web-->>User: Authenticated Session Established
```

---

### 3.2. Product Listing & NFT Digital Product Passport Minting

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Seller Wallet
    participant Web as Next.js Client
    participant API as NestJS API
    participant IPFS as IPFS Gateway (Pinata)
    participant NFT as ProductNFT.sol (ERC-721)
    participant Mkt as Marketplace.sol

    Seller->>Web: Enter Product Info & Upload Photos
    Web->>API: POST /api/v1/products (Multipart Form)
    API->>IPFS: Upload Photos -> ipfs://bafy...images
    API->>IPFS: Upload ERC-721 Metadata JSON -> ipfs://bafy...meta
    API->>API: Compute metadataHash = keccak256(metaJSON)
    API-->>Web: Return { ipfsUri, metadataHash, listingDraftId }
    
    Web->>Seller: Prompt Wallet Transaction: mintAndApprove()
    Seller->>NFT: mint(seller, ipfsUri, metadataHash)
    NFT-->>Seller: NFT #1024 Minted
    Seller->>NFT: approve(MarketplaceContract, #1024)
    
    Web->>Seller: Prompt Wallet Transaction: createListing()
    Seller->>Mkt: createListing(nftContract, #1024, price: 1.5 ETH)
    Mkt-->>Mkt: Emit ProductListed(listingId: 42, #1024, 1.5 ETH)
    
    Note over Web: Indexer catches event and updates PostgreSQL status to 'LISTED'
```

---

### 3.3. Purchase, Escrow Locking, Shipping & Delivery Settlement

This is the core end-to-end transaction mechanism of TrustChain:

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Buyer Wallet
    actor Seller as Seller Wallet
    participant Web as Next.js Client
    participant API as NestJS API
    participant Mkt as Marketplace.sol
    participant Escrow as Escrow.sol
    participant NFT as ProductNFT.sol
    participant Rep as Reputation.sol
    participant Indexer as Event Indexer

    Buyer->>Web: Click "Buy with Escrow" (1.5 ETH)
    Web->>API: POST /api/v1/orders/initiate { listingId: 42, shippingAddress }
    API-->>Web: Order Draft Created (Private PII stored in DB)
    
    Web->>Buyer: Prompt Wallet: buyItem{value: 1.5 ETH}(listingId: 42)
    Buyer->>Mkt: buyItem{value: 1.5 ETH}(42)
    Mkt->>Escrow: depositPayment{value: 1.5 ETH}(orderId: 42, buyer, seller, nftContract, #1024)
    Mkt->>NFT: transferFrom(seller, EscrowContract, #1024)
    Escrow-->>Escrow: Lock 1.5 ETH & Custody NFT #1024
    Escrow-->>Indexer: Emit PaymentLocked(orderId: 42, amount: 1.5 ETH)
    
    Note over Indexer: Syncs Order status to 'PAYMENT_LOCKED'
    
    Seller->>Web: Ship Package & Enter Carrier Tracking
    Web->>API: POST /api/v1/orders/42/ship { carrier: "FedEx", trackingNumber: "78291..." }
    API-->>Seller: Tracking Recorded (Off-Chain Only!)
    
    Buyer->>Web: Package Delivered & Inspected -> Click "Confirm Delivery"
    Web->>Buyer: Prompt Wallet: confirmDelivery(orderId: 42)
    Buyer->>Escrow: confirmDelivery(orderId: 42)
    
    Escrow->>Escrow: Compute Fee (2.5% = 0.0375 ETH)
    Escrow->>Seller: Transfer (1.4625 ETH)
    Escrow->>Escrow: Transfer Fee to FeeManager (0.0375 ETH)
    Escrow->>NFT: safeTransferFrom(EscrowContract, Buyer, #1024)
    Escrow->>Rep: recordSuccessfulTrade(seller, buyer, 1.5 ETH)
    Escrow-->>Indexer: Emit OrderCompleted(orderId: 42, buyer, seller)
    
    Note over Indexer: Syncs Order to 'COMPLETED'. Buyer now owns NFT #1024!
```

---

### 3.4. Dispute Escalation & Arbitration Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Buyer Wallet
    actor Seller as Seller Wallet
    actor Arbiter as Designated Arbitrator
    participant API as NestJS API
    participant Dispute as DisputeResolution.sol
    participant Escrow as Escrow.sol
    participant Indexer as Event Indexer

    Buyer->>API: POST /api/v1/orders/42/dispute { reason: "Counterfeit", evidencePhotos }
    API->>API: Hash Evidence: evidenceHash = sha256(evidenceData)
    API-->>Buyer: Returns evidenceHash
    
    Buyer->>Dispute: openDispute(orderId: 42, evidenceHash)
    Dispute->>Escrow: freezeEscrow(orderId: 42)
    Dispute-->>Indexer: Emit DisputeOpened(orderId: 42, buyer, evidenceHash)
    
    Note over Arbiter: Arbiter reviews encrypted evidence off-chain & compares on-chain hash
    
    alt Ruling in favor of Buyer (Refund)
        Arbiter->>Dispute: resolveDispute(orderId: 42, RESOLVED_BUYER)
        Dispute->>Escrow: refundBuyer(orderId: 42)
        Escrow->>Buyer: Transfer 1.5 ETH refund
        Escrow->>Seller: Return NFT #1024
        Dispute-->>Indexer: Emit DisputeResolved(orderId: 42, RESOLVED_BUYER)
    else Ruling in favor of Seller (Release)
        Arbiter->>Dispute: resolveDispute(orderId: 42, RESOLVED_SELLER)
        Dispute->>Escrow: releaseSeller(orderId: 42)
        Escrow->>Seller: Transfer 1.4625 ETH (minus fee)
        Escrow->>Buyer: Transfer NFT #1024
        Dispute-->>Indexer: Emit DisputeResolved(orderId: 42, RESOLVED_SELLER)
    end
```

---

## 4. Comprehensive Database Design & Schema

### 4.1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Product : lists
    User ||--o{ Order : buys
    User ||--o{ Order : sells
    User ||--o{ Review : writes
    User ||--o{ Review : receives
    User ||--o{ Dispute : opens
    User ||--o{ Notification : receives
    User ||--o| ReputationScore : maintains

    Product ||--|{ ProductImage : contains
    Product ||--|| NFT : mints
    Product ||--o{ Listing : offers

    Listing ||--o{ Order : generates

    Order ||--|| OrderItem : includes
    Order ||--|| Escrow : holds
    Order ||--|| Payment : records
    Order ||--o| Shipment : ships
    Order ||--o| Review : rates
    Order ||--o| Dispute : contests

    Dispute ||--|{ DisputeEvidence : substantiates
    Order ||--o{ Transaction : logs
```

---

### 4.2. Authoritative Data Matrix: On-Chain vs. Off-Chain

| Entity & Attribute | Storage Location | Authoritative Source | Justification |
| :--- | :--- | :--- | :--- |
| **User Full Name, Phone, Email** | PostgreSQL (Encrypted at rest) | **Database** | **Zero PII on-chain**; strictly prevents doxxing and adheres to GDPR Article 17 ("Right to be Forgotten"). |
| **Wallet Address (`0x...`)** | On-Chain & PostgreSQL Index | **Blockchain** | Public cryptographic identifier used for EIP-4361 authentication and contract execution. |
| **Product Description & Specs** | PostgreSQL & IPFS Metadata | **IPFS / Database** | Storing text strings on-chain costs exorbitant gas ($>\$50/kB$) with zero cryptographic benefit. |
| **Product Images & Video** | IPFS (Pinata Gateway) | **IPFS CID** | Decentralized, immutable content-addressable storage; URI hash is pinned in ERC-721 tokenURI. |
| **NFT Token ID & Contract** | Base Sepolia (`ProductNFT.sol`) | **Blockchain** | Authoritative digital certificate of ownership and transfer history. |
| **Escrow Funds & Lock State** | Base Sepolia (`Escrow.sol`) | **Blockchain** | Trustless custody; only smart-contract logic can release or refund funds. |
| **Physical Shipping Tracking #** | PostgreSQL (Encrypted at rest) | **Database** | Private logistical data. Publicizing tracking numbers leaks recipient city, date, and identity. |
| **Dispute Evidence Data** | Secure Backend / Private S3 | **Database** | Contains private unboxing videos, receipts, and personal photos. |
| **Dispute Evidence Hash** | Base Sepolia (`DisputeResolution.sol`)| **Blockchain** | Anchors cryptographic proof (`keccak256`) that evidence was not altered post-facto. |
| **Reputation Trade Counter** | Base Sepolia (`Reputation.sol`) | **Blockchain** | Immune to database admin tampering, fake bot reviews, and sybil manipulation. |

---

### 4.3. Production Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  BUYER
  SELLER
  ARBITRATOR
  ADMIN
}

enum ProductCondition {
  BRAND_NEW
  LIKE_NEW
  VERY_GOOD
  GOOD
  FAIR
}

enum ListingStatus {
  ACTIVE
  CANCELLED
  SOLD
}

enum OrderStatus {
  CREATED
  PAYMENT_LOCKED
  SHIPPED
  DELIVERED
  COMPLETED
  DISPUTED
  REFUNDED
  CANCELLED
}

enum EscrowState {
  AWAITING_PAYMENT
  LOCKED
  RELEASED
  REFUNDED
  FROZEN_DISPUTE
}

enum DisputeStatus {
  NONE
  OPEN
  UNDER_REVIEW
  RESOLVED_BUYER
  RESOLVED_SELLER
  CANCELLED
}

model User {
  id              String           @id @default(uuid())
  walletAddress   String           @unique @map("wallet_address") // Normalized lowercase (0x...)
  username        String           @unique
  displayName     String?          @map("display_name")
  avatarUrl       String?          @map("avatar_url")
  bio             String?          @db.Text
  role            Role             @default(BUYER)
  isVerified      Boolean          @default(false) @map("is_verified")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  products        Product[]        @relation("SellerProducts")
  buyerOrders     Order[]          @relation("BuyerOrders")
  sellerOrders    Order[]          @relation("SellerOrders")
  reviewsWritten  Review[]         @relation("ReviewsWritten")
  reviewsReceived Review[]         @relation("ReviewsReceived")
  openedDisputes  Dispute[]        @relation("UserOpenedDisputes")
  reputation      ReputationScore?
  notifications   Notification[]

  @@index([walletAddress])
  @@map("users")
}

model ReputationScore {
  id                    String   @id @default(uuid())
  userId                String   @unique @map("user_id")
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  onChainTradesCount    Int      @default(0) @map("on_chain_trades_count")
  successfulDeliveries  Int      @default(0) @map("successful_deliveries")
  disputesInitiated     Int      @default(0) @map("disputes_initiated")
  disputesWon           Int      @default(0) @map("disputes_won")
  disputesLost          Int      @default(0) @map("disputes_lost")
  averageStarRating     Decimal  @default(5.00) @map("average_star_rating") @db.Decimal(3, 2)
  totalReviewsCount     Int      @default(0) @map("total_reviews_count")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("reputation_scores")
}

model Product {
  id               String           @id @default(uuid())
  sellerId         String           @map("seller_id")
  seller           User             @relation("SellerProducts", fields: [sellerId], references: [id], onDelete: Cascade)
  title            String
  description      String           @db.Text
  category         String
  condition        ProductCondition @default(BRAND_NEW)
  brand            String?
  model            String?
  price            Decimal          @db.Decimal(18, 6) // In ETH
  currency         String           @default("ETH")
  qrCodeUrl        String?          @map("qr_code_url")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  nft              NFT?
  images           ProductImage[]
  listings         Listing[]
  orderItems       OrderItem[]

  @@index([sellerId])
  @@index([category])
  @@index([price])
  @@map("products")
}

model ProductImage {
  id         String   @id @default(uuid())
  productId  String   @map("product_id")
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  ipfsUri    String   @map("ipfs_uri")    // ipfs://bafy...
  gatewayUrl String   @map("gateway_url") // Cloudflare/Pinata HTTP Gateway
  orderIndex Int      @default(0) @map("order_index")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([productId])
  @@map("product_images")
}

model NFT {
  id                 String   @id @default(uuid())
  productId          String   @unique @map("product_id")
  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  contractAddress    String   @map("contract_address")
  tokenId            BigInt   @map("token_id")
  tokenUri           String   @map("token_uri") // ipfs://... metadata JSON
  metadataHash       String   @map("metadata_hash") // keccak256 hash of metadata
  mintTxHash         String   @map("mint_tx_hash")
  currentOwnerWallet String   @map("current_owner_wallet")
  createdAt          DateTime @default(now()) @map("created_at")

  @@unique([contractAddress, tokenId])
  @@index([currentOwnerWallet])
  @@map("nfts")
}

model Listing {
  id                  String        @id @default(uuid())
  productId           String        @map("product_id")
  product             Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  blockchainListingId BigInt?       @unique @map("blockchain_listing_id")
  price               Decimal       @db.Decimal(18, 6)
  status              ListingStatus @default(ACTIVE)
  createdAt           DateTime      @default(now()) @map("created_at")

  orders              Order[]

  @@index([productId])
  @@index([status])
  @@map("listings")
}

model Order {
  id              String      @id @default(uuid())
  listingId       String      @map("listing_id")
  listing         Listing     @relation(fields: [listingId], references: [id])
  buyerId         String      @map("buyer_id")
  buyer           User        @relation("BuyerOrders", fields: [buyerId], references: [id])
  sellerId        String      @map("seller_id")
  seller          User        @relation("SellerOrders", fields: [sellerId], references: [id])
  totalAmount     Decimal     @map("total_amount") @db.Decimal(18, 6)
  status          OrderStatus @default(CREATED)
  blockchainTx    String?     @map("blockchain_tx")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  item            OrderItem?
  escrow          Escrow?
  payment         Payment?
  shipment        Shipment?
  review          Review?
  dispute         Dispute?
  transactions    Transaction[]

  @@index([buyerId, status])
  @@index([sellerId, status])
  @@map("orders")
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String   @unique @map("order_id")
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String   @map("product_id")
  product     Product  @relation(fields: [productId], references: [id])
  price       Decimal  @db.Decimal(18, 6)

  @@map("order_items")
}

model Escrow {
  id                  String      @id @default(uuid())
  orderId             String      @unique @map("order_id")
  order               Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  blockchainOrderId   BigInt      @unique @map("blockchain_order_id")
  contractAddress     String      @map("contract_address")
  state               EscrowState @default(AWAITING_PAYMENT)
  lockedAmount        Decimal     @map("locked_amount") @db.Decimal(18, 6)
  feeAmount           Decimal     @map("fee_amount") @db.Decimal(18, 6)
  autoReleaseDeadline DateTime?   @map("auto_release_deadline")
  createdAt           DateTime    @default(now()) @map("created_at")
  updatedAt           DateTime    @updatedAt @map("updated_at")

  @@index([blockchainOrderId])
  @@map("escrows")
}

model Payment {
  id          String   @id @default(uuid())
  orderId     String   @unique @map("order_id")
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  txHash      String   @unique @map("tx_hash")
  amount      Decimal  @db.Decimal(18, 6)
  currency    String   @default("ETH")
  confirmedAt DateTime @default(now()) @map("confirmed_at")

  @@map("payments")
}

model Shipment {
  id             String    @id @default(uuid())
  orderId        String    @unique @map("order_id")
  order          Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  recipientName  String    @map("recipient_name")    // Private off-chain
  streetAddress  String    @map("street_address")    // Private off-chain
  city           String
  postalCode     String    @map("postal_code")
  country        String
  carrier        String                              // FedEx, UPS, DHL, etc.
  trackingNumber String    @map("tracking_number")   // Private off-chain
  shippedAt      DateTime? @map("shipped_at")
  deliveredAt    DateTime? @map("delivered_at")

  @@map("shipments")
}

model Review {
  id         String   @id @default(uuid())
  orderId    String   @unique @map("order_id")
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  reviewerId String   @map("reviewer_id")
  reviewer   User     @relation("ReviewsWritten", fields: [reviewerId], references: [id])
  sellerId   String   @map("seller_id")
  seller     User     @relation("ReviewsReceived", fields: [sellerId], references: [id])
  rating     Int      // 1 to 5 stars
  comment    String   @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([sellerId])
  @@map("reviews")
}

model Dispute {
  id              String            @id @default(uuid())
  orderId         String            @unique @map("order_id")
  order           Order             @relation(fields: [orderId], references: [id], onDelete: Cascade)
  openedById      String            @map("opened_by_id")
  openedBy        User              @relation("UserOpenedDisputes", fields: [openedById], references: [id])
  reason          String
  status          DisputeStatus     @default(OPEN)
  onChainHash     String?           @map("on_chain_hash")
  resolutionNotes String?           @map("resolution_notes") @db.Text
  resolvedAt      DateTime?         @map("resolved_at")
  createdAt       DateTime          @default(now()) @map("created_at")

  evidence        DisputeEvidence[]

  @@map("disputes")
}

model DisputeEvidence {
  id          String   @id @default(uuid())
  disputeId   String   @map("dispute_id")
  dispute     Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  submittedBy String   @map("submitted_by")
  fileUri     String   @map("file_uri")
  sha256Hash  String   @map("sha256_hash")
  description String?  @db.Text
  uploadedAt  DateTime @default(now()) @map("uploaded_at")

  @@map("dispute_evidence")
}

model Transaction {
  id              String   @id @default(uuid())
  orderId         String?  @map("order_id")
  order           Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  txHash          String   @unique @map("tx_hash")
  blockNumber     BigInt   @map("block_number")
  fromAddress     String   @map("from_address")
  toAddress       String   @map("to_address")
  valueEth        Decimal  @map("value_eth") @db.Decimal(18, 6)
  gasUsed         BigInt   @map("gas_used")
  contractName    String   @map("contract_name")
  methodName      String   @map("method_name")
  status          String   @default("SUCCESS")
  timestamp       DateTime @default(now())

  @@index([fromAddress])
  @@index([toAddress])
  @@index([txHash])
  @@map("transactions")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String   @db.Text
  isRead    Boolean  @default(false) @map("is_read")
  linkUrl   String?  @map("link_url")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId, isRead])
  @@map("notifications")
}
```

---

## 5. Blockchain & Smart Contract Architecture

TrustChain splits smart contract responsibilities across **five modular contracts**. It explicitly avoids monolithic contracts to maintain strict separation of concerns, reduce gas deployment costs, and limit the blast radius of any individual module.

```mermaid
classDiagram
    class ProductNFT {
        +mint(address to, string uri, bytes32 metaHash) uint256
        +tokenURI(uint256 tokenId) string
        +getMetadataHash(uint256 tokenId) bytes32
    }
    class Marketplace {
        +createListing(address nft, uint256 tokenId, uint256 price) uint256
        +cancelListing(uint256 listingId)
        +buyItem(uint256 listingId)
    }
    class Escrow {
        +depositPayment(uint256 orderId, address buyer, address seller, address nft, uint256 tokenId)
        +confirmDelivery(uint256 orderId)
        +claimTimeoutRelease(uint256 orderId)
        +freezeEscrow(uint256 orderId)
        +refundBuyer(uint256 orderId)
        +releaseSeller(uint256 orderId)
    }
    class Reputation {
        +recordSuccessfulTrade(address seller, address buyer, uint256 volume)
        +recordDisputeFault(address faultedUser)
        +getReputation(address user) (uint256, uint256)
    }
    class DisputeResolution {
        +openDispute(uint256 orderId, bytes32 evidenceHash)
        +resolveDispute(uint256 orderId, uint8 ruling)
    }
    class FeeManager {
        +calculateFee(uint256 amount) uint256
        +distributeFee()
    }

    Marketplace --> ProductNFT : transfers custody
    Marketplace --> Escrow : triggers deposit
    Escrow --> ProductNFT : safeTransferFrom to buyer
    Escrow --> FeeManager : routes 2.5% protocol fee
    Escrow --> Reputation : increments verified score
    DisputeResolution --> Escrow : freezes/unlocks funds
```

### 5.1. Order & Escrow State Machine

```
                      [ ORDER CREATED ]
                              │
                              │ Buyer calls buyItem{value: price}()
                              ▼
                    [ PAYMENT_LOCKED ]
                     (Funds in Escrow)
                              │
                  ┌───────────┴───────────┐
                  │                       │
      Seller Ships Package          Buyer Opens Dispute
                  │                       │
                  ▼                       ▼
             [ SHIPPED ]            [ DISPUTED ]
                  │                 (Funds Frozen)
       ┌──────────┴──────────┐            │
       │                     │            │ Arbitrator
Buyer Confirms        14-Day Timeout      │ Ruling
       │              (Auto-Claim)        ├─────────────┐
       ▼                     ▼            ▼             ▼
   [ DELIVERED ] ─────────► [ COMPLETED ]   [ REFUNDED ]  [ RELEASED ]
                     Funds -> Seller         Funds ->      Funds ->
                     NFT   -> Buyer          Buyer         Seller
                     +1 Reputation           NFT ->        NFT ->
                                             Seller        Buyer
```

### 5.2. Core Smart Contract Interfaces

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IProductNFT {
    event ProductMinted(uint256 indexed tokenId, address indexed creator, string tokenUri, bytes32 metadataHash);
    function mint(address to, string calldata uri, bytes32 metaHash) external returns (uint256);
    function getMetadataHash(uint256 tokenId) external view returns (bytes32);
}

interface IMarketplace {
    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool active;
    }
    event ProductListed(uint256 indexed listingId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed listingId);
    event ProductPurchased(uint256 indexed listingId, address indexed buyer, uint256 indexed orderId);

    function createListing(address nftContract, uint256 tokenId, uint256 price) external returns (uint256);
    function cancelListing(uint256 listingId) external;
    function buyItem(uint256 listingId) external payable;
}

interface IEscrow {
    enum EscrowStatus { AWAITING, LOCKED, RELEASED, REFUNDED, FROZEN }
    
    event PaymentLocked(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event PaymentReleased(uint256 indexed orderId, uint256 sellerAmount, uint256 feeAmount);
    event PaymentRefunded(uint256 indexed orderId, uint256 refundAmount);
    event EscrowFrozen(uint256 indexed orderId);

    function depositPayment(uint256 orderId, address buyer, address payable seller, address nftContract, uint256 tokenId) external payable;
    function confirmDelivery(uint256 orderId) external;
    function claimTimeoutRelease(uint256 orderId) external;
    function freezeEscrow(uint256 orderId) external;
    function refundBuyer(uint256 orderId) external;
    function releaseSeller(uint256 orderId) external;
}

interface IReputation {
    event ReputationUpdated(address indexed user, uint256 successfulTrades, uint256 totalVolume);
    function recordSuccessfulTrade(address seller, address buyer, uint256 volume) external;
    function recordDisputeFault(address faultedUser) external;
    function getReputation(address user) external view returns (uint256 successfulTrades, uint256 volume);
}

interface IDisputeResolution {
    enum Ruling { NONE, REFUND_BUYER, RELEASE_SELLER }
    event DisputeOpened(uint256 indexed orderId, address indexed openedBy, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed orderId, Ruling ruling);

    function openDispute(uint256 orderId, bytes32 evidenceHash) external;
    function resolveDispute(uint256 orderId, Ruling ruling) external;
}
```

---

## 6. REST API Specification

All protected endpoints require an `Authorization: Bearer <jwt>` header obtained from the EIP-4361 authentication handshake.

### 6.1. Authentication Module

#### `POST /api/v1/auth/nonce`
* **Purpose**: Generates a cryptographically random, single-use nonce for wallet challenge.
* **Request Body**:
  ```json
  { "walletAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" }
  ```
* **Response (200 OK)**:
  ```json
  {
    "nonce": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "expiresAt": "2026-09-24T08:05:00.000Z"
  }
  ```

#### `POST /api/v1/auth/verify`
* **Purpose**: Verifies the ECDSA signature against the active nonce, upserts user, issues JWT.
* **Request Body**:
  ```json
  {
    "walletAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "signature": "0x4355c47d63924e8a72e509b66023a022...1b",
    "message": "trustchain.io wants you to sign in with your Ethereum account:\n0x7099...Nonce: e3b0c442..."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-8812",
      "walletAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "username": "alice_collector",
      "role": "SELLER"
    }
  }
  ```

---

### 6.2. Products & Listings

#### `GET /api/v1/products`
* **Query Params**: `category`, `condition`, `minPrice`, `maxPrice`, `search`, `sortBy` (newest/price_asc/price_desc/reputation), `page`, `limit`.
* **Response (200 OK)**: Paginated array of products with seller reputation and verified NFT badges.

#### `POST /api/v1/products`
* **Headers**: `Authorization: Bearer <jwt>`, `Content-Type: multipart/form-data`
* **Payload**: `title`, `description`, `category`, `condition`, `price`, `images[]`
* **Behavior**: Uploads image files to IPFS, builds standard ERC-721 metadata JSON, computes `keccak256(metadataJSON)`, returns IPFS CID and hash ready for on-chain minting.

#### `GET /api/v1/products/:id`
* **Response (200 OK)**: Complete product details, off-chain description, photos, seller profile, on-chain NFT token ID, contract address, current owner, and verification hash.

---

### 6.3. Orders, Shipping & Escrow

#### `POST /api/v1/orders`
* **Purpose**: Initiates an order draft before the buyer broadcasts `buyItem()` to the blockchain.
* **Request Body**:
  ```json
  {
    "listingId": "list-001",
    "shipping": {
      "recipientName": "Bob Smith",
      "streetAddress": "742 Evergreen Terrace",
      "city": "Springfield",
      "postalCode": "97477",
      "country": "USA"
    }
  }
  ```
* **Response (201 Created)**: Returns `orderId` and transaction calldata payload for `Marketplace.buyItem(listingId)`.

#### `POST /api/v1/orders/:id/ship`
* **Role**: Restricted to Order Seller.
* **Payload**: `{ "carrier": "FedEx", "trackingNumber": "782910394821" }`
* **Behavior**: Stores tracking encrypted in PostgreSQL. Triggers `ITEM_SHIPPED` push notification to buyer.

#### `POST /api/v1/orders/:id/dispute`
* **Role**: Restricted to Order Buyer while status is `PAYMENT_LOCKED` or `SHIPPED`.
* **Payload**: `{ "reason": "DAMAGED", "evidenceDescription": "Package crushed", "evidenceFiles": [...] }`
* **Behavior**: Hashes evidence files (`sha256`), uploads to private storage, returns `evidenceHash` to submit into `DisputeResolution.openDispute(orderId, evidenceHash)`.

---

### 6.4. Verification, Provenance & QR Code

#### `GET /api/v1/verify/:nftTokenId`
* **Purpose**: Public verification endpoint called by scanning the product's physical QR code.
* **Response (200 OK)**:
  ```json
  {
    "nftTokenId": "1024",
    "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "currentOwner": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "product": {
      "title": "MacBook Pro M3 Max",
      "condition": "LIKE_NEW",
      "brand": "Apple"
    },
    "provenanceHistory": [
      {
        "event": "MINTED",
        "owner": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "date": "2026-09-24T06:00:00Z",
        "txHash": "0x789abc..."
      },
      {
        "event": "ESCROW_PURCHASE",
        "owner": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "date": "2026-09-24T07:15:00Z",
        "txHash": "0xdef456...",
        "priceEth": "1.50"
      }
    ],
    "isAuthenticPass": true
  }
  ```

---

## 7. Security Architecture & Threat Model

```
                     ATTACK SURFACE & THREAT VECTORS
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ Threat Actor        │ Attack Vector & Mitigation Strategy                    │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Malicious Buyer  │ • False Non-Delivery Claim: Off-chain carrier tracking │
│                     │   delivery scan verified by arbitrator.                │
│                     │ • Ghosting / Refusal to Confirm: 14-day auto-release   │
│                     │   timer (claimTimeoutRelease) protects seller funds.   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 2. Malicious Seller │ • Fake Tracking Code: Escrow stays locked; buyer opens │
│                     │   dispute before funds can be released.                │
│                     │ • Counterfeit Physical Goods: Off-chain photos hashed  │
│                     │   on-chain prior to sale. Arbiter issues refund.       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 3. Sybil & Wash     │ • Fake Review Farming: Ratings permitted ONLY upon     │
│    Traders          │   completed on-chain escrow settlements.               │
│                     │ • Protocol Take-Rate (2.5%): Wash trading incurs real  │
│                     │   financial costs, making reputation gaming expensive. │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 4. Malicious Admin/ │ • Unilateral Fund Stealing: Escrow funds can NEVER be  │
│    Arbitrator       │   withdrawn to admin wallets—only released to seller   │
│                     │   or refunded to buyer. Arbitrators have no fund custody│
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 5. Smart-Contract   │ • Reentrancy: OpenZeppelin ReentrancyGuard + Checks-   │
│    Attacker         │   Effects-Interactions (CEI) on all external calls.    │
│                     │ • Integer Overflow: Solidity 0.8.28 checked arithmetic.│
│                     │ • Front-Running: Non-custodial listing IDs with fixed   │
│                     │   price checks assert msg.value == listing.price.      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ 6. Compromised      │ • Spoofed Database State: Backend state is secondary to│
│    Database Server  │   on-chain contract state. Escrow keys/funds remain on │
│                     │   Base Sepolia and cannot be stolen via SQL injection. │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 8. Development & Deployment Runbook

### 8.1. Prerequisites
* **Node.js**: v20.x or v22.x LTS (compatible with Hardhat & Next.js 14)
* **Docker & Docker Compose**: PostgreSQL 16 & Redis 7
* **MetaMask or Web3 Wallet**: Configured with Base Sepolia testnet

### 8.2. Environment Setup (`.env.example`)
```env
# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trustchain?schema=public"
REDIS_URL="redis://localhost:6379"

# Base Sepolia Network Configuration
BASE_SEPOLIA_RPC="https://sepolia.base.org"
DEPLOYER_PRIVATE_KEY="0x0000000000000000000000000000000000000000000000000000000000000000"
BASESCAN_API_KEY="your-basescan-api-key"

# Deployed Contract Addresses (Local or Base Sepolia)
NEXT_PUBLIC_NFT_CONTRACT="0x5FbDB2315678afecb367f032d93F642f64180aa3"
NEXT_PUBLIC_MARKETPLACE_CONTRACT="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
NEXT_PUBLIC_ESCROW_CONTRACT="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
NEXT_PUBLIC_REPUTATION_CONTRACT="0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
NEXT_PUBLIC_DISPUTE_CONTRACT="0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"

# IPFS Pinata Gateway
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET_KEY="your-pinata-secret"
NEXT_PUBLIC_IPFS_GATEWAY="https://gateway.pinata.cloud/ipfs/"

# Security
JWT_SECRET="super-secure-trustchain-secret-key-at-least-32-chars"
```

### 8.3. Local Execution Commands
```powershell
# 1. Start PostgreSQL & Redis services via Docker
docker compose up -d

# 2. Synchronize PostgreSQL database schema
npx.cmd prisma db push

# 3. Start local Base-compatible EVM node
cd d:\Blockchn
npm.cmd run node

# 4. Run smart contract unit & integration test suite (16 tests)
npm.cmd run test

# 5. Run end-to-end automated simulation
npm.cmd run simulate:verimarket

# 6. Start Next.js Web Marketplace
cd apps/web
npm.cmd run dev
# -> Opens http://localhost:3000
```

