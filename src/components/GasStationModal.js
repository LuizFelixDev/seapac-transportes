'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Fuel, MapPin } from 'lucide-react';

const emptyForm = { name: '', location: '', gasolinePrice: '', ethanolPrice: '' };

const formatBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 3 });

export default function GasStationModal({ isOpen, onClose }) {
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gas-stations');
      if (res.ok) setStations(await res.json());
    } catch (err) {
      console.error('Erro ao carregar postos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStations();
      setError('');
    }
  }, [isOpen]);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Informe o nome do posto.');
    if (!form.location.trim()) return setError('Informe a localização do posto.');

    const parsePrice = (v) => parseFloat(String(v).replace(',', '.'));
    const gasolinePrice = parsePrice(form.gasolinePrice);
    const ethanolPrice = parsePrice(form.ethanolPrice);
    if (isNaN(gasolinePrice) || gasolinePrice < 0) return setError('Preço da gasolina inválido.');
    if (isNaN(ethanolPrice) || ethanolPrice < 0) return setError('Preço do álcool inválido.');

    setSaving(true);
    try {
      const res = await fetch('/api/gas-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), location: form.location.trim(), gasolinePrice, ethanolPrice })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar posto.');
      setStations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Tem certeza que deseja remover o posto ${s.name}?`)) return;
    try {
      const res = await fetch(`/api/gas-stations?id=${encodeURIComponent(s.id)}`, { method: 'DELETE' });
      if (res.ok) setStations((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const labelStyle = { fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' };

  return (
    <div className="modal-overlay">
      <div className="modal-content small glass">
        <div className="modal-header">
          <h2>Postos de Combustível</h2>
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

          {!showForm ? (
            <button id="btn-new-gas-station" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Cadastrar Posto
            </button>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '10px' }}>
              <div>
                <label style={labelStyle} htmlFor="gs-name">Nome do Posto</label>
                <input id="gs-name" type="text" className="form-control" placeholder="Ex: Posto Ipiranga Centro" value={form.name} onChange={handleChange('name')} required />
              </div>
              <div>
                <label style={labelStyle} htmlFor="gs-location">Localização</label>
                <input id="gs-location" type="text" className="form-control" placeholder="Endereço / cidade" value={form.location} onChange={handleChange('location')} required />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="gs-gasoline">Preço Gasolina (R$)</label>
                  <input id="gs-gasoline" type="number" step="0.001" min="0" inputMode="decimal" className="form-control" placeholder="0,000" value={form.gasolinePrice} onChange={handleChange('gasolinePrice')} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="gs-ethanol">Preço Álcool (R$)</label>
                  <input id="gs-ethanol" type="number" step="0.001" min="0" inputMode="decimal" className="form-control" placeholder="0,000" value={form.ethanolPrice} onChange={handleChange('ethanolPrice')} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); setError(''); }}>
                  Cancelar
                </button>
                <button id="btn-save-gas-station" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Postos Cadastrados ({stations.length})
          </span>

          <div className="items-manager-list" style={{ marginTop: '0.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Carregando...</div>
            ) : stations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                Nenhum posto cadastrado.
              </div>
            ) : (
              stations.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', marginBottom: '0.35rem', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Fuel size={14} style={{ color: 'hsl(var(--primary))' }} /> {s.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.15rem' }}>
                      <MapPin size={12} /> {s.location || '—'}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                      Gasolina: <strong>{formatBRL(s.gasolinePrice)}</strong> · Álcool: <strong>{formatBRL(s.ethanolPrice)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    style={{ color: '#ef4444', padding: '0.25rem', border: 'none', background: 'transparent' }}
                    onClick={() => handleDelete(s)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
