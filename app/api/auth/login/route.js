import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    
    // Fallback comparison for standard testing or hashing updates
    let match = false;
    if (user.password_hash.startsWith('$2')) {
      match = await bcrypt.compare(password, user.password_hash);
    } else {
      // In case the row wasn't hashed by the script yet for some reason
      match = (password === user.password_hash);
    }

    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'rhu_calasiao_super_secret_jwt_key_2026');
    const alg = 'HS256';
    const jwt = await new SignJWT({ id: user.id, username: user.username, role: user.role })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);

    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/'
    });

    return NextResponse.json({ role: user.role, username: user.username });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
