'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, User } from 'lucide-react';

export default function DriverModal({ isOpen, onClose, drivers, onCreate, onDelete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, digite o nome do condutor.');
      return;
    }

    // Check duplicate
    if (drivers.some(d => d.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('Este condutor já está cadastrado.');
      return;
    }

    onCreate({ name: name.trim() });
    setName('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content small glass">
        <div className="modal-header">
          <h2>Condutores Autorizados</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Quick Add Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Nome do novo condutor..."
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 0.85rem' }}>
              <Plus size={16} /> Adicionar
            </button>
          </form>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Lista de Condutores ({drivers.length})
          </span>

          <div className="items-manager-list" style={{ marginTop: '0.5rem' }}>
            {drivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                Nenhum condutor cadastrado.
              </div>
            ) : (
              drivers.map((d) => (
                <div key={d.id} className="item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <User size={14} style={{ color: 'hsl(var(--primary))' }} />
                    {d.name}
                  </div>
                  
                  {drivers.length > 1 && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-icon" 
                      style={{ color: '#ef4444', padding: '0.25rem', border: 'none', background: 'transparent' }}
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover o condutor ${d.name}?`)) {
                          onDelete(d.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
