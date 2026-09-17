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
 * Calcula o status de troca de óleo do veículo.
 */
export function checkOilChangeStatus(vehicle, currentKm = 0) {
  if (!vehicle) return { needsOilChange: false, kmDriven: 0, lastOilChangeKm: 0 };
  
  const lastChange = Number(vehicle.lastOilChangeKm) || 0;
  const currKm = Number(currentKm) || 0;
  const kmDriven = Math.max(0, currKm - lastChange);
  const needsOilChange = kmDriven >= 10000;

  return {
    currentKm: currKm,
    lastOilChangeKm: lastChange,
    kmDriven,
    needsOilChange,
    kmRemaining: Math.max(0, 10000 - kmDriven)
  };
}
