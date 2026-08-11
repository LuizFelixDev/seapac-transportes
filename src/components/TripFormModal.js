'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, PenTool, Type, RefreshCw } from 'lucide-react';

export default function TripFormModal({ isOpen, onClose, onSubmit, trip, drivers, activeVehicleId }) {
  const [date, setDate] = useState('');
  const [driver, setDriver] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [departureKm, setDepartureKm] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalKm, setArrivalKm] = useState('');
  
  // Refueling fields
  const [hasRefuel, setHasRefuel] = useState(false);
  const [refuelKm, setRefuelKm] = useState('');
  const [refuelLiters, setRefuelLiters] = useState('');
  const [fuelType, setFuelType] = useState('');

  // Signature fields
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' or 'type'
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Initialize form fields when editing or opening
  useEffect(() => {
    if (trip) {
      setDate(trip.date || '');
      setDriver(trip.driver || '');
      setRouteFrom(trip.routeFrom || '');
      setRouteTo(trip.routeTo || '');
      setDepartureTime(trip.departureTime || '');
      setDepartureKm(trip.departureKm || '');
      setArrivalTime(trip.arrivalTime || '');
      setArrivalKm(trip.arrivalKm || '');
      
      if (trip.refuelKm || trip.refuelLiters || trip.fuelType) {
        setHasRefuel(true);
        setRefuelKm(trip.refuelKm || '');
        setRefuelLiters(trip.refuelLiters || '');
        setFuelType(trip.fuelType || '');
      } else {
        setHasRefuel(false);
        setRefuelKm('');
        setRefuelLiters('');
        setFuelType('');
      }

      if (trip.signature && trip.signature.startsWith('data:image')) {
        setSignatureMode('draw');
        // Let's load it onto canvas in a micro-tick
        setTimeout(() => {
          drawDataURLOnCanvas(trip.signature);
        }, 100);
      } else {
        setSignatureMode('type');
        setTypedSignature(trip.signature || '');
        setSignatureConfirmed(!!trip.signature);
      }
    } else {
      // Set defaults for new trip
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDriver('');
      setRouteFrom('');
      setRouteTo('');
      setDepartureTime('');
      setDepartureKm('');
      setArrivalTime('');
      setArrivalKm('');
      setHasRefuel(false);
      setRefuelKm('');
      setRefuelLiters('');
      setFuelType('');
      setSignatureMode('draw');
      setTypedSignature('');
      setSignatureConfirmed(false);
      
      // Clear canvas if it exists
      setTimeout(() => {
        clearCanvas();
      }, 50);
    }
    setError('');
  }, [trip, isOpen]);

  // Canvas drawing functions
  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasMousePos(e);
    
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1b4332'; // Deep Green
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawDataURLOnCanvas = (dataURL) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!date || !driver || !routeFrom || !routeTo || !departureTime || !departureKm || !arrivalTime || !arrivalKm) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const depKm = Number(departureKm);
    const arrKm = Number(arrivalKm);

    if (depKm >= arrKm) {
      setError('O KM de Chegada deve ser estritamente maior que o KM de Saída.');
      return;
    }

    if (hasRefuel) {
      if (!refuelKm || !refuelLiters || !fuelType) {
        setError('Preencha todas as informações de abastecimento ou desmarque a opção.');
        return;
      }
      const refKm = Number(refuelKm);
      if (refKm < depKm || refKm > arrKm) {
        setError('O KM de Abastecimento deve estar entre o KM de Saída e o KM de Chegada.');
        return;
      }
    }

    // Get Signature
    let finalSignature = '';
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        // Check if canvas is blank
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (canvas.toDataURL() === blank.toDataURL()) {
          setError('Por favor, faça a sua assinatura na tela.');
          return;
        }
        finalSignature = canvas.toDataURL();
      }
    } else {
      if (!typedSignature.trim()) {
        setError('Por favor, digite o seu nome para a assinatura digital.');
        return;
      }
      if (!signatureConfirmed) {
        setError('Você precisa marcar a caixa confirmando a assinatura.');
        return;
      }
      finalSignature = typedSignature.trim();
    }

    const payload = {
      vehicleId: activeVehicleId,
      date,
      driver,
      routeFrom,
      routeTo,
      departureTime,
      departureKm: depKm,
      arrivalTime,
      arrivalKm: arrKm,
      refuelKm: hasRefuel ? Number(refuelKm) : null,
      refuelLiters: hasRefuel ? Number(refuelLiters) : null,
      fuelType: hasRefuel ? fuelType : '',
      signature: finalSignature
    };

    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>{trip ? 'Editar Registro de Viagem' : 'Registrar Nova Viagem'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
            
            <div className="form-grid two-cols">
              <div className="form-group">
                <label>Data *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>Condutor *</label>
                <select 
                  className="form-control" 
                  value={driver} 
                  onChange={(e) => setDriver(e.target.value)}
                  required
                >
                  <option value="">Selecione o motorista...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Origem (De) *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Natal"
                  value={routeFrom} 
                  onChange={(e) => setRouteFrom(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>Destino (Para) *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Caicó"
                  value={routeTo} 
                  onChange={(e) => setRouteTo(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>Horário Saída *</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={departureTime} 
                  onChange={(e) => setDepartureTime(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>KM Saída *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ex: 125400"
                  value={departureKm} 
                  onChange={(e) => setDepartureKm(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>Horário Chegada *</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={arrivalTime} 
                  onChange={(e) => setArrivalTime(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label>KM Final *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ex: 125680"
                  value={arrivalKm} 
                  onChange={(e) => setArrivalKm(e.target.value)} 
                  required
                />
              </div>

              {/* Refueling Toggle */}
              <div className="form-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input 
                  type="checkbox" 
                  id="hasRefuel" 
                  checked={hasRefuel} 
                  onChange={(e) => setHasRefuel(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="hasRefuel" style={{ cursor: 'pointer', textTransform: 'none', fontSize: '0.85rem', color: 'hsl(var(--foreground))' }}>
                  Houve Abastecimento durante a viagem
                </label>
              </div>

              {/* Refueling fields */}
              {hasRefuel && (
                <>
                  <div className="section-subtitle-form">Dados do Abastecimento</div>
                  
                  <div className="form-group">
                    <label>KM Abastecimento *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ex: 125550"
                      value={refuelKm} 
                      onChange={(e) => setRefuelKm(e.target.value)} 
                      required={hasRefuel}
                    />
                  </div>

                  <div className="form-group">
                    <label>Quantidade Litros *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="Ex: 35.5"
                      value={refuelLiters} 
                      onChange={(e) => setRefuelLiters(e.target.value)} 
                      required={hasRefuel}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Combustível *</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', color: 'inherit', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="fuelType" 
                          value="G" 
                          checked={fuelType === 'G'} 
                          onChange={() => setFuelType('G')} 
                          style={{ width: '16px', height: '16px' }}
                          required={hasRefuel}
                        /> Gasoline
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', color: 'inherit', fontWeight: 600 }}>
                        <input 
                          type="radio" 
                          name="fuelType" 
                          value="A" 
                          checked={fuelType === 'A'} 
                          onChange={() => setFuelType('A')} 
                          style={{ width: '16px', height: '16px' }}
                        /> Álcool
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Signature section */}
              <div className="form-divider" />
              <div className="section-subtitle-form">Assinatura do Condutor</div>
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label>Método de Assinatura</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      type="button" 
                      className={`btn btn-secondary btn-icon ${signatureMode === 'draw' ? 'btn-primary' : ''}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
                      onClick={() => setSignatureMode('draw')}
                    >
                      <PenTool size={12} /> Desenhar
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-secondary btn-icon ${signatureMode === 'type' ? 'btn-primary' : ''}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
                      onClick={() => setSignatureMode('type')}
                    >
                      <Type size={12} /> Digitar
                    </button>
                  </div>
                </div>

                {signatureMode === 'draw' ? (
                  <div className="signature-container">
                    <canvas 
                      ref={canvasRef}
                      width={600}
                      height={120}
                      className="signature-pad-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                        onClick={clearCanvas}
                      >
                        <RefreshCw size={12} /> Limpar Desenho
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nome completo para assinatura eletrônica"
                      style={{ fontFamily: "'Outfit', cursive, sans-serif", fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.5px' }}
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'none', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', marginTop: '0.25rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={signatureConfirmed} 
                        onChange={(e) => setSignatureConfirmed(e.target.checked)} 
                        style={{ width: '14px', height: '14px' }}
                      />
                      Declaro que as informações acima são verdadeiras e assino digitalmente este documento.
                    </label>
                  </div>
                )}
              </div>

            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Viagem</button>
          </div>
        </form>
      </div>
    </div>
  );
}
