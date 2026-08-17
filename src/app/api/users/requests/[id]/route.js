import { NextResponse } from 'next/server';
import { getPendingRequests, updateLoginRequestStatus, addUser } from '@/lib/db';
import { isAdmin } from '@/lib/session';

export async function PUT(request, { params }) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, role } = body;

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Ação inválida. Deve ser approve ou reject.' }, { status: 400 });
    }

    // Find the request
    const pending = await getPendingRequests();
    const targetRequest = pending.find(r => r.id === id);

    if (!targetRequest) {
      return NextResponse.json({ error: 'Solicitação de acesso não encontrada.' }, { status: 404 });
    }

    if (action === 'approve') {
      if (!role || (role !== 'adm' && role !== 'normal')) {
        return NextResponse.json({ error: 'Perfil (role) inválido para aprovação.' }, { status: 400 });
      }

      // 1. Add user to authorized users table
      await addUser({
        name: targetRequest.name,
        email: targetRequest.email,
        role: role
      });

      // 2. Mark request as approved
      await updateLoginRequestStatus(id, 'approved');

      return NextResponse.json({ success: true, message: 'Solicitação aprovada e usuário cadastrado.' });
    } else {
      // Reject request
      await updateLoginRequestStatus(id, 'rejected');
      return NextResponse.json({ success: true, message: 'Solicitação recusada.' });
    }

  } catch (error) {
    console.error('API Error (PUT /api/users/requests/[id]):', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação de acesso.' }, { status: 500 });
  }
}
