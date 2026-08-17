import { NextResponse } from 'next/server';
import { getUsers, addUser } from '@/lib/db';
import { isAdmin } from '@/lib/session';

export async function GET() {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('API Error (GET /api/users):', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Nome, email e perfil (role) são obrigatórios.' }, { status: 400 });
    }

    if (role !== 'adm' && role !== 'normal') {
      return NextResponse.json({ error: 'Perfil inválido. Deve ser adm ou normal.' }, { status: 400 });
    }

    const newUser = await addUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/users):', error);
    return NextResponse.json({ error: 'Erro ao cadastrar usuário.' }, { status: 500 });
  }
}
