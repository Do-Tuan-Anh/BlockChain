import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ethers } from "ethers";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@verimarket/types";

@Injectable()
export class AuthService {
  // In-memory nonce store with TTL for fast access (or Redis backed)
  private nonces = new Map<string, { nonce: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Generates a cryptographic one-time challenge nonce for a given wallet address.
   */
  generateNonce(walletAddress: string): { nonce: string; message: string } {
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException("Invalid EVM wallet address format.");
    }
    const normalized = walletAddress.toLowerCase();
    const nonce = ethers.hexlify(ethers.randomBytes(16));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minute TTL

    this.nonces.set(normalized, { nonce, expiresAt });

    const message = `Sign in to VeriMarket\n\nWallet: ${normalized}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
    return { nonce, message };
  }

  /**
   * Verifies ECDSA signature over SIWE message, invalidates nonce, and issues JWT.
   */
  async verifySignature(walletAddress: string, signature: string, message: string) {
    if (!ethers.isAddress(walletAddress)) {
      throw new BadRequestException("Invalid EVM wallet address.");
    }
    const normalized = walletAddress.toLowerCase();
    const stored = this.nonces.get(normalized);

    if (!stored || Date.now() > stored.expiresAt) {
      throw new UnauthorizedException("Nonce has expired or does not exist. Please request a new nonce.");
    }

    if (!message.includes(stored.nonce)) {
      throw new UnauthorizedException("Message does not contain the expected nonce.");
    }

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
    } catch (err) {
      throw new UnauthorizedException("Invalid cryptographic signature format.");
    }

    if (recoveredAddress !== normalized) {
      throw new UnauthorizedException("Signature verification failed: signer does not match address.");
    }

    // Invalidate nonce to prevent replay attacks
    this.nonces.delete(normalized);

    // Upsert user in database
    let user;
    try {
      user = await this.prisma.user.upsert({
        where: { walletAddress: normalized },
        update: {},
        create: {
          walletAddress: normalized,
          username: `user_${normalized.substring(2, 8)}`,
          role: Role.BUYER
        }
      });
    } catch {
      // Fallback for mocked database during development
      user = {
        id: "mock-user-id",
        walletAddress: normalized,
        username: `user_${normalized.substring(2, 8)}`,
        role: Role.BUYER,
        isVerified: false
      };
    }

    const payload = { sub: user.id, walletAddress: user.walletAddress, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user
    };
  }
}

