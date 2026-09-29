"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, QrCode, ExternalLink, Clock, ArrowRight, Copy, Check } from "lucide-react";

export default function ProductVerificationPage({ params }: { params: { id: string } }) {
  const [copied, setCopied] = useState(false);

  const product = {
    tokenId: params.id || "1",
    title: "Apple MacBook Pro 16\" M3 Max",
    brand: "Apple",
    model: "MacBookPro16,1 (2024)",
    condition: "LIKE_NEW",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
    contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    currentOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    previousOwner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    metadataUri: "ipfs://bafybeihkoviema7g3gxyt6la7bdujrwaxumfarfq54bsbeckq2cd3w3Tb4/product.json",
    hardwareHash: "0x2d7c9ef989bac25cd885aa7851c18299b33f1f775c469d37d393625593282de5",
    network: "Base Sepolia (L2)",
    provenance: [
      {
        event: "TOKEN_MINTED",
        title: "Digital Product Passport Minted",
        date: "Sept 23, 2026 - 14:10 UTC",
        actor: "0x7099...79C8 (Alice - Verified Seller)",
        txHash: "0x4a8f912b7c631e84a29ef10c7d23a19bcde4180aa341209124a1b023456789ab",
        description: "Original seller minted ERC-721 Digital Product Passport anchoring hardware serial hash to IPFS."
      },
      {
        event: "MARKETPLACE_LISTED",
        title: "Listed on TrustChain Marketplace",
        date: "Sept 23, 2026 - 14:15 UTC",
        actor: "0x7099...79C8",
        txHash: "0x89ab12cd34ef567890123456789abcdef0123456789abcdef0123456789abcde",
        description: "Listed for sale at 1.50 ETH with automated smart escrow custody routing."
      },
      {
        event: "ESCROW_LOCKED",
        title: "Purchased & Escrow Payment Locked",
        date: "Sept 23, 2026 - 14:32 UTC",
        actor: "0x3C44...93BC (Bob - Buyer)",
        txHash: "0x12cd34ef567890123456789abcdef0123456789abcdef0123456789abcdef012",
        description: "Buyer deposited 1.50 ETH into Escrow.sol. NFT transferred to escrow smart-contract custody."
      },
      {
        event: "DELIVERY_SETTLED",
        title: "Physical Delivery Confirmed & Funds Released",
        date: "Sept 24, 2026 - 08:24 UTC",
        actor: "0x3C44...93BC (Bob)",
        txHash: "0x567890123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        description: "Buyer inspected physical item and confirmed delivery on-chain. Escrow released 1.4625 ETH to Alice and transferred NFT title to Bob."
      }
    ]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Verification Hero Badge */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            Verified On-Chain
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid Digital Product Passport
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{product.title}</h1>
              <p className="text-sm text-slate-500">
                Token ID: <span className="font-mono font-medium text-slate-800">#{product.tokenId}</span> • Brand: {product.brand} • Network: {product.network}
              </p>
            </div>
          </div>
        </div>

        {/* Dual-Column Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1: On-Chain Passport Specs */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-blue-600" />
              Digital Passport Specifications
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Current Registered Owner</span>
                <div className="flex items-center justify-between font-mono bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                  <span className="text-slate-800 truncate">{product.currentOwner}</span>
                  <button onClick={() => copyToClipboard(product.currentOwner)} className="text-blue-600 hover:text-blue-700 ml-2">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Smart Contract Address</span>
                <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 mt-1 text-slate-800 truncate">
                  {product.contractAddress}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Immutable Hardware Serial Hash (Keccak-256)</span>
                <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200 mt-1 text-slate-700 truncate">
                  {product.hardwareHash}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Decentralized IPFS Metadata</span>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${product.metadataUri.replace("ipfs://", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:underline mt-1 font-mono text-xs"
                >
                  {product.metadataUri.slice(0, 38)}...
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Verifiability Disclaimer & Educational Notice */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-blue-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              What is Verified by Blockchain?
            </h2>

            <div className="space-y-3 text-xs text-blue-900 leading-relaxed">
              <p>
                <strong>✓ Digital Ownership Title:</strong> Proves mathematically that the current wallet address purchased and received this specific token through TrustChain's verified escrow protocol.
              </p>
              <p>
                <strong>✓ Unalterable Provenance Trail:</strong> Past sale prices, transfer dates, and previous owners cannot be erased, faked, or manipulated by any third party or centralized admin.
              </p>
              <p className="pt-2 border-t border-blue-200 text-blue-800">
                <strong>Notice:</strong> An NFT confirms ownership of the cryptographic record. Physical item authenticity is attested by the seller and verified by the buyer prior to final on-chain delivery release.
              </p>
            </div>
          </div>

        </div>

        {/* Chronological Provenance History Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Immutable Provenance & Chain of Custody
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every lifecycle event is permanently recorded on Base Sepolia and cryptographically linked.
            </p>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6">
            {product.provenance.map((step, index) => (
              <div key={index} className="relative group">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-4 ring-blue-50" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{step.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-normal">{step.description}</p>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
                    <span>Actor: {step.actor}</span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${step.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Basescan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href={`/product/prod-001`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            ← Back to Product Marketplace Listing
          </Link>
        </div>

      </div>
    </div>
  );
}

