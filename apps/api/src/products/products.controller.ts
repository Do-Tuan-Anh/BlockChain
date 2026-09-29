import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { ProductsService, CreateProductDto } from "./products.service";
import { ProductCondition } from "@verimarket/types";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query("category") category?: string,
    @Query("condition") condition?: ProductCondition,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.productsService.findAll({ category, condition, search, page, limit });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }

  @Post("prepare-metadata")
  prepareMetadata(@Body() dto: CreateProductDto) {
    // In production, imageIpfsUri is retrieved from IPFS upload service
    const mockImageIpfsUri = "ipfs://QmSampleProductImageHash";
    return this.productsService.prepareNFTMetadata(dto, mockImageIpfsUri);
  }
}

