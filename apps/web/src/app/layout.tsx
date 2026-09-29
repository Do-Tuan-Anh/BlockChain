import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustChain - Secure Blockchain P2P Marketplace",
  description:
    "Decentralized peer-to-peer physical marketplace powered by smart-contract escrow, ERC-721 Digital Product Passports, and cryptographic reputation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans antialiased">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Brand Logo */}
            <a href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-xs">
                🛡️
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">
                Trust<span className="text-blue-600">Chain</span>
              </span>
            </a>

            {/* Global Search Bar */}
            <div className="hidden md:flex flex-1 max-w-lg items-center relative">
              <input
                type="text"
                placeholder="Search products, brands, or NFT attributes..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <span className="absolute right-3 text-gray-400 text-sm">🔍</span>
            </div>

            {/* Navigation Actions */}
            <nav className="flex items-center space-x-3">
              <a
                href="/explore"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition hidden sm:inline-block"
              >
                Explore
              </a>
              <a
                href="/nfts"
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition hidden sm:inline-block"
              >
                Passport Vault
              </a>
              <a
                href="/admin"
                className="text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition hidden md:inline-block"
              >
                ⚖️ Arbitration
              </a>
              <a
                href="/create-listing"
                className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition"
              >
                + List Product
              </a>
              <button
                type="button"
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center space-x-2 shadow-xs"
              >
                <span>Connect Wallet</span>
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <p>© 2026 TrustChain Protocol. Built on Base Sepolia & IPFS. PII is never stored on-chain.</p>
            <div className="flex space-x-6">
              <a href="/explore" className="hover:text-gray-900">Explore Catalog</a>
              <a href="/nfts" className="hover:text-gray-900">Passport Vault</a>
              <a href="/admin" className="hover:text-gray-900">Dispute Arbiter</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

