'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Car, Edit3 } from 'lucide-react';

export default function VehicleModal({ 
  isOpen, 
  onClose, 
  vehicles, 
  activeVehicleId, 
  onSelect, 
  onCreate, 
  onUpdate, 
  onDelete, 
  currentUser 
}) {
  const [formMode, setFormMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [institution, setInstitution] = useState('');
  const [insurance, setInsurance] = useState('');
  const [address, setAddress] = useState('');
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setPlate('');
    setInstitution('');
    setInsurance('');
    setAddress('');
    setObs('');
    setEditingVehicleId(null);
    setError('');
    setFormMode('list');
  };

  const handleStartEdit = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setName(vehicle.name || '');
    setPlate(vehicle.plate || '');
    setInstitution(vehicle.institution || '');
    setInsurance(vehicle.insurance || '');
    setAddress(vehicle.address || '');
    setObs(vehicle.obs || '');
    setError('');
    setFormMode('edit');
  };

  const handleStartAdd = () => {
    resetForm();
    setFormMode('add');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || !plate || !institution) {
      setError('Por favor, preencha nome, placa e instituição.');
      return;
    }

    if (formMode === 'edit' && editingVehicleId) {
      onUpdate({
        id: editingVehicleId,
        name,
        plate,
        institution,
        insurance: insurance || 'Dados Seguro: --------',
        address: address || 'Endereço não informado',
        obs: obs || ''
      });
    } else {
      onCreate({
        name,
        plate,
        institution,
        insurance: insurance || 'Dados Seguro: --------',
        address: address || 'Endereço não informado',
        obs: obs || ''
      });
    }

    resetForm();
  };

  if (!isOpen) return null;

  const isUserAdmin = currentUser?.role === 'adm';

  return (
    <div className="modal-overlay">
      <div className="modal-content small glass">
        <div className="modal-header">
          <h2>Gerenciar Frota</h2>
          <button className="btn btn-secondary btn-icon" onClick={() => { resetForm(); onClose(); }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {formMode === 'list' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))' }}>VEÍCULOS CADASTRADOS</span>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={handleStartAdd}>
                  <Plus size={14} /> Novo Veículo
                </button>
              </div>

              <div className="fleet-list">
                {vehicles.map((v) => (
                  <div key={v.id} className={`fleet-item ${activeVehicleId === v.id ? 'active' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }} onClick={() => onSelect(v.id)}>
                      <div style={{ color: activeVehicleId === v.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                        <Car size={20} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{v.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Placa: {v.plate} | {v.institution}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {activeVehicleId === v.id && (
                        <span style={{ color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>
                          <Check size={16} />
                        </span>
                      )}

                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ padding: '0.35rem' }}
                        onClick={() => handleStartEdit(v)}
                        title="Editar Veículo"
                      >
                        <Edit3 size={14} />
                      </button>
                      
                      {isUserAdmin && vehicles.length > 1 && (
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ color: '#ef4444', padding: '0.35rem' }}
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o veículo ${v.name}?`)) {
                              onDelete(v.id);
                            }
                          }}
                          title="Excluir Veículo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))' }}>
                  {formMode === 'edit' ? 'EDITAR VEÍCULO' : 'CADASTRAR NOVO VEÍCULO'}
                </span>
              </div>

              <div className="form-grid" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label>Nome do Veículo *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: FIAT Strada"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Placa *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: QGS5D36"
                    value={plate} 
                    onChange={(e) => setPlate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Instituição *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: SEAPAC"
                    value={institution} 
                    onChange={(e) => setInstitution(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Dados do Seguro</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Dados Seguro: --------"
                    value={insurance} 
                    onChange={(e) => setInsurance(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Endereço da Instituição</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Rua Trajano Murta, 3317..."
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Observações</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Observações do veículo..."
                    style={{ minHeight: '60px', resize: 'vertical' }}
                    value={obs} 
                    onChange={(e) => setObs(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Voltar</button>
                <button type="submit" className="btn btn-primary">
                  {formMode === 'edit' ? 'Atualizar Veículo' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

