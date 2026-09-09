'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Plus, MessageSquare, Calendar, User, CheckCircle2 } from 'lucide-react';
import { parseVehicleObservations, addObservationToVehicle } from '@/lib/vehicleUtils';

export default function VehicleObservationsModal({ isOpen, onClose, vehicle, onUpdateVehicle, currentUser }) {
  const [newObsText, setNewObsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !vehicle) return null;

  const observations = parseVehicleObservations(vehicle.obs);

  const handleAddObservation = async (e) => {
    e.preventDefault();
    if (!newObsText.trim()) return;

    try {
      setIsSubmitting(true);
      const updatedObsJson = addObservationToVehicle(vehicle, newObsText, currentUser?.name);
      const updatedVehicleData = {
        ...vehicle,
        obs: updatedObsJson
      };

      await onUpdateVehicle(updatedVehicleData);
      setNewObsText('');
    } catch (err) {
      console.error('Erro ao adicionar observação:', err);
      alert('Erro ao salvar observação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteObservation = async (obsId) => {
    if (!confirm('Deseja marcar esta pendência como resolvida?')) return;

    try {
      setIsSubmitting(true);
      const filtered = observations.filter(o => o.id !== obsId);
      const updatedVehicleData = {
        ...vehicle,
        obs: JSON.stringify(filtered)
      };

      await onUpdateVehicle(updatedVehicleData);
    } catch (err) {
      console.error('Erro ao remover observação:', err);
      alert('Erro ao excluir observação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '540px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
            <AlertTriangle size={20} />
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#b45309' }}>
              Observações do Veículo: {vehicle.name} ({vehicle.plate})
            </h2>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {/* Formulário para Nova Observação */}
          <form onSubmit={handleAddObservation} style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
              ➕ Cadastrar Nova Observação/Aviso
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Trocar óleo aos 130.000km, Pastilha de freio ruindo..."
                value={newObsText}
                onChange={(e) => setNewObsText(e.target.value)}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newObsText.trim()}>
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </form>

          {/* Lista de Observações Cadastradas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
              Histórico de Observações ({observations.length})
            </span>

            {observations.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                Nenhuma observação registrada para este veículo.
              </div>
            ) : (
              observations.map((obs) => (
                <div
                  key={obs.id}
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    color: '#78350f',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#92400e', lineHeight: 1.4 }}>
                      {obs.text}
                    </p>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.7rem',
                        height: '26px',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      onClick={() => handleDeleteObservation(obs.id)}
                      title="Marcar esta pendência como resolvida e excluir o aviso"
                    >
                      <CheckCircle2 size={13} /> Pendência Resolvida
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#b45309', opacity: 0.8, marginTop: '0.2rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Calendar size={12} /> {obs.date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <User size={12} /> {obs.author || 'Condutor'}
                    </span>
                  </div>
                </div>
              ))
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
