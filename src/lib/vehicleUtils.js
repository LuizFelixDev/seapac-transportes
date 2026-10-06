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
 * Soma a coluna "km_rodados" (quilometragem final - inicial) de todas as viagens do veículo
 * realizadas a partir da última troca de óleo registrada.
 */
export function calculateVehicleOilKm(vehicle, trips = []) {
  if (!vehicle || !Array.isArray(trips)) return 0;

  const vehicleTrips = trips.filter(t => String(t.vehicleId) === String(vehicle.id));
  if (vehicleTrips.length === 0) return 0;

  const history = parseOilChangeHistory(vehicle.oilChangeHistory);
  let lastOilKm = Number(vehicle.lastOilChangeKm) || 0;

  if (history.length > 0) {
    const newest = history[0];
    if (newest && newest.km !== undefined && newest.km !== null) {
      lastOilKm = Number(newest.km);
    }
  }

  let totalDriven = 0;

  vehicleTrips.forEach(t => {
    // Obter km_rodados do banco ou calcular (arrivalKm - departureKm)
    let kmRodados = 0;
    if (t.km_rodados !== undefined && t.km_rodados !== null && !isNaN(Number(t.km_rodados)) && Number(t.km_rodados) > 0) {
      kmRodados = Number(t.km_rodados);
    } else {
      const arr = Number(t.arrivalKm);
      const dep = Number(t.departureKm);
      if (!isNaN(arr) && !isNaN(dep) && arr > dep) {
        kmRodados = arr - dep;
      }
    }

    if (kmRodados > 0) {
      const dep = Number(t.departureKm);
      const arr = Number(t.arrivalKm);

      // Se o veículo não possui última troca registrada (lastOilKm = 0), soma todas as viagens do veículo
      if (!lastOilKm || lastOilKm === 0) {
        totalDriven += kmRodados;
      } else {
        // Se a viagem é posterior ao marco da troca de óleo
        if (arr && arr > lastOilKm) {
          if (!isNaN(dep) && dep >= lastOilKm) {
            // Viagem inteiramente realizada após a troca de óleo
            totalDriven += kmRodados;
          } else {
            // Viagem iniciada antes do marco de troca e finalizada depois
            const diff = arr - lastOilKm;
            if (diff > 0) totalDriven += diff;
          }
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
