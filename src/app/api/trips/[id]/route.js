import { NextResponse } from 'next/server';
import { updateTrip, deleteTrip, getTripById } from '@/lib/db';
import { isAdmin, getSessionUser } from '@/lib/session';

export async function PUT(request, { params }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Acesso negado. Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { id } = await params;
    const existingTrip = await getTripById(id);

    if (!existingTrip) {
      return NextResponse.json({ error: 'Viagem não encontrada.' }, { status: 404 });
    }

    // Apenas o usuário que cadastrou a viagem parcial pode editá-la/finalizá-la
    if (existingTrip.isPartial && existingTrip.createdBy !== sessionUser.email) {
      return NextResponse.json({ error: 'Apenas o usuário que cadastrou esta viagem pode finalizá-la.' }, { status: 403 });
    }

    const body = await request.json();
    const isPartial = !!body.isPartial;

    // Basic validation (allowing 0 as a valid KM value)
    let hasMissingFields = false;
    if (isPartial) {
      hasMissingFields = 
        !body.date || 
        !body.driver || 
        !body.routeFrom || 
        !body.departureTime || 
        body.departureKm === undefined || body.departureKm === null || body.departureKm === '';
    } else {
      hasMissingFields = 
        !body.date || 
        !body.driver || 
        !body.routeFrom || 
        !body.routeTo || 
        !body.departureTime || 
        !body.arrivalTime ||
        body.departureKm === undefined || body.departureKm === null || body.departureKm === '' ||
        body.arrivalKm === undefined || body.arrivalKm === null || body.arrivalKm === '';
    }

    if (hasMissingFields) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    if (!isPartial && Number(body.departureKm) > Number(body.arrivalKm)) {
      return NextResponse.json({ error: 'KM de saída deve ser menor ou igual ao KM de chegada.' }, { status: 400 });
    }

    const updated = await updateTrip(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Viagem não encontrada.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(`API Error (PUT /api/trips/[id]):`, error);
    return NextResponse.json({ error: 'Erro ao atualizar viagem.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir viagens.' }, { status: 403 });
    }

    const { id } = await params;
    const success = await deleteTrip(id);
    if (!success) {
      return NextResponse.json({ error: 'Viagem não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Viagem excluída com sucesso.' });
  } catch (error) {
    console.error(`API Error (DELETE /api/trips/[id]):`, error);
    return NextResponse.json({ error: 'Erro ao excluir viagem.' }, { status: 500 });
  }
}
