import { NextResponse } from 'next/server';
export function POST() { return NextResponse.json({ error: 'WALLET_LOGIN_REQUIRED' }, { status: 410 }); }
