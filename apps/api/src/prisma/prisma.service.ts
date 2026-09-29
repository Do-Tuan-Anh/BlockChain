import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Connect to PostgreSQL database
    try {
      await this.$connect();
    } catch (err) {
      console.warn("Notice: PostgreSQL not connected during offline build/testing.");
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

