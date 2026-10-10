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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('trustchain-theme')==='light'?'light':'dark'}catch(e){}" }} />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <Providers>
          <ClientNavbar />
          <main id="main-content" className="flex-1 min-w-0">{children}</main>
          <ClientFooter />
        </Providers>
      </body>
    </html>
  );
}
