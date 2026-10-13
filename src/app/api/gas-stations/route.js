import { NextResponse } from 'next/server';
import { getGasStations, addGasStation, deleteGasStation } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getGasStations());
  } catch (error) {
    console.error('API Error (GET /api/gas-stations):', error);
    return NextResponse.json({ error: 'Erro ao buscar postos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nome do posto é obrigatório.' }, { status: 400 });
    }
    return NextResponse.json(await addGasStation(body), { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/gas-stations):', error);
    return NextResponse.json({ error: 'Erro ao cadastrar posto.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    const ok = await deleteGasStation(id);
    if (!ok) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 });
    return NextResponse.json({ message: 'Posto excluído com sucesso.' });
  } catch (error) {
    console.error('API Error (DELETE /api/gas-stations):', error);
    return NextResponse.json({ error: 'Erro ao excluir posto.' }, { status: 500 });
  }
}
