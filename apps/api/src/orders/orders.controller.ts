import { Controller, Post, Body, Param, Get, Query } from "@nestjs/common";
import { OrdersService, ShipOrderDto, ReviewOrderDto } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("prepare-checkout")
  prepareCheckout(@Body() body: { listingId: string; buyerAddress: string }) {
    return this.ordersService.prepareCheckout(body.listingId, body.buyerAddress);
  }

  @Post(":id/ship")
  shipOrder(@Param("id") id: string, @Body() dto: ShipOrderDto) {
    return this.ordersService.shipOrder(id, dto);
  }

  @Post(":id/review")
  submitReview(@Param("id") id: string, @Body() dto: ReviewOrderDto) {
    return this.ordersService.submitReview(id, dto);
  }
}

