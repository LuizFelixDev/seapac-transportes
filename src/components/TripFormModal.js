'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, PenTool, Type, RefreshCw, Loader2 } from 'lucide-react';
import MapPickerModal from './MapPickerModal';

export default function TripFormModal({ isOpen, onClose, onSubmit, trip, lastTrip, drivers, vehicles = [], onAddVehicle, activeVehicleId }) {
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

  // Map and Geolocation fields
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState(null); // 'from' or 'to'
  const [loadingLoc, setLoadingLoc] = useState(null); // 'from', 'to' or null

  // Coordinate and distance estimation fields
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [estimatedKm, setEstimatedKm] = useState(null);

  // Vehicle selection and quick-add states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showQuickVehicle, setShowQuickVehicle] = useState(false);
  const [newVName, setNewVName] = useState('');
  const [newVPlate, setNewVPlate] = useState('');
  const [newVInstitution, setNewVInstitution] = useState('');

  const handleQuickAddVehicle = async () => {
    if (!newVName || !newVPlate || !newVInstitution) {
      alert('Por favor, preencha o Nome, Placa e Instituição para cadastrar o veículo.');
      return;
    }
    try {
      const created = await onAddVehicle({
        name: newVName,
        plate: newVPlate,
        institution: newVInstitution,
        insurance: 'Dados Seguro: --------',
        address: 'Endereço não informado',
        obs: ''
      });
      if (created && created.id) {
        setSelectedVehicleId(created.id);
        setNewVName('');
        setNewVPlate('');
        setNewVInstitution('');
        setShowQuickVehicle(false);
      }
    } catch (err) {
      console.error('Error quickly adding vehicle:', err);
    }
  };

  // Fetch driving distance from OSRM when both coordinates are available
  useEffect(() => {
    if (!fromCoords || !toCoords) {
      setEstimatedKm(null);
      return;
    }

    const fetchDistance = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?overview=false`
        );
        if (!res.ok) throw new Error('OSRM routing query failed');
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const distanceMeters = data.routes[0].distance;
          const distanceKm = Number((distanceMeters / 1000).toFixed(2));
          setEstimatedKm(distanceKm);
          
          // Auto-fill arrival KM
          const baseKm = departureKm ? Number(departureKm) : 0;
          setArrivalKm(baseKm + distanceKm);
        }
      } catch (error) {
        console.error('Error fetching distance from OSRM:', error);
      }
    };

    fetchDistance();
  }, [fromCoords, toCoords]);

  // Update arrival KM when departure KM changes and estimation is present
  useEffect(() => {
    if (estimatedKm !== null) {
      const baseKm = departureKm ? Number(departureKm) : 0;
      setArrivalKm(baseKm + estimatedKm);
    }
  }, [departureKm, estimatedKm]);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const geocodeTextSilently = async (text, type) => {
    if (!text || text.trim().length < 3) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1&addressdetails=1&accept-language=pt-br`,
        {
          headers: {
            'User-Agent': 'SEAPAC-Transportes-App/1.0'
          }
        }
      );
      if (!res.ok) throw new Error('Silently geocoding text failed');
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (type === 'from') setFromCoords({ lat, lng });
        if (type === 'to') setToCoords({ lat, lng });
      }
    } catch (error) {
      console.error('Silent text geocoding error:', error);
    }
  };

  const handleGetLocation = (target) => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLoadingLoc(target);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&accept-language=pt-br`,
            {
              headers: {
                'User-Agent': 'SEAPAC-Transportes-App/1.0'
              }
            }
          );
          if (!response.ok) throw new Error('Geocoding query failed');
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            const parts = [];

            if (addr.road) {
              parts.push(addr.road);
            } else if (addr.suburb) {
              parts.push(addr.suburb);
            } else if (addr.neighbourhood) {
              parts.push(addr.neighbourhood);
            }

            const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
            if (city) {
              parts.push(city);
            }

            let stateAbbr = '';
            if (addr.state) {
              const s = addr.state.toLowerCase();
              if (s.includes('rio grande do norte')) stateAbbr = 'RN';
              else if (s.includes('paraíba')) stateAbbr = 'PB';
              else if (s.includes('ceará')) stateAbbr = 'CE';
              else if (s.includes('pernambuco')) stateAbbr = 'PE';
              else stateAbbr = addr.state.slice(0, 2).toUpperCase();
            }

            const shortAddr = parts.join(', ') + (stateAbbr ? `/${stateAbbr}` : '');
            const finalVal = shortAddr || data.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

            if (target === 'from') {
              setRouteFrom(finalVal);
              setFromCoords({ lat: latitude, lng: longitude });
            }
            if (target === 'to') {
              setRouteTo(finalVal);
              setToCoords({ lat: latitude, lng: longitude });
            }
          } else {
            const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (target === 'from') {
              setRouteFrom(fallback);
              setFromCoords({ lat: latitude, lng: longitude });
            }
            if (target === 'to') {
              setRouteTo(fallback);
              setToCoords({ lat: latitude, lng: longitude });
            }
          }
        } catch (err) {
          console.error('Error fetching address:', err);
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (target === 'from') {
            setRouteFrom(fallback);
            setFromCoords({ lat: latitude, lng: longitude });
          }
          if (target === 'to') {
            setRouteTo(fallback);
            setToCoords({ lat: latitude, lng: longitude });
          }
        } finally {
          setLoadingLoc(null);
        }
      },
      (error) => {
        console.error('GPS error:', error);
        alert('Não foi possível obter a sua localização atual via GPS.');
        setLoadingLoc(null);
      },
      { timeout: 8000 }
    );
  };

  const handleOpenMapPicker = (target) => {
    setMapTarget(target);
    setIsMapOpen(true);
  };

  const handleMapConfirm = (resolvedAddress, lat, lng) => {
    if (mapTarget === 'from') {
      setRouteFrom(resolvedAddress);
      setFromCoords({ lat, lng });
    }
    if (mapTarget === 'to') {
      setRouteTo(resolvedAddress);
      setToCoords({ lat, lng });
    }
    setIsMapOpen(false);
    setMapTarget(null);
  };

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

      setSelectedVehicleId(trip.vehicleId || '');

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
      // Set defaults for new trip (pre-filling starting locations & KM from last trip if available)
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDriver(lastTrip ? lastTrip.driver : '');
      setRouteFrom(lastTrip ? lastTrip.routeTo : '');
      setRouteTo('');
      setDepartureTime('');
      setDepartureKm(lastTrip ? lastTrip.arrivalKm : '0');
      setArrivalTime('');
      setArrivalKm('');

      // Trigger silent geocoding of the pre-filled start point so distance calculations work immediately
      if (lastTrip && lastTrip.routeTo) {
        geocodeTextSilently(lastTrip.routeTo, 'from');
      }
      setFromCoords(null);
      setToCoords(null);
      setEstimatedKm(null);
      setSelectedVehicleId(activeVehicleId || '');
      setShowQuickVehicle(false);
      setNewVName('');
      setNewVPlate('');
      setNewVInstitution('');
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
  }, [trip, lastTrip, isOpen, activeVehicleId]);

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

    if (!selectedVehicleId) {
      setError('Por favor, selecione ou cadastre o veículo utilizado.');
      return;
    }

    // Validations (allowing 0 as a valid KM value)
    const clientHasMissingFields = 
      !date || 
      !driver || 
      !routeFrom || 
      !routeTo || 
      !departureTime || 
      !arrivalTime ||
      departureKm === undefined || departureKm === null || departureKm === '' ||
      arrivalKm === undefined || arrivalKm === null || arrivalKm === '';

    if (clientHasMissingFields) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const depKm = Number(departureKm);
    const arrKm = Number(arrivalKm);

    if (depKm > arrKm) {
      setError('O KM de Chegada deve ser maior ou igual ao KM de Saída.');
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
      vehicleId: selectedVehicleId,
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
              {/* Vehicle Selection & Quick Add */}
              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 600 }}>Veículo Utilizado *</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    onClick={() => setShowQuickVehicle(!showQuickVehicle)}
                  >
                    {showQuickVehicle ? 'Cancelar Cadastro' : '➕ Cadastrar Novo Veículo'}
                  </button>
                </div>
                
                {!showQuickVehicle ? (
                  <select 
                    className="form-control" 
                    value={selectedVehicleId} 
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o veículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.plate}) - {v.institution}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'hsl(var(--muted))', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border))', marginTop: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ex: FIAT Mobi" 
                      style={{ flex: 1, minWidth: '120px', height: '36px' }}
                      value={newVName}
                      onChange={(e) => setNewVName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Placa (ex: ABC1D23)" 
                      style={{ flex: 1, minWidth: '100px', height: '36px' }}
                      value={newVPlate}
                      onChange={(e) => setNewVPlate(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Instituição (ex: SEAPAC)" 
                      style={{ flex: 1, minWidth: '120px', height: '36px' }}
                      value={newVInstitution}
                      onChange={(e) => setNewVInstitution(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', height: '36px' }}
                      onClick={handleQuickAddVehicle}
                    >
                      Cadastrar
                    </button>
                  </div>
                )}
              </div>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Origem (De) *</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => handleGetLocation('from')}
                      disabled={loadingLoc === 'from'}
                    >
                      {loadingLoc === 'from' ? <Loader2 size={10} style={{ animation: 'spin 1s infinite linear' }} /> : '📍 Atual'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => handleOpenMapPicker('from')}
                    >
                      🗺️ Mapa
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Candelária, Natal/RN"
                  value={routeFrom}
                  onChange={(e) => {
                    setRouteFrom(e.target.value);
                    setFromCoords(null);
                  }}
                  onBlur={(e) => geocodeTextSilently(e.target.value, 'from')}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Destino (Para) *</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => handleGetLocation('to')}
                      disabled={loadingLoc === 'to'}
                    >
                      {loadingLoc === 'to' ? <Loader2 size={10} style={{ animation: 'spin 1s infinite linear' }} /> : '📍 Atual'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '24px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => handleOpenMapPicker('to')}
                    >
                      🗺️ Mapa
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Centro, Caicó/RN"
                  value={routeTo}
                  onChange={(e) => {
                    setRouteTo(e.target.value);
                    setToCoords(null);
                  }}
                  onBlur={(e) => geocodeTextSilently(e.target.value, 'to')}
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
                  step="any"
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
                  step="any"
                  className="form-control"
                  placeholder="Ex: 125680"
                  value={arrivalKm}
                  onChange={(e) => setArrivalKm(e.target.value)}
                  required
                />
                {estimatedKm !== null && (
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', fontWeight: 700, marginTop: '0.2rem' }}>
                    Distância estimada: +{estimatedKm} km. KM Final sugerido: {departureKm ? Number(departureKm) + estimatedKm : '-'}
                  </span>
                )}
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
                      step="any"
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

      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={handleMapConfirm}
        title={mapTarget === 'from' ? "Selecionar Ponto de Partida" : "Selecionar Ponto de Chegada"}
      />
    </div>
  );
}
