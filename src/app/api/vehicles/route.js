import { NextResponse } from 'next/server';
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from '@/lib/db';

export async function GET() {
  try {
    const vehicles = await getVehicles();
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('API Error (GET /api/vehicles):', error);
    return NextResponse.json({ error: 'Erro ao buscar veículos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name || !body.plate || !body.institution) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }
    const newVehicle = await addVehicle(body);
    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/vehicles):', error);
    return NextResponse.json({ error: 'Erro ao criar veículo.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id || !body.name || !body.plate || !body.institution) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }
    const updated = await updateVehicle(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error (PUT /api/vehicles):', error);
    return NextResponse.json({ error: 'Erro ao atualizar veículo.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do veículo é obrigatório.' }, { status: 400 });
    }
    const success = await deleteVehicle(id);
    if (!success) {
      return NextResponse.json({ error: 'Erro ao excluir veículo (não encontrado ou é o último veículo).' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Veículo excluído com sucesso.' });
  } catch (error) {
    console.error('API Error (DELETE /api/vehicles):', error);
    return NextResponse.json({ error: 'Erro ao excluir veículo.' }, { status: 500 });
  }
}
