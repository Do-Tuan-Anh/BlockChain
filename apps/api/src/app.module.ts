import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ProductsController } from "./products/products.controller";
import { ProductsService } from "./products/products.service";
import { OrdersController } from "./orders/orders.controller";
import { OrdersService } from "./orders/orders.service";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "verimarket_development_jwt_secret_key_12345",
      signOptions: { expiresIn: "7d" }
    })
  ],
  controllers: [AuthController, ProductsController, OrdersController],
  providers: [AuthService, ProductsService, OrdersService, PrismaService],
  exports: [PrismaService]
})
export class AppModule {}

