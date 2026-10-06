import nodemailer from 'nodemailer-smtp';
import { randomBytes } from 'crypto';
import prisma from './prisma';
import { digest } from './auth-security';

export async function sendAuthEmail(user: { id: string; email: string | null }, purpose: 'verify' | 'reset') {
  if (!user.email) return;
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + (purpose === 'verify' ? 24 * 60 : 30) * 60_000);
  // Keep unexpired verification links usable; reset links are revoked after a reset.
  await prisma.authToken.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
  const record = await prisma.authToken.create({ data: { userId: user.id, tokenHash: digest(token), purpose, expiresAt } });
  const url = new URL(purpose === 'verify' ? '/vi/verify-email' : '/vi/reset-password', process.env.NEXTAUTH_URL || 'http://localhost:3000');
  url.searchParams.set('token', token);
  const verification = purpose === 'verify';
  const subject = verification ? 'Xác thực email của bạn | TrustChain' : 'Đặt lại mật khẩu | TrustChain';
  const action = verification ? 'Xác thực email' : 'Đặt lại mật khẩu';
  const ttl = verification ? '24 giờ' : '30 phút';
  const instructions = verification ? 'Mở liên kết để tự động xác thực email. Chờ đến khi trang báo “Email đã được xác thực” rồi đăng nhập.' : 'Mở liên kết và nhập mật khẩu mới. Liên kết chỉ dùng một lần.';
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '127.0.0.1', port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 10_000, socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || 'TrustChain <noreply@trustchain.local>', to: user.email, subject,
      text: `${action}: ${url}\nLiên kết có hiệu lực ${ttl}. ${instructions} Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#172554"><h2>TrustChain</h2><h1>${action}</h1><p>Liên kết có hiệu lực ${ttl}. ${instructions}</p><a href="${url}" style="display:inline-block;background:#2563eb;color:white;padding:14px 24px;border-radius:12px;text-decoration:none">${action}</a><p style="color:#64748b;margin-top:24px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p></div>`,
    });
  } catch (error) {
    await prisma.authToken.deleteMany({ where: { id: record.id } });
    throw error;
  }
}
