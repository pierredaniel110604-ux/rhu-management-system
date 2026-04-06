import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'rhu_calasiao_super_secret_jwt_key_2026');
    const { payload } = await jwtVerify(token, secret);
    return payload; 
  } catch (err) {
    return null;
  }
}
