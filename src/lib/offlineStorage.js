const DB_NAME = 'seapac_offline_db';
const DB_VERSION = 1;
const STORE_PENDING_TRIPS = 'pending_trips';
const STORE_REFERENCE_CACHE = 'reference_cache';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB não é suportado neste ambiente.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PENDING_TRIPS)) {
        db.createObjectStore(STORE_PENDING_TRIPS, { keyPath: 'offlineId' });
      }
      if (!db.objectStoreNames.contains(STORE_REFERENCE_CACHE)) {
        db.createObjectStore(STORE_REFERENCE_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Salva uma nova viagem pendente na fila do IndexedDB
 */
export async function savePendingTrip(tripData) {
  try {
    const db = await openDB();
    const offlineId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pendingItem = {
      ...tripData,
      offlineId,
      pendingSync: true,
      createdAtOffline: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_TRIPS, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_TRIPS);
      const request = store.put(pendingItem);

      request.onsuccess = () => resolve(pendingItem);
      request.onerror = (err) => reject(err);
    });
  } catch (err) {
    console.error('Erro ao salvar viagem offline no IndexedDB:', err);
    throw err;
  }
}

/**
 * Retorna todas as viagens pendentes de envio
 */
export async function getPendingTrips() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_TRIPS, 'readonly');
      const store = tx.objectStore(STORE_PENDING_TRIPS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (err) => reject(err);
    });
  } catch (err) {
    console.error('Erro ao buscar viagens pendentes no IndexedDB:', err);
    return [];
  }
}

/**
 * Remove uma viagem da fila após sincronização realizada com sucesso no servidor
 */
export async function removePendingTrip(offlineId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING_TRIPS, 'readwrite');
      const store = tx.objectStore(STORE_PENDING_TRIPS);
      const request = store.delete(offlineId);

      request.onsuccess = () => resolve(true);
      request.onerror = (err) => reject(err);
    });
  } catch (err) {
    console.error('Erro ao remover viagem sincronizada do IndexedDB:', err);
    return false;
  }
}

/**
 * Salva dados de referência (veículos, motoristas, viagens recentes) em cache no IndexedDB
 */
export async function cacheReferenceData(key, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REFERENCE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_REFERENCE_CACHE);
      const request = store.put({ key, data, updatedAt: Date.now() });

      request.onsuccess = () => resolve(true);
      request.onerror = (err) => reject(err);
    });
  } catch (err) {
    console.error(`Erro ao salvar cache [${key}] no IndexedDB:`, err);
    return false;
  }
}

/**
 * Recupera dados de referência armazenados em cache
 */
export async function getCachedReferenceData(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REFERENCE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_REFERENCE_CACHE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = (err) => reject(err);
    });
  } catch (err) {
    console.error(`Erro ao buscar cache [${key}] do IndexedDB:`, err);
    return null;
  }
}
