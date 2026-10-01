import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, username } = body;

    if (!walletAddress || !username) {
      return NextResponse.json(
        { error: 'walletAddress and username are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress },
          { username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Wallet address or username already registered' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        walletAddress,
        username,
        role: body.role || 'BUYER',
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
