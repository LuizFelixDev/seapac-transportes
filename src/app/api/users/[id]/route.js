import { NextResponse } from 'next/server';
import { getUsers, updateUser, deleteUser } from '@/lib/db';
import { isAdmin, getSessionUser } from '@/lib/session';

export async function PUT(request, { params }) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Nome, email e perfil (role) são obrigatórios.' }, { status: 400 });
    }

    if (role !== 'adm' && role !== 'normal') {
      return NextResponse.json({ error: 'Perfil inválido. Deve ser adm ou normal.' }, { status: 400 });
    }

    const updated = await updateUser(id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role
    });

    if (!updated) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error (PUT /api/users/[id]):', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const sessionUser = await getSessionUser();
    
    // Fetch all users to verify email of the target to delete
    const users = await getUsers();
    const targetUser = users.find(u => u.id === id);

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Prevent deleting oneself
    if (sessionUser && targetUser.email.toLowerCase() === sessionUser.email.toLowerCase()) {
      return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário.' }, { status: 400 });
    }

    const success = await deleteUser(id);
    if (!success) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuário excluído com sucesso.' });
  } catch (error) {
    console.error('API Error (DELETE /api/users/[id]):', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 });
  }
}
