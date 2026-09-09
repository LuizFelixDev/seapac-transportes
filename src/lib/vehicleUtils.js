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
