import { NextResponse } from 'next/server';
import { getPendingRequests } from '@/lib/db';
import { isAdmin } from '@/lib/session';

export async function GET() {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const pending = await getPendingRequests();
    return NextResponse.json(pending);
  } catch (error) {
    console.error('API Error (GET /api/users/requests):', error);
    return NextResponse.json({ error: 'Erro ao buscar solicitações de acesso.' }, { status: 500 });
  }
}
