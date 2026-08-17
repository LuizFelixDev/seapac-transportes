import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmail, getLoginRequestByEmail, addLoginRequest, updateLoginRequestStatus } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/session';

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
      // Check if they already have an access request
      const reqStatus = await getLoginRequestByEmail(email);
      if (!reqStatus) {
        // Create request
        await addLoginRequest({ name, email });
        return NextResponse.json(
          { error: 'Acesso negado. Sua solicitação de acesso foi enviada aos administradores. Por favor, aguarde a aprovação.' },
          { status: 403 }
        );
      } else if (reqStatus.status === 'pending') {
        return NextResponse.json(
          { error: 'Acesso negado. Sua solicitação de acesso está aguardando aprovação dos administradores. Por favor, aguarde.' },
          { status: 403 }
        );
      } else {
        // The request is either 'approved' (but user was deleted from users table) or 'rejected'.
        // We reset the status to 'pending' to let them request access again!
        await updateLoginRequestStatus(reqStatus.id, 'pending');
        return NextResponse.json(
          { error: 'Acesso negado. Sua solicitação de acesso foi reenviada aos administradores. Por favor, aguarde a aprovação.' },
          { status: 403 }
        );
      }
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
