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
let schemaPromise = null;

async function ensureSchema() {
  if (schemaInitialized) return;
  if (!sql) return;

  if (!schemaPromise) {
    schemaPromise = (async () => {
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
        obs TEXT,
        "lastOilChangeKm" NUMERIC(10, 2) DEFAULT 0,
        "oilChangeHistory" TEXT DEFAULT '[]'
      );
    `;

    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS "lastOilChangeKm" NUMERIC(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "oilChangeHistory" TEXT DEFAULT '[]';
    `;

    // 2. Criar tabela de motoristas
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `;

    // Criar tabela de usuários autorizados
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('adm', 'normal'))
      );
    `;

    // Criar tabela de solicitações de acesso
    await sql`
      CREATE TABLE IF NOT EXISTS login_requests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected'))
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
        "routeTo" TEXT,
        "departureTime" TEXT NOT NULL,
        "departureKm" NUMERIC(10, 2) NOT NULL,
        "arrivalTime" TEXT,
        "arrivalKm" NUMERIC(10, 2),
        "km_rodados" NUMERIC(10, 2) DEFAULT 0,
        "refuelKm" NUMERIC(10, 2),
        "refuelLiters" NUMERIC(10, 2),
        "fuelType" TEXT,
        "isPartial" BOOLEAN DEFAULT FALSE,
        "createdBy" TEXT
      );
    `;

    // Garantir que as colunas novas existam e remover restrições NOT NULL antigas
    await sql`
      ALTER TABLE trips 
      ADD COLUMN IF NOT EXISTS "isPartial" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
      ADD COLUMN IF NOT EXISTS "km_rodados" NUMERIC(10, 2) DEFAULT 0,
      ALTER COLUMN "routeTo" DROP NOT NULL,
      ALTER COLUMN "arrivalTime" DROP NOT NULL,
      ALTER COLUMN "arrivalKm" DROP NOT NULL;
    `;

    // Atualiza viagens existentes no banco calculando km_rodados se estiver zerado/nulo
    await sql`
      UPDATE trips 
      SET "km_rodados" = ("arrivalKm" - "departureKm")
      WHERE "arrivalKm" IS NOT NULL AND "departureKm" IS NOT NULL AND ("km_rodados" IS NULL OR "km_rodados" = 0);
    `;

    // Criar tabela de postos de combustível
    await sql`
      CREATE TABLE IF NOT EXISTS gas_stations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        "gasolinePrice" NUMERIC(10, 3) DEFAULT 0,
        "ethanolPrice" NUMERIC(10, 3) DEFAULT 0
      );
    `;

    // Vincular posto de combustível ao abastecimento da viagem
    await sql`
      ALTER TABLE trips
      ADD COLUMN IF NOT EXISTS "gasStationId" TEXT,
      ADD COLUMN IF NOT EXISTS "gasStationName" TEXT,
      ADD COLUMN IF NOT EXISTS "fuelUnitPrice" NUMERIC(10, 3),
      ADD COLUMN IF NOT EXISTS "fuelCost" NUMERIC(10, 2);
    `;

    // Remover coluna signature caso ainda exista na tabela
    await sql`
      ALTER TABLE trips 
      DROP COLUMN IF EXISTS signature;
    `;

    // Alterar colunas de KM de INTEGER para NUMERIC(10, 2) se necessário
    const columnCheck = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trips' AND column_name = 'departureKm';
    `;
    if (columnCheck.length > 0 && columnCheck[0].data_type === 'integer') {
      console.log('Migrando colunas de KM da tabela trips de INTEGER para NUMERIC(10, 2)...');
      await sql`
        ALTER TABLE trips 
        ALTER COLUMN "departureKm" TYPE NUMERIC(10, 2),
        ALTER COLUMN "arrivalKm" TYPE NUMERIC(10, 2),
        ALTER COLUMN "refuelKm" TYPE NUMERIC(10, 2);
      `;
    }

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

    const usersCount = await sql`SELECT COUNT(*)::int FROM users`;
    if (usersCount[0].count === 0) {
      await sql`
        INSERT INTO users (id, name, email, role)
        VALUES 
          ('1', 'Administrador SEAPAC', 'admin@seapac.org', 'adm'),
          ('2', 'Francisco Silva', 'francisco.silva@seapac.org', 'normal'),
          ('3', 'Maria Sousa', 'maria.sousa@seapac.org', 'normal'),
          ('4', 'João Medeiros', 'joao.medeiros@seapac.org', 'normal'),
          ('5', 'Luiz Felix', 'luiz.felix@seapac.org', 'adm'),
          ('6', 'Luiz Felix', 'luiz-felix@gmail.com', 'adm'),
          ('7', 'Francisco Teste', 'francisco.teste@gmail.com', 'normal'),
          ('8', 'Luiz Henrique', 'luiz.henrique.felix.709@ufrn.edu.br', 'adm')
      `;
    }

    // Garantir que o email específico solicitado seja adicionado como adm se não existir
    const specificUserCheck = await sql`SELECT COUNT(*)::int FROM users WHERE LOWER(email) = 'luiz.henrique.felix.709@ufrn.edu.br'`;
    if (specificUserCheck[0].count === 0) {
      await sql`
        INSERT INTO users (id, name, email, role)
        VALUES ('8', 'Luiz Henrique', 'luiz.henrique.felix.709@ufrn.edu.br', 'adm')
      `;
    }

    const tripsCount = await sql`SELECT COUNT(*)::int FROM trips`;
    if (tripsCount[0].count === 0) {
      await sql`
        INSERT INTO trips (id, "vehicleId", date, driver, "routeFrom", "routeTo", "departureTime", "departureKm", "arrivalTime", "arrivalKm", "km_rodados", "refuelKm", "refuelLiters", "fuelType", "isPartial", "createdBy")
        VALUES 
          ('1', '1', '2026-08-01', 'Francisco Silva', 'Natal', 'Mossoró', '07:00', 125400, '11:30', 125680, 280, 125550, 35.5, 'G', false, 'admin@seapac.org'),
          ('2', '1', '2026-08-02', 'Maria Sousa', 'Mossoró', 'Caicó', '13:00', 125680, '16:45', 125850, 170, null, null, '', false, 'admin@seapac.org'),
          ('3', '1', '2026-08-03', 'João Medeiros', 'Caicó', 'Natal', '08:00', 125850, '12:15', 126130, 280, 126000, 40.2, 'A', false, 'admin@seapac.org');
      `;
    }

        schemaInitialized = true;
      } catch (error) {
        console.error('Falha ao inicializar o schema do banco de dados:', error);
        schemaPromise = null;
      }
    })();
  }

  return schemaPromise;
}

// --- TRIPS CRUD ---
export async function getTrips() {
  await ensureSchema();
  const db = getClient();
  
  const rows = await db`SELECT * FROM trips`;
  return rows.map(t => ({
    ...t,
    departureKm: Number(t.departureKm),
    arrivalKm: t.arrivalKm ? Number(t.arrivalKm) : null,
    km_rodados: t.km_rodados !== null && t.km_rodados !== undefined 
      ? Number(t.km_rodados) 
      : ((t.arrivalKm && t.departureKm) ? Number((Number(t.arrivalKm) - Number(t.departureKm)).toFixed(2)) : 0),
    refuelLiters: t.refuelLiters ? Number(t.refuelLiters) : null,
    refuelKm: t.refuelKm ? Number(t.refuelKm) : null,
    fuelUnitPrice: t.fuelUnitPrice !== null && t.fuelUnitPrice !== undefined ? Number(t.fuelUnitPrice) : null,
    fuelCost: t.fuelCost !== null && t.fuelCost !== undefined ? Number(t.fuelCost) : null
  }));
}

export async function getTripById(id) {
  await ensureSchema();
  const db = getClient();
  
  const rows = await db`SELECT * FROM trips WHERE id = ${id}`;
  if (rows.length > 0) {
    const t = rows[0];
    return {
      ...t,
      departureKm: Number(t.departureKm),
      arrivalKm: t.arrivalKm ? Number(t.arrivalKm) : null,
      km_rodados: t.km_rodados !== null && t.km_rodados !== undefined 
        ? Number(t.km_rodados) 
        : ((t.arrivalKm && t.departureKm) ? Number((Number(t.arrivalKm) - Number(t.departureKm)).toFixed(2)) : 0),
      refuelLiters: t.refuelLiters ? Number(t.refuelLiters) : null,
      refuelKm: t.refuelKm ? Number(t.refuelKm) : null,
      fuelUnitPrice: t.fuelUnitPrice !== null && t.fuelUnitPrice !== undefined ? Number(t.fuelUnitPrice) : null,
      fuelCost: t.fuelCost !== null && t.fuelCost !== undefined ? Number(t.fuelCost) : null
    };
  }
  return null;
}

// Calcula o preço do combustível: litros x preço do litro (álcool/gasolina) do posto selecionado
async function computeFuelCost(db, trip, refuelLiters) {
  if (!refuelLiters || !trip.fuelType || !trip.gasStationId) {
    return { fuelUnitPrice: null, fuelCost: null };
  }
  let unitPrice = Number(trip.fuelUnitPrice);
  if (!unitPrice || unitPrice <= 0) {
    const rows = await db`SELECT "gasolinePrice", "ethanolPrice" FROM gas_stations WHERE id = ${trip.gasStationId}`;
    if (rows.length === 0) return { fuelUnitPrice: null, fuelCost: null };
    unitPrice = Number(trip.fuelType === 'A' ? rows[0].ethanolPrice : rows[0].gasolinePrice);
  }
  if (!unitPrice) return { fuelUnitPrice: null, fuelCost: null };
  return {
    fuelUnitPrice: Number(unitPrice.toFixed(3)),
    fuelCost: Number((refuelLiters * unitPrice).toFixed(2))
  };
}

// Atualiza o preço por litro no cadastro do posto quando o usuário alterou o valor na viagem
async function syncStationPrice(db, trip) {
  if (!trip.updateStationPrice || !trip.gasStationId) return;
  const price = Number(trip.fuelUnitPrice);
  if (!price || price <= 0) return;
  const value = Number(price.toFixed(3));
  if (trip.fuelType === 'A') {
    await db`UPDATE gas_stations SET "ethanolPrice" = ${value} WHERE id = ${trip.gasStationId}`;
  } else {
    await db`UPDATE gas_stations SET "gasolinePrice" = ${value} WHERE id = ${trip.gasStationId}`;
  }
}

export async function addTrip(trip) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  
  const departureKm = Number(trip.departureKm);
  const arrivalKm = (trip.arrivalKm !== null && trip.arrivalKm !== undefined && trip.arrivalKm !== '') ? Number(trip.arrivalKm) : null;
  const km_rodados = (arrivalKm !== null && departureKm !== null && arrivalKm >= departureKm)
    ? Number((arrivalKm - departureKm).toFixed(2))
    : (trip.km_rodados ? Number(trip.km_rodados) : 0);
  const refuelKm = trip.refuelKm ? Number(trip.refuelKm) : null;
  const refuelLiters = trip.refuelLiters ? Number(trip.refuelLiters) : null;
  const isPartial = !!trip.isPartial;
  const createdBy = trip.createdBy || null;
  const { fuelUnitPrice, fuelCost } = await computeFuelCost(db, trip, refuelLiters);
  await syncStationPrice(db, trip);
  
  await db`
    INSERT INTO trips (
      id, "vehicleId", date, driver, "routeFrom", "routeTo", 
      "departureTime", "departureKm", "arrivalTime", "arrivalKm", "km_rodados",
      "refuelKm", "refuelLiters", "fuelType", "isPartial", "createdBy",
      "gasStationId", "gasStationName", "fuelUnitPrice", "fuelCost"
    )
    VALUES (
      ${id}, ${trip.vehicleId}, ${trip.date}, ${trip.driver}, ${trip.routeFrom}, ${trip.routeTo || null},
      ${trip.departureTime}, ${departureKm}, ${trip.arrivalTime || null}, ${arrivalKm}, ${km_rodados},
      ${refuelKm}, ${refuelLiters}, ${trip.fuelType || ''}, ${isPartial}, ${createdBy},
      ${trip.gasStationId || null}, ${trip.gasStationName || null}, ${fuelUnitPrice}, ${fuelCost}
    )
  `;
  
  return {
    ...trip,
    id,
    departureKm,
    arrivalKm,
    km_rodados,
    refuelKm,
    refuelLiters,
    isPartial,
    createdBy,
    fuelUnitPrice,
    fuelCost
  };
}

export async function updateTrip(id, updatedTrip) {
  await ensureSchema();
  const db = getClient();
  
  const departureKm = Number(updatedTrip.departureKm);
  const arrivalKm = (updatedTrip.arrivalKm !== null && updatedTrip.arrivalKm !== undefined && updatedTrip.arrivalKm !== '') ? Number(updatedTrip.arrivalKm) : null;
  const km_rodados = (arrivalKm !== null && departureKm !== null && arrivalKm >= departureKm)
    ? Number((arrivalKm - departureKm).toFixed(2))
    : (updatedTrip.km_rodados ? Number(updatedTrip.km_rodados) : 0);
  const refuelKm = updatedTrip.refuelKm ? Number(updatedTrip.refuelKm) : null;
  const refuelLiters = updatedTrip.refuelLiters ? Number(updatedTrip.refuelLiters) : null;
  const isPartial = !!updatedTrip.isPartial;
  const { fuelUnitPrice, fuelCost } = await computeFuelCost(db, updatedTrip, refuelLiters);
  await syncStationPrice(db, updatedTrip);
  
  const result = await db`
    UPDATE trips
    SET "vehicleId" = ${updatedTrip.vehicleId},
        date = ${updatedTrip.date},
        driver = ${updatedTrip.driver},
        "routeFrom" = ${updatedTrip.routeFrom},
        "routeTo" = ${updatedTrip.routeTo || null},
        "departureTime" = ${updatedTrip.departureTime},
        "departureKm" = ${departureKm},
        "arrivalTime" = ${updatedTrip.arrivalTime || null},
        "arrivalKm" = ${arrivalKm},
        "km_rodados" = ${km_rodados},
        "refuelKm" = ${refuelKm},
        "refuelLiters" = ${refuelLiters},
        "fuelType" = ${updatedTrip.fuelType || ''},
        "gasStationId" = ${updatedTrip.gasStationId || null},
        "gasStationName" = ${updatedTrip.gasStationName || null},
        "fuelUnitPrice" = ${fuelUnitPrice},
        "fuelCost" = ${fuelCost},
        "isPartial" = ${isPartial}
    WHERE id = ${id}
    RETURNING *
  `;
  
  if (result.length > 0) {
    const t = result[0];
    return {
      ...t,
      departureKm: Number(t.departureKm),
      arrivalKm: t.arrivalKm ? Number(t.arrivalKm) : null,
      km_rodados: Number(t.km_rodados),
      refuelLiters: t.refuelLiters ? Number(t.refuelLiters) : null,
      refuelKm: t.refuelKm ? Number(t.refuelKm) : null,
      fuelUnitPrice: t.fuelUnitPrice !== null && t.fuelUnitPrice !== undefined ? Number(t.fuelUnitPrice) : null,
      fuelCost: t.fuelCost !== null && t.fuelCost !== undefined ? Number(t.fuelCost) : null
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
  const lastOilChangeKm = vehicle.lastOilChangeKm !== undefined && vehicle.lastOilChangeKm !== null ? Number(vehicle.lastOilChangeKm) : 0;
  const oilChangeHistory = typeof vehicle.oilChangeHistory === 'string' ? vehicle.oilChangeHistory : JSON.stringify(vehicle.oilChangeHistory || []);
  
  await db`
    INSERT INTO vehicles (id, name, plate, institution, insurance, address, obs, "lastOilChangeKm", "oilChangeHistory")
    VALUES (${id}, ${vehicle.name}, ${vehicle.plate}, ${vehicle.institution}, ${vehicle.insurance || ''}, ${vehicle.address || ''}, ${vehicle.obs || ''}, ${lastOilChangeKm}, ${oilChangeHistory})
  `;
  
  return {
    ...vehicle,
    id,
    lastOilChangeKm,
    oilChangeHistory
  };
}

export async function updateVehicle(id, updatedVehicle) {
  await ensureSchema();
  const db = getClient();
  const lastOilChangeKm = updatedVehicle.lastOilChangeKm !== undefined && updatedVehicle.lastOilChangeKm !== null ? Number(updatedVehicle.lastOilChangeKm) : 0;
  const oilChangeHistory = typeof updatedVehicle.oilChangeHistory === 'string' ? updatedVehicle.oilChangeHistory : JSON.stringify(updatedVehicle.oilChangeHistory || []);
  
  const result = await db`
    UPDATE vehicles
    SET name = ${updatedVehicle.name},
        plate = ${updatedVehicle.plate},
        institution = ${updatedVehicle.institution},
        insurance = ${updatedVehicle.insurance || ''},
        address = ${updatedVehicle.address || ''},
        obs = ${updatedVehicle.obs || ''},
        "lastOilChangeKm" = ${lastOilChangeKm},
        "oilChangeHistory" = ${oilChangeHistory}
    WHERE id = ${id}
    RETURNING *
  `;
  
  if (result.length > 0) {
    const v = result[0];
    return {
      ...v,
      lastOilChangeKm: v.lastOilChangeKm ? Number(v.lastOilChangeKm) : 0
    };
  }
  return null;
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

// --- USERS CRUD ---
export async function getUsers() {
  await ensureSchema();
  const db = getClient();
  return await db`SELECT * FROM users ORDER BY name ASC`;
}

export async function getUserByEmail(email) {
  await ensureSchema();
  const db = getClient();
  const result = await db`SELECT * FROM users WHERE LOWER(email) = ${email.toLowerCase()}`;
  return result.length > 0 ? result[0] : null;
}

export async function addUser(user) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  
  await db`
    INSERT INTO users (id, name, email, role)
    VALUES (${id}, ${user.name}, ${user.email}, ${user.role})
  `;
  
  return {
    ...user,
    id
  };
}

export async function updateUser(id, updatedUser) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`
    UPDATE users
    SET name = ${updatedUser.name},
        email = ${updatedUser.email},
        role = ${updatedUser.role}
    WHERE id = ${id}
    RETURNING *
  `;
  
  return result.length > 0 ? result[0] : null;
}

export async function deleteUser(id) {
  await ensureSchema();
  const db = getClient();
  
  // Get user email before deleting
  const userResult = await db`SELECT email FROM users WHERE id = ${id}`;
  if (userResult.length > 0) {
    const email = userResult[0].email;
    // Delete from users
    await db`DELETE FROM users WHERE id = ${id}`;
    // Delete corresponding login request to allow fresh request attempts
    await db`DELETE FROM login_requests WHERE LOWER(email) = ${email.toLowerCase()}`;
    return true;
  }
  return false;
}

// --- LOGIN REQUESTS CRUD ---
export async function getPendingRequests() {
  await ensureSchema();
  const db = getClient();
  return await db`SELECT * FROM login_requests WHERE status = 'pending' ORDER BY date ASC`;
}

export async function getLoginRequestByEmail(email) {
  await ensureSchema();
  const db = getClient();
  const result = await db`SELECT * FROM login_requests WHERE LOWER(email) = ${email.toLowerCase()}`;
  return result.length > 0 ? result[0] : null;
}

export async function addLoginRequest(request) {
  await ensureSchema();
  const db = getClient();
  const id = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];
  
  await db`
    INSERT INTO login_requests (id, name, email, date, status)
    VALUES (${id}, ${request.name}, ${request.email.toLowerCase()}, ${today}, 'pending')
  `;
  
  return {
    id,
    name: request.name,
    email: request.email.toLowerCase(),
    date: today,
    status: 'pending'
  };
}

export async function updateLoginRequestStatus(id, status) {
  await ensureSchema();
  const db = getClient();
  
  const result = await db`
    UPDATE login_requests
    SET status = ${status}
    WHERE id = ${id}
    RETURNING *
  `;
  
  return result.length > 0 ? result[0] : null;
}

// ==================== POSTOS DE COMBUSTÍVEL ====================
function mapStation(r) {
  return {
    ...r,
    gasolinePrice: Number(r.gasolinePrice) || 0,
    ethanolPrice: Number(r.ethanolPrice) || 0,
  };
}

export async function getGasStations() {
  await ensureSchema();
  const sql = getClient();
  const rows = await sql`SELECT * FROM gas_stations ORDER BY name ASC`;
  return rows.map(mapStation);
}

export async function addGasStation(data) {
  await ensureSchema();
  const sql = getClient();
  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO gas_stations (id, name, location, "gasolinePrice", "ethanolPrice")
    VALUES (${id}, ${data.name}, ${data.location || ''}, ${Number(data.gasolinePrice) || 0}, ${Number(data.ethanolPrice) || 0})
    RETURNING *`;
  return mapStation(rows[0]);
}

export async function deleteGasStation(id) {
  await ensureSchema();
  const sql = getClient();
  const rows = await sql`DELETE FROM gas_stations WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
