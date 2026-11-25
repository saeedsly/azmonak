import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const secret = new TextEncoder().encode(config.sessionSecret);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  sub: string;
  username: string;
  role: string;
  fullName: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer('azmoonak')
    .setAudience('admin')
    .setIssuedAt()
    .setExpirationTime(`${config.sessionTtlHours}h`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, { issuer: 'azmoonak', audience: 'admin' });
  return {
    sub: String(payload.sub),
    username: String((payload as Record<string, unknown>).username ?? ''),
    role: String((payload as Record<string, unknown>).role ?? 'EDITOR'),
    fullName: String((payload as Record<string, unknown>).fullName ?? ''),
  };
}

/** توکن دسترسی فراگیر به یک تلاش مشخص. */
export async function signAttemptToken(attemptId: string, examId: string): Promise<string> {
  return new SignJWT({ examId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(attemptId)
    .setIssuer('azmoonak')
    .setAudience('participant')
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyAttemptToken(token: string): Promise<{ attemptId: string }> {
  const { payload } = await jwtVerify(token, secret, { issuer: 'azmoonak', audience: 'participant' });
  return { attemptId: String(payload.sub) };
}
