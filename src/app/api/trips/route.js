import { NextResponse } from 'next/server';
import { getTrips, addTrip, updateTrip } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

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
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Acesso negado. Sessão inválida ou expirada.' }, { status: 401 });
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

    const departureKm = body.departureKm !== undefined && body.departureKm !== null && body.departureKm !== ''
      ? Number(Number(body.departureKm).toFixed(2))
      : body.departureKm;
    const arrivalKm = body.arrivalKm !== undefined && body.arrivalKm !== null && body.arrivalKm !== ''
      ? Number(Number(body.arrivalKm).toFixed(2))
      : body.arrivalKm;
    const km_rodados = (!isPartial && arrivalKm !== null && arrivalKm !== undefined && departureKm !== null && departureKm !== undefined && arrivalKm >= departureKm)
      ? Number((arrivalKm - departureKm).toFixed(2))
      : 0;
    const refuelKm = body.refuelKm !== undefined && body.refuelKm !== null && body.refuelKm !== ''
      ? Number(Number(body.refuelKm).toFixed(2))
      : body.refuelKm;

    // Deduplication check: check if an identical or matching pending trip already exists
    const existingTrips = await getTrips();
    const existingTrip = existingTrips.find(t => 
      String(t.vehicleId) === String(body.vehicleId) &&
      t.date === body.date &&
      t.driver === body.driver &&
      t.departureTime === body.departureTime &&
      Number(t.departureKm) === Number(departureKm) &&
      t.routeFrom === body.routeFrom
    );

    if (existingTrip) {
      // If existing trip was pending (partial) and new payload is completed, update existing trip
      if (existingTrip.isPartial && !isPartial) {
        const updated = await updateTrip(existingTrip.id, {
          ...existingTrip,
          ...body,
          departureKm,
          arrivalKm,
          km_rodados,
          refuelKm,
          isPartial: false
        });
        return NextResponse.json(updated, { status: 200 });
      }
      // If identical trip already exists, return existing trip without creating a duplicate
      return NextResponse.json(existingTrip, { status: 200 });
    }

    const newTrip = await addTrip({
      ...body,
      departureKm,
      arrivalKm,
      km_rodados,
      refuelKm,
      createdBy: sessionUser.email
    });
    return NextResponse.json(newTrip, { status: 201 });
  } catch (error) {
    console.error('API Error (POST /api/trips):', error);
    return NextResponse.json({ error: 'Erro ao criar viagem.' }, { status: 500 });
  }
}

