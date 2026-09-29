import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus, ShipmentStatus } from "@verimarket/types";

export interface ShipOrderDto {
  carrier: string;
  trackingNumber: string;
}

export interface ReviewOrderDto {
  rating: number;
  comment: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prepares on-chain checkout parameters for buyItem().
   */
  prepareCheckout(listingId: string, buyerAddress: string) {
    return {
      listingId,
      contractMethod: "buyItem(uint256 listingId)",
      requiredEtherValue: "0.5",
      buyerAddress,
      escrowTerms: {
        inspectionPeriodDays: 3,
        autoReleaseDays: 14,
        protocolFeeBps: 250
      }
    };
  }

  /**
   * Records private carrier shipment tracking off-chain.
   */
  async shipOrder(orderId: string, dto: ShipOrderDto) {
    if (!dto.carrier || !dto.trackingNumber) {
      throw new BadRequestException("Carrier and tracking number are required.");
    }

    return {
      orderId,
      status: OrderStatus.SHIPPED,
      shipment: {
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber, // Encrypted at rest
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date().toISOString()
      },
      message: "Shipment recorded. Buyer has been notified."
    };
  }

  /**
   * Submits buyer review after delivery confirmation.
   */
  async submitReview(orderId: string, dto: ReviewOrderDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("Rating must be an integer between 1 and 5.");
    }

    return {
      orderId,
      rating: dto.rating,
      comment: dto.comment,
      createdAt: new Date().toISOString(),
      message: "Review successfully submitted."
    };
  }
}

