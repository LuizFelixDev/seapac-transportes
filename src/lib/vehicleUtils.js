/**
 * Converte a coluna `obs` do veículo (que pode ser um texto legado ou uma string JSON)
 * em um array de objetos de observação estruturados: [{ id, text, date, author }].
 */
export function parseVehicleObservations(obs) {
  if (!obs) return [];
  if (Array.isArray(obs)) return obs;

  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    if (typeof obs === 'string' && obs.trim().length > 0) {
      return [{
        id: 'legacy-1',
        text: obs.trim(),
        date: 'Registro Anterior',
        author: 'Sistema'
      }];
    }
  }
  return [];
}

/**
 * Adiciona uma nova observação ao array existente e retorna a nova string JSON para ser salva em `obs`.
 */
export function addObservationToVehicle(vehicle, newText, authorName) {
  const currentObs = parseVehicleObservations(vehicle.obs);
  const newEntry = {
    id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: newText.trim(),
    date: new Date().toLocaleDateString('pt-BR'),
    author: authorName || 'Condutor'
  };

  const updatedObs = [newEntry, ...currentObs];
  return JSON.stringify(updatedObs);
}

/**
 * Converte o histórico de trocas de óleo (que pode ser um JSON string ou array) em array.
 */
export function parseOilChangeHistory(history) {
  if (!history) return [];
  if (Array.isArray(history)) return history;

  try {
    const parsed = JSON.parse(history);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  return [];
}

/**
 * Adiciona um registro no histórico de troca de óleo e atualiza `lastOilChangeKm`.
 */
export function createOilChangeRecord(vehicle, km, date, notes, authorName) {
  const currentHistory = parseOilChangeHistory(vehicle.oilChangeHistory);
  const newEntry = {
    id: `oil-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    km: Number(km),
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '',
    author: authorName || 'Condutor'
  };

  const updatedHistory = [newEntry, ...currentHistory];

  return {
    ...vehicle,
    lastOilChangeKm: Number(km),
    oilChangeHistory: JSON.stringify(updatedHistory)
  };
}

/**
 * Normaliza strings de data no formato YYYY-MM-DD ou DD/MM/YYYY para comparação ISO.
 */
function normalizeDateStr(dStr) {
  if (typeof dStr !== 'string') return dStr;
  if (dStr.includes('/')) {
    const parts = dStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dStr;
}

/**
 * Soma a coluna "RODADOS" (arrivalKm - departureKm) de todas as viagens do veículo
 * realizadas a partir da última troca de óleo registrada.
 */
export function calculateVehicleOilKm(vehicle, trips = []) {
  if (!vehicle || !Array.isArray(trips)) return 0;

  const vehicleTrips = trips.filter(t => String(t.vehicleId) === String(vehicle.id));
  if (vehicleTrips.length === 0) return 0;

  const history = parseOilChangeHistory(vehicle.oilChangeHistory);
  let lastOilDate = null;
  let lastOilKm = Number(vehicle.lastOilChangeKm) || 0;

  if (history.length > 0) {
    const newest = history[0];
    if (newest.date) lastOilDate = newest.date;
    if (newest.km) lastOilKm = Number(newest.km);
  }

  let totalDriven = 0;

  vehicleTrips.forEach(t => {
    const dep = Number(t.departureKm);
    const arr = Number(t.arrivalKm);

    if (!isNaN(arr) && !isNaN(dep) && arr > dep) {
      let isTripAfterOilChange = true;

      if (lastOilDate && t.date) {
        const tripDateNorm = normalizeDateStr(t.date);
        const oilDateNorm = normalizeDateStr(lastOilDate);
        if (tripDateNorm < oilDateNorm) {
          isTripAfterOilChange = false;
        }
      }

      if (lastOilKm > 0 && arr <= lastOilKm) {
        isTripAfterOilChange = false;
      }

      if (isTripAfterOilChange) {
        const effectiveDep = lastOilKm > 0 ? Math.max(dep, lastOilKm) : dep;
        const diff = arr - effectiveDep;
        // Proteção contra erro de digitação (ex: viagem individual discrepante > 1.500 km)
        if (diff > 0 && diff <= 1500) {
          totalDriven += diff;
        }
      }
    }
  });

  return Number(totalDriven.toFixed(2));
}

/**
 * Calcula o status de troca de óleo do veículo com base na soma da coluna "RODADOS" das viagens.
 */
export function checkOilChangeStatus(vehicle, tripsOrKm = [], optionalTrips = null) {
  if (!vehicle) return { needsOilChange: false, kmDriven: 0, lastOilChangeKm: 0, kmRemaining: 10000, currentKm: 0 };
  
  let trips = [];
  let currentKm = Number(vehicle.lastOilChangeKm) || 0;

  if (Array.isArray(tripsOrKm)) {
    trips = tripsOrKm;
  } else if (Array.isArray(optionalTrips)) {
    trips = optionalTrips;
    if (typeof tripsOrKm === 'number') currentKm = tripsOrKm;
  } else if (typeof tripsOrKm === 'number') {
    currentKm = tripsOrKm;
  }

  const lastChange = Number(vehicle.lastOilChangeKm) || 0;
  const kmDriven = calculateVehicleOilKm(vehicle, trips);

  // Encontra a quilometragem máxima do hodômetro para o veículo (ignorando discrepâncias absurdas)
  const vehicleTrips = trips.filter(t => String(t.vehicleId) === String(vehicle.id));
  vehicleTrips.forEach(t => {
    const arr = Number(t.arrivalKm);
    const dep = Number(t.departureKm);
    if (arr && arr > currentKm && (!dep || arr - dep <= 1500)) currentKm = arr;
    if (dep && dep > currentKm && (!arr || arr - dep <= 1500)) currentKm = dep;
  });

  const needsOilChange = kmDriven >= 10000;

  return {
    currentKm,
    lastOilChangeKm: lastChange,
    kmDriven,
    needsOilChange,
    kmRemaining: Math.max(0, 10000 - kmDriven)
  };
}
