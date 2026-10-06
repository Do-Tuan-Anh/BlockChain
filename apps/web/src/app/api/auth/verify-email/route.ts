import { NextRequest } from 'next/server';
import { authAction } from '@/lib/auth-actions';
export const POST = (req: NextRequest) => authAction(req, 'verify-email');
