import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, ProductStatus } from '@prisma/client';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin } from '@/lib/auth-security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status');
    const sellerId = searchParams.get('sellerId');

    const where: Prisma.ProductWhereInput = {};
    if (category && category !== 'All') where.category = category;
    if (condition && condition !== 'All') where.condition = condition;
    if (status && !Object.values(ProductStatus).includes(status as ProductStatus)) {
      return NextResponse.json({ error: 'Invalid product status' }, { status: 400 });
    }
    if (sellerId) where.sellerId = sellerId;
    where.status = (status || 'LISTED') as ProductStatus;
    if (status && !['LISTED', 'SOLD'].includes(status)) {
      const viewer = await currentUser();
      if (!viewer || (sellerId && sellerId !== viewer.id)) return NextResponse.json({ products: [] });
      where.sellerId = viewer.id;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            walletAddress: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const seller = await currentUser();
  if (!seller) return authError('UNAUTHORIZED', 401);
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid product data' }, { status: 400 });
    }
    const { title, description, category, condition, brand, model, price, currency, imageUrl } = body;

    if ([title, description, category, condition].some(value => typeof value !== 'string' || !value.trim()) ||
        !['string', 'number'].includes(typeof price) || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      return NextResponse.json(
        { error: 'Title, description, category, condition and a positive price are required' },
        { status: 400 }
      );
    }
    if ([brand, model, currency, imageUrl]
        .some(value => value != null && typeof value !== 'string')) {
      return NextResponse.json({ error: 'Invalid field type' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        brand: brand || null,
        model: model || null,
        price: String(price).trim(),
        currency: currency || 'ETH',
        imageUrl: imageUrl || null,
        status: 'LISTED',
        sellerId: seller.id,
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Seller username already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
