import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { currentUser } from '@/lib/auth';
import { authError, validOrigin } from '@/lib/auth-security';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: (await params).id },
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
    });

    if (!product || (!['LISTED', 'SOLD'].includes(product.status) && (await currentUser())?.id !== product.sellerId)) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validOrigin(req)) return authError('INVALID_ORIGIN', 403);
  const user = await currentUser();
  if (!user) return authError('UNAUTHORIZED', 401);
  try {
    const body = z.object({
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().min(1).max(10000).optional(),
      brand: z.string().max(100).optional(), model: z.string().max(100).optional(),
      price: z.string().refine(value => Number.isFinite(Number(value)) && Number(value) > 0).optional(),
      imageUrl: z.string().url().optional(),
    }).strict().parse(await req.json());

    const existing = await prisma.product.findUnique({
      where: { id: (await params).id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    if (existing.sellerId !== user.id) return authError('FORBIDDEN', 403);

    const product = await prisma.product.update({
      where: { id: (await params).id },
      data: body,
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

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return authError('INVALID_INPUT');
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
