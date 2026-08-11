import { NextResponse } from 'next/server';
import { getDrivers, addDriver, updateDriver, deleteDriver } from '@/lib/db';

export async function GET() {
  try {
    const drivers = await getDrivers();
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('API Error (GET /api/drivers):', error);
    return NextResponse.json({ error: 'Erro ao buscar motoristas.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome do motorista é obrigatório.' }, { status: 400 });
    }
    const newDriver = await addDriver(body);
    return NextResponse.json(newDriver, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/drivers):', error);
    return NextResponse.json({ error: 'Erro ao criar motorista.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id || !body.name) {
      return NextResponse.json({ error: 'ID e Nome são obrigatórios.' }, { status: 400 });
    }
    const updated = await updateDriver(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Motorista não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error (PUT /api/drivers):', error);
    return NextResponse.json({ error: 'Erro ao atualizar motorista.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do motorista é obrigatório.' }, { status: 400 });
    }
    const success = await deleteDriver(id);
    if (!success) {
      return NextResponse.json({ error: 'Erro ao excluir motorista.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Motorista excluído com sucesso.' });
  } catch (error) {
    console.error('API Error (DELETE /api/drivers):', error);
    return NextResponse.json({ error: 'Erro ao excluir motorista.' }, { status: 500 });
  }
}
