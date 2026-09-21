'use client';

import React, { useState, useMemo } from 'react';
import { Droplet, AlertTriangle, CheckCircle2, Car, Search, Calendar, History, ArrowUpDown } from 'lucide-react';
import { checkOilChangeStatus } from '@/lib/vehicleUtils';

export default function OilControlDashboard({
  vehicles = [],
  trips = [],
  onOpenOilModal
}) {
  const [search, setSearch] = useState('');

  // Process all vehicles with their max odometer reading and oil change status
  const vehiclesOilList = useMemo(() => {
    if (!Array.isArray(vehicles)) return [];

    const list = vehicles.map(vehicle => {
      // Find max KM recorded across all trips for this vehicle
      const vehicleTrips = Array.isArray(trips) ? trips.filter(t => t.vehicleId === vehicle.id) : [];
      let maxKm = Number(vehicle.lastOilChangeKm) || 0;
      vehicleTrips.forEach(t => {
        if (t.arrivalKm && Number(t.arrivalKm) > maxKm) maxKm = Number(t.arrivalKm);
        if (t.departureKm && Number(t.departureKm) > maxKm) maxKm = Number(t.departureKm);
      });

      const oilStatus = checkOilChangeStatus(vehicle, maxKm);

      return {
        vehicle,
        maxKm,
        ...oilStatus
      };
    });

    // Sort: vehicles with highest kmDriven first.
    // Vehicles with >= 10000 km will naturally be placed at the top!
    return list.sort((a, b) => b.kmDriven - a.kmDriven);
  }, [vehicles, trips]);

  // Filter list based on search query (name or plate)
  const filteredList = useMemo(() => {
    if (!search.trim()) return vehiclesOilList;
    const q = search.toLowerCase().trim();
    return vehiclesOilList.filter(item => 
      item.vehicle.name.toLowerCase().includes(q) ||
      item.vehicle.plate.toLowerCase().includes(q) ||
      (item.vehicle.institution && item.vehicle.institution.toLowerCase().includes(q))
    );
  }, [vehiclesOilList, search]);

  // Statistics counters
  const totalVehicles = vehiclesOilList.length;
  const urgentCount = vehiclesOilList.filter(item => item.needsOilChange).length;
  const warningCount = vehiclesOilList.filter(item => !item.needsOilChange && item.kmDriven >= 8000).length;
  const okCount = totalVehicles - urgentCount - warningCount;

  return (
    <div className="section-card glass" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="section-title" style={{ flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              backgroundColor: urgentCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)', 
              color: urgentCount > 0 ? '#ef4444' : 'hsl(var(--primary))',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Droplet size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
              Painel de Controle de Óleo da Frota
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
              Ordenado por maior rodagem (Veículos com ≥ 10.000 km priorizados no topo)
            </div>
          </div>
        </div>

        {/* Stats Badges */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {urgentCount > 0 && (
            <span 
              style={{ 
                backgroundColor: '#fee2e2', 
                color: '#991b1b', 
                border: '1px solid #fecaca',
                fontSize: '0.72rem', 
                fontWeight: 800, 
                padding: '0.25rem 0.6rem', 
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <AlertTriangle size={12} style={{ color: '#dc2626' }} />
              {urgentCount} Troca{urgentCount > 1 ? 's' : ''} Requerida{urgentCount > 1 ? 's' : ''}
            </span>
          )}

          {warningCount > 0 && (
            <span 
              style={{ 
                backgroundColor: '#fef3c7', 
                color: '#92400e', 
                border: '1px solid #fde68a',
                fontSize: '0.72rem', 
                fontWeight: 700, 
                padding: '0.25rem 0.6rem', 
                borderRadius: '20px' 
              }}
            >
              ⚡ {warningCount} Próximo{warningCount > 1 ? 's' : ''} do Limite
            </span>
          )}

          <span 
            style={{ 
              backgroundColor: 'hsl(var(--muted))', 
              color: 'hsl(var(--muted-foreground))',
              border: '1px solid hsl(var(--border))',
              fontSize: '0.72rem', 
              fontWeight: 600, 
              padding: '0.25rem 0.6rem', 
              borderRadius: '20px' 
            }}
          >
            {totalVehicles} Veículo{totalVehicles !== 1 ? 's' : ''} no Total
          </span>
        </div>
      </div>

      {/* Filter / Search Bar if multiple vehicles */}
      {totalVehicles > 3 && (
        <div style={{ position: 'relative', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar veículo por nome ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', height: '34px', fontSize: '0.8rem' }}
          />
        </div>
      )}

      {/* Vehicle Cards List */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem', 
          maxHeight: '520px', 
          overflowY: 'auto',
          paddingRight: '0.25rem',
          marginTop: '0.5rem'
        }}
      >
        {filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
            Nenhum veículo encontrado.
          </div>
        ) : (
          filteredList.map((item) => {
            const { vehicle, maxKm, lastOilChangeKm, kmDriven, needsOilChange, kmRemaining } = item;
            
            // Calculate progress percentage capped at 100%
            const pct = Math.min(100, Math.round((kmDriven / 10000) * 100));

            // Dynamic Styling based on alert level
            let cardBg = 'hsl(var(--card))';
            let cardBorder = '1px solid hsl(var(--border))';
            let accentColor = '#10b981'; // Green default
            let badgeBg = 'rgba(16, 185, 129, 0.12)';
            let badgeColor = '#047857';
            let badgeText = `✅ Em dia (${kmRemaining.toLocaleString('pt-BR')} km restantes)`;

            if (needsOilChange) {
              cardBg = 'rgba(239, 68, 68, 0.07)';
              cardBorder = '1.5px solid rgba(239, 68, 68, 0.4)';
              accentColor = '#ef4444';
              badgeBg = '#fee2e2';
              badgeColor = '#991b1b';
              badgeText = '⚠️ TROCA DE ÓLEO REQUERIDA';
            } else if (kmDriven >= 8000) {
              cardBg = 'rgba(245, 158, 11, 0.05)';
              cardBorder = '1px solid rgba(245, 158, 11, 0.3)';
              accentColor = '#f59e0b';
              badgeBg = '#fef3c7';
              badgeColor = '#92400e';
              badgeText = `⚡ Atenção: ${kmRemaining.toLocaleString('pt-BR')} km restantes`;
            }

            return (
              <div
                key={vehicle.id}
                style={{
                  backgroundColor: cardBg,
                  border: cardBorder,
                  borderLeft: `5px solid ${accentColor}`,
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  transition: 'all 0.2s ease',
                  boxShadow: needsOilChange ? '0 4px 12px rgba(239, 68, 68, 0.12)' : 'var(--shadow-sm)'
                }}
              >
                {/* Top Row: Vehicle Info & Alert Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={18} style={{ color: accentColor }} />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{vehicle.name}</span>
                    <span 
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.78rem', 
                        fontWeight: 700,
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        padding: '0.1rem 0.45rem', 
                        borderRadius: '5px' 
                      }}
                    >
                      {vehicle.plate}
                    </span>
                    {vehicle.institution && (
                      <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))' }}>
                        ({vehicle.institution})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        letterSpacing: needsOilChange ? '0.2px' : 'normal'
                      }}
                    >
                      {needsOilChange ? <AlertTriangle size={13} style={{ color: '#dc2626' }} /> : <CheckCircle2 size={13} />}
                      {badgeText}
                    </span>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => onOpenOilModal(vehicle, maxKm)}
                      style={{
                        backgroundColor: needsOilChange ? '#dc2626' : 'hsl(var(--primary))',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.3rem 0.7rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: needsOilChange ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
                        transition: 'transform 0.1s ease'
                      }}
                      title="Registrar Troca de Óleo para este veículo"
                    >
                      <Droplet size={14} />
                      Registrar Troca
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Mileage Numbers */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>Rodagem para Óleo: </span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: needsOilChange ? '#dc2626' : 'hsl(var(--foreground))' }}>
                        {kmDriven.toLocaleString('pt-BR')} km
                      </span>
                      <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}> / 10.000 km</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      Hodômetro Total: <strong>{maxKm.toLocaleString('pt-BR')} km</strong>
                    </div>
                  </div>

                  {/* Progress Bar track */}
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: 'hsl(var(--muted))', 
                      borderRadius: '4px', 
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div 
                      style={{ 
                        width: `${pct}%`, 
                        height: '100%', 
                        backgroundColor: accentColor, 
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>

                {/* Footer notes / last oil change info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', borderTop: '1px dashed hsl(var(--border))', paddingTop: '0.4rem' }}>
                  <div>
                    Última troca registrada a <strong>{lastOilChangeKm > 0 ? `${lastOilChangeKm.toLocaleString('pt-BR')} km` : '0 km (ou não informada)'}</strong>
                  </div>
                  {needsOilChange && (
                    <div style={{ color: '#dc2626', fontWeight: 700 }}>
                      ⚠️ Ultrapassou {(kmDriven - 10000).toLocaleString('pt-BR')} km do limite!
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
