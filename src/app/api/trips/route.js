import { NextResponse } from 'next/server';
import { getTrips, addTrip } from '@/lib/db';

export async function GET() {
  try {
    const trips = await getTrips();
    // Sort trips by date desc, then by departureTime desc
    const sortedTrips = [...trips].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.departureTime.localeCompare(a.departureTime);
    });
    return NextResponse.json(sortedTrips);
  } catch (error) {
    console.error('API Error (GET /api/trips):', error);
    return NextResponse.json({ error: 'Erro ao buscar viagens.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Basic validation (allowing 0 as a valid KM value)
    const hasMissingFields = 
      !body.date || 
      !body.driver || 
      !body.routeFrom || 
      !body.routeTo || 
      !body.departureTime || 
      !body.arrivalTime ||
      body.departureKm === undefined || body.departureKm === null || body.departureKm === '' ||
      body.arrivalKm === undefined || body.arrivalKm === null || body.arrivalKm === '';

    if (hasMissingFields) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    if (Number(body.departureKm) >= Number(body.arrivalKm)) {
      return NextResponse.json({ error: 'KM de saída deve ser menor que o KM de chegada.' }, { status: 400 });
    }

    const newTrip = await addTrip(body);
    return NextResponse.json(newTrip, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/trips):', error);
    return NextResponse.json({ error: 'Erro ao criar viagem.' }, { status: 500 });
  }
}
