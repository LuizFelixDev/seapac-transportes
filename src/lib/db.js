import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// Função auxiliar para verificar a conexão antes de executar queries
function getClient() {
  if (!sql) {
    throw new Error('DATABASE_URL não configurada nas variáveis de ambiente.');
  }
  return sql;
}

let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  if (!sql) return;

  try {
    // 1. Criar tabela de veículos
    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plate TEXT NOT NULL,
        institution TEXT NOT NULL,
        insurance TEXT,
        address TEXT,
        obs TEXT
      );
    `;

    // 2. Criar tabela de motoristas
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `;

    // 3. Criar tabela de viagens
    await sql`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        "vehicleId" TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        driver TEXT NOT NULL,
        "routeFrom" TEXT NOT NULL,
        "routeTo" TEXT NOT NULL,
        "departureTime" TEXT NOT NULL,
        "departureKm" INTEGER NOT NULL,
        "arrivalTime" TEXT NOT NULL,
        "arrivalKm" INTEGER NOT NULL,
        "refuelKm" INTEGER,
        "refuelLiters" NUMERIC(10, 2),
        "fuelType" TEXT,
        signature TEXT NOT NULL
      );
    `;

    // Seed de dados iniciais se as tabelas estiverem vazias
    const vehiclesCount = await sql`SELECT COUNT(*)::int FROM vehicles`;
    if (vehiclesCount[0].count === 0) {
      await sql`
        INSERT INTO vehicles (id, name, plate, institution, insurance, address, obs)
        VALUES ('1', 'FIAT Strada', 'QGS5D36', 'SEAPAC', 'Dados Seguro: Mapfre Auto - Vigência: 2026/2027', 'Rua Trajano Murta, 3317 - Candelária - Natal/RN', 'Veículo em perfeito estado de conservação.');
      `;
    }

    const driversCount = await sql`SELECT COUNT(*)::int FROM drivers`;
    if (driversCount[0].count === 0) {
      await sql`
        INSERT INTO drivers (id, name)
        VALUES 
          ('1', 'Francisco Silva'),
          ('2', 'Maria Sousa'),
          ('3', 'João Medeiros');
      `;
    }

    const tripsCount = await sql`SELECT COUNT(*)::int FROM trips`;
    if (tripsCount[0].count === 0) {
      await sql`
        INSERT INTO trips (id, "vehicleId", date, driver, "routeFrom", "routeTo", "departureTime", "departureKm", "arrivalTime", "arrivalKm", "refuelKm", "refuelLiters", "fuelType", signature)
        VALUES 
          ('1', '1', '2026-08-01', 'Francisco Silva', 'Natal', 'Mossoró', '07:00', 125400, '11:30', 125680, 125550, 35.5, 'G', 'Francisco Silva'),
          ('2', '1', '2026-08-02', 'Maria Sousa', 'Mossoró', 'Caicó', '13:00', 125680, '16:45', 125850, null, null, '', 'Maria Sousa'),
          ('3', '1', '2026-08-03', 'João Medeiros', 'Caicó', 'Natal', '08:00', 125850, '12:15', 126130, 126000, 40.2, 'A', 'João Medeiros');
      `;
    }

    schemaInitialized = true;
  } catch (error) {
    console.error('Falha ao inicializar o schema do banco de dados:', error);
  }
}

// --- TRIPS CRUD ---
export async function getTrips() {
  await ensureSchema();
  const db = getClient();
  
  const rows = await db`SELECT * FROM trips`;
  return rows.map(t => ({
    ...t,
    refuelLiters: t.refuelLiters ? Number(t.refuelLiters) : null
  }));
}

export async function addTrip(trip) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  
  const departureKm = Number(trip.departureKm);
  const arrivalKm = Number(trip.arrivalKm);
  const refuelKm = trip.refuelKm ? Number(trip.refuelKm) : null;
  const refuelLiters = trip.refuelLiters ? Number(trip.refuelLiters) : null;
  
  await db`
    INSERT INTO trips (
      id, "vehicleId", date, driver, "routeFrom", "routeTo", 
      "departureTime", "departureKm", "arrivalTime", "arrivalKm", 
      "refuelKm", "refuelLiters", "fuelType", signature
    )
    VALUES (
      ${id}, ${trip.vehicleId}, ${trip.date}, ${trip.driver}, ${trip.routeFrom}, ${trip.routeTo},
      ${trip.departureTime}, ${departureKm}, ${trip.arrivalTime}, ${arrivalKm},
      ${refuelKm}, ${refuelLiters}, ${trip.fuelType || ''}, ${trip.signature}
    )
  `;
  
  return {
    ...trip,
    id,
    departureKm,
    arrivalKm,
    refuelKm,
    refuelLiters
  };
}

export async function updateTrip(id, updatedTrip) {
  await ensureSchema();
  const db = getClient();
  
  const departureKm = Number(updatedTrip.departureKm);
  const arrivalKm = Number(updatedTrip.arrivalKm);
  const refuelKm = updatedTrip.refuelKm ? Number(updatedTrip.refuelKm) : null;
  const refuelLiters = updatedTrip.refuelLiters ? Number(updatedTrip.refuelLiters) : null;
  
  const result = await db`
    UPDATE trips
    SET "vehicleId" = ${updatedTrip.vehicleId},
        date = ${updatedTrip.date},
        driver = ${updatedTrip.driver},
        "routeFrom" = ${updatedTrip.routeFrom},
        "routeTo" = ${updatedTrip.routeTo},
        "departureTime" = ${updatedTrip.departureTime},
        "departureKm" = ${departureKm},
        "arrivalTime" = ${updatedTrip.arrivalTime},
        "arrivalKm" = ${arrivalKm},
        "refuelKm" = ${refuelKm},
        "refuelLiters" = ${refuelLiters},
        "fuelType" = ${updatedTrip.fuelType || ''},
        signature = ${updatedTrip.signature}
    WHERE id = ${id}
    RETURNING *
  `;
  
  if (result.length > 0) {
    const t = result[0];
    return {
      ...t,
      refuelLiters: t.refuelLiters ? Number(t.refuelLiters) : null
    };
  }
  return null;
}

export async function deleteTrip(id) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`DELETE FROM trips WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}

// --- VEHICLES CRUD ---
export async function getVehicles() {
  await ensureSchema();
  const db = getClient();
  return await db`SELECT * FROM vehicles ORDER BY name ASC`;
}

export async function addVehicle(vehicle) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  
  await db`
    INSERT INTO vehicles (id, name, plate, institution, insurance, address, obs)
    VALUES (${id}, ${vehicle.name}, ${vehicle.plate}, ${vehicle.institution}, ${vehicle.insurance || ''}, ${vehicle.address || ''}, ${vehicle.obs || ''})
  `;
  
  return {
    ...vehicle,
    id
  };
}

export async function updateVehicle(id, updatedVehicle) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`
    UPDATE vehicles
    SET name = ${updatedVehicle.name},
        plate = ${updatedVehicle.plate},
        institution = ${updatedVehicle.institution},
        insurance = ${updatedVehicle.insurance || ''},
        address = ${updatedVehicle.address || ''},
        obs = ${updatedVehicle.obs || ''}
    WHERE id = ${id}
    RETURNING *
  `;
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteVehicle(id) {
  await ensureSchema();
  const db = getClient();
  
  // Verifica se é o último veículo
  const countResult = await db`SELECT COUNT(*)::int FROM vehicles`;
  if (countResult[0].count <= 1) {
    return false;
  }
  
  // Deleta o veículo
  const deleteResult = await db`DELETE FROM vehicles WHERE id = ${id} RETURNING id`;
  if (deleteResult.length > 0) {
    // Atualiza as viagens desse veículo para um veículo alternativo
    const remaining = await db`SELECT id FROM vehicles LIMIT 1`;
    if (remaining.length > 0) {
      const fallbackId = remaining[0].id;
      await db`UPDATE trips SET "vehicleId" = ${fallbackId} WHERE "vehicleId" = ${id}`;
    }
    return true;
  }
  
  return false;
}

// --- DRIVERS CRUD ---
export async function getDrivers() {
  await ensureSchema();
  const db = getClient();
  return await db`SELECT * FROM drivers ORDER BY name ASC`;
}

export async function addDriver(driver) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  
  await db`
    INSERT INTO drivers (id, name)
    VALUES (${id}, ${driver.name})
  `;
  
  return {
    ...driver,
    id
  };
}

export async function updateDriver(id, updatedDriver) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`
    UPDATE drivers
    SET name = ${updatedDriver.name}
    WHERE id = ${id}
    RETURNING *
  `;
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteDriver(id) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`DELETE FROM drivers WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}
