'use client';

import React, { useState, useEffect } from 'react';
import { X, Droplet, Calendar, User, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import { parseOilChangeHistory } from '@/lib/vehicleUtils';

export default function OilChangeModal({
  isOpen,
  onClose,
  vehicle,
  currentKm = 0,
  onSaveOilChange,
  currentUser
}) {
  const [km, setKm] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vehicle && isOpen) {
      setKm(currentKm ? String(currentKm) : (vehicle.lastOilChangeKm ? String(vehicle.lastOilChangeKm) : '0'));
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
    }
  }, [vehicle, currentKm, isOpen]);

  if (!isOpen || !vehicle) return null;

  const lastChangeKm = vehicle.lastOilChangeKm || 0;
  const kmDrivenSince = Math.max(0, (currentKm || 0) - lastChangeKm);
  const needsWarning = kmDrivenSince >= 10000;
  const history = parseOilChangeHistory(vehicle.oilChangeHistory);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericKm = Number(km);
    if (isNaN(numericKm) || numericKm < 0) {
      setError('Por favor, informe uma quilometragem válida.');
      return;
    }

    if (!date) {
      setError('Por favor, informe a data da troca de óleo.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveOilChange(vehicle, {
        km: numericKm,
        date,
        notes: notes.trim(),
        author: currentUser?.name || 'Condutor'
      });
      onClose();
    } catch (err) {
      console.error('Erro ao registrar troca de óleo:', err);
      setError('Erro ao salvar registro de troca de óleo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '520px' }}>
        <div 
          className="modal-header" 
          style={{ 
            backgroundColor: needsWarning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.08)',
            borderBottom: needsWarning ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: needsWarning ? '#dc2626' : 'hsl(var(--primary))' }}>
            <Droplet size={20} />
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'inherit' }}>
              Troca de Óleo: {vehicle.name} ({vehicle.plate})
            </h2>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {/* Status Banner */}
          <div 
            style={{ 
              padding: '0.75rem 1rem', 
              borderRadius: '10px', 
              marginBottom: '1.25rem',
              backgroundColor: needsWarning ? '#fef2f2' : '#f0fdf4',
              border: needsWarning ? '1px solid #fecaca' : '1px solid #bbf7d0',
              color: needsWarning ? '#991b1b' : '#166534',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
              {needsWarning ? <AlertTriangle size={18} style={{ color: '#dc2626' }} /> : <CheckCircle2 size={18} style={{ color: '#16a34a' }} />}
              <span>{needsWarning ? '⚠️ Troca de Óleo Requerida!' : '✅ Troca de Óleo em Dia'}</span>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Quilometragem Atual: <strong>{currentKm.toLocaleString('pt-BR')} km</strong> | Última Troca Registrada: <strong>{lastChangeKm.toLocaleString('pt-BR')} km</strong>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.1rem' }}>
              Percorridos desde a última troca: <span style={{ textDecoration: 'underline' }}>{kmDrivenSince.toLocaleString('pt-BR')} km</span> / 10.000 km
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Form to Register Oil Change */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.75rem' }}>
              🛢️ Registrar Nova Troca de Óleo
            </span>

            <div className="form-grid two-cols" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label>KM da Troca Realizada *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="Ex: 50245"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Data da Troca *</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Observações / Marca do Óleo (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Óleo 15W40 Havoline + Filtro trocado"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem 1.25rem' }}>
                <Droplet size={16} /> Salvar Troca de Óleo
              </button>
            </div>
          </form>

          {/* Oil Change History */}
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
              <History size={14} /> Histórico de Trocas de Óleo ({history.length})
            </span>

            {history.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>
                Nenhuma troca de óleo registrada anteriormente para este veículo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      backgroundColor: 'hsl(var(--muted))',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>KM: {Number(item.km).toLocaleString('pt-BR')} km</div>
                      {item.notes && <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{item.notes}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                      <div><Calendar size={10} style={{ display: 'inline', marginRight: '2px' }} />{item.date}</div>
                      <div><User size={10} style={{ display: 'inline', marginRight: '2px' }} />{item.author || 'Condutor'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
