import { Controller, Get, Post, Body, Query, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";

export class VerifySignatureDto {
  walletAddress: string;
  signature: string;
  message: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("nonce")
  getNonce(@Query("address") address: string) {
    if (!address) {
      throw new BadRequestException("Query parameter 'address' is required.");
    }
    return this.authService.generateNonce(address);
  }

  @Post("verify")
  async verify(@Body() dto: VerifySignatureDto) {
    return this.authService.verifySignature(dto.walletAddress, dto.signature, dto.message);
  }
}

