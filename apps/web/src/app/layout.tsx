import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../components/Providers";
import { ClientNavbar } from "../components/ClientNavbar";
import { ClientFooter } from "../components/ClientFooter";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col font-sans antialiased">
        <Providers>
          <ClientNavbar />
          <main className="flex-1">{children}</main>
          <ClientFooter />
        </Providers>
      </body>
    </html>
  );
}
