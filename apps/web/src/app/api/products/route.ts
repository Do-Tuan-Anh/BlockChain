import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status');
    const sellerId = searchParams.get('sellerId');

    const where: any = {};
    if (category && category !== 'All') where.category = category;
    if (condition && condition !== 'All') where.condition = condition;
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;

    const products = await prisma.product.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
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
  try {
    const body = await req.json();
    const { title, description, category, condition, brand, model, price, currency, imageUrl, nftTokenId, sellerId } = body;
    const { title, description, category, condition, brand, model, price, currency, imageUrl, nftTokenId, sellerWallet, sellerUsername } = body;

    if (!title || !description || !category || !condition || !price || !sellerId) {
    if (!title || !description || !category || !condition || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, condition, price, sellerId' },
        { error: 'Missing required fields: title, description, category, condition, price' },
        { status: 400 }
      );
    }

    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
    // Find or auto-create the seller user
    const walletAddress = sellerWallet || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const username = sellerUsername || 'demo_seller';

    let seller = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
      // Auto-create seller for demo purposes
      seller = await prisma.user.create({
        data: {
          walletAddress,
          username,
          role: 'SELLER',
        },
      });
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        category,
        condition,
        brand: brand || null,
        model: model || null,
        price,
        currency: currency || 'ETH',
        imageUrl: imageUrl || null,
        nftTokenId: nftTokenId || null,
        status: 'LISTED',
        sellerId,
        sellerId: seller.id,
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
