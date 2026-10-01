import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: params.address },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const body = await req.json();
    const { username, email, bio, avatarUrl, role } = body;

    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: params.address },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (username && username !== existingUser.username) {
      const usernameTaken = await prisma.user.findUnique({
        where: { username },
      });
      if (usernameTaken) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { walletAddress: params.address },
      data: {
        ...(username && { username }),
        ...(email !== undefined && { email }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(role && { role }),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
