'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';

export default function OfflineBanner({ pendingCount = 0, isSyncing = false, onSyncNow }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="w-full mb-4 rounded-xl overflow-hidden border shadow-sm transition-all duration-300">
      {!isOnline ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 p-3.5 px-4 flex items-center justify-between text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm">Você está no modo offline</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Você pode cadastrar novas viagens normalmente. Elas serão salvas no seu dispositivo e enviadas ao banco de dados assim que a internet voltar.
              </p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="ml-2 whitespace-nowrap px-2.5 py-1 text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full border border-amber-300 dark:border-amber-700">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ) : isSyncing ? (
        <div className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 p-3.5 px-4 flex items-center justify-between text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-lg text-blue-700 dark:text-blue-300">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-sm">Sincronizando com o servidor...</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Enviando viagens salvas offline para o banco de dados. Por favor, aguarde.
              </p>
            </div>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 p-3.5 px-4 flex items-center justify-between text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Conexão reestabelecida!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Você possui <span className="font-bold">{pendingCount}</span> viagem{pendingCount > 1 ? 's' : ''} salva{pendingCount > 1 ? 's' : ''} localmente aguardando envio.
              </p>
            </div>
          </div>
          <button
            onClick={onSyncNow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sincronizar Agora
          </button>
        </div>
      ) : null}
    </div>
  );
}
