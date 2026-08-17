import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getUserByEmail } from '@/lib/db';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SECRET_KEY = process.env.SESSION_SECRET 
  ? crypto.createHash('sha256').update(process.env.SESSION_SECRET).digest()
  : crypto.createHash('sha256').update('seapac-fallback-secret-key-32-chars').digest();

// Helper to encrypt session data
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

// Helper to decrypt session data
function decrypt(text) {
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt session cookie:', err);
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('seapac_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const decrypted = decrypt(sessionCookie.value);
    if (!decrypted) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = JSON.parse(decrypted);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('API Error (GET /api/auth/session):', error);
    return NextResponse.json({ error: 'Erro ao verificar sessão.' }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, picture } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios.' }, { status: 400 });
    }

    // Verify user authorization in DB
    const dbUser = await getUserByEmail(email);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'Acesso negado. Seu e-mail não está autorizado no sistema. Contate o administrador.' },
        { status: 403 }
      );
    }

    const user = { 
      name: dbUser.name, 
      email: dbUser.email, 
      role: dbUser.role, 
      picture: picture || null 
    };
    
    const encrypted = encrypt(JSON.stringify(user));

    const cookieStore = await cookies();
    cookieStore.set('seapac_session', encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('API Error (POST /api/auth/session):', error);
    return NextResponse.json({ error: 'Erro ao iniciar sessão.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('seapac_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error (DELETE /api/auth/session):', error);
    return NextResponse.json({ error: 'Erro ao encerrar sessão.' }, { status: 500 });
  }
}
