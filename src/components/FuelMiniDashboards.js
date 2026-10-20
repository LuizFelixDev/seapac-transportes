'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fuel, MapPin, Droplets, Trophy, CalendarDays, ChevronDown, Check } from 'lucide-react';

const PERIODS = [
  { key: 'daily', label: 'Diário', desc: 'Abastecido hoje' },
  { key: 'weekly', label: 'Semanal', desc: 'Últimos 7 dias' },
  { key: 'monthly', label: 'Mensal', desc: 'Mês atual' },
  { key: 'all', label: 'Geral', desc: 'Total abastecido na frota' },
];

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function periodStart(period) {
  const now = new Date();
  if (period === 'daily') return ymd(now);
  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return ymd(d);
  }
  if (period === 'monthly') return ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  return null;
}

const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 3, maximumFractionDigits: 3 });
const liters = (v) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`;

/**
 * Two compact, independently scrollable panels:
 *  1. Liters consumed per vehicle (all refuels in `trips`, split by fuel type)
 *  2. Gas stations with their gasoline / ethanol price per liter
 */
export default function FuelMiniDashboards({ vehicles = [], trips = [], refreshKey = 0 }) {
  const [stations, setStations] = useState([]);
  const [stationsStatus, setStationsStatus] = useState('loading'); // loading | ok | error
  const [period, setPeriod] = useState('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef(null);
  const currentPeriod = PERIODS.find((p) => p.key === period);

  useEffect(() => {
    if (!periodOpen) return;
    const onDown = (e) => {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setPeriodOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [periodOpen]);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer;

    const load = (attempt = 1) => {
      fetch('/api/gas-stations', { signal: controller.signal, cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data) => {
          setStations(Array.isArray(data) ? data : []);
          setStationsStatus('ok');
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          if (attempt < 3) {
            retryTimer = setTimeout(() => load(attempt + 1), 1200 * attempt);
          } else {
            setStationsStatus('error');
          }
        });
    };

    load();
    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
  }, [refreshKey]);

  // --- Liters per vehicle ---
  const litersByVehicle = useMemo(() => {
    const map = new Map();
    (Array.isArray(vehicles) ? vehicles : []).forEach((v) =>
      map.set(String(v.id), { vehicle: v, total: 0, gasoline: 0, ethanol: 0, refuels: 0 })
    );
    const start = periodStart(period);
    const today = ymd(new Date());
    (Array.isArray(trips) ? trips : []).forEach((t) => {
      const l = Number(t.refuelLiters);
      if (!l || l <= 0) return;
      if (start) {
        const d = String(t.date || '').slice(0, 10);
        if (!d || d < start || d > today) return;
      }
      const entry = map.get(String(t.vehicleId));
      if (!entry) return;
      entry.total += l;
      entry.refuels += 1;
      if (t.fuelType === 'A') entry.ethanol += l;
      else entry.gasoline += l;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [vehicles, trips, period]);

  const fleetTotal = litersByVehicle.reduce((s, e) => s + e.total, 0);
  const maxLiters = litersByVehicle[0]?.total || 0;

  // --- Gas stations ---
  const cheapest = useMemo(() => {
    const valid = (key) => stations.map((s) => Number(s[key])).filter((n) => n > 0);
    const g = valid('gasolinePrice');
    const e = valid('ethanolPrice');
    return { gasoline: g.length ? Math.min(...g) : null, ethanol: e.length ? Math.min(...e) : null };
  }, [stations]);

  return (
    <div className="mini-dash-grid print-hide">
      {/* PANEL 1: Liters per vehicle */}
      <section className="mini-dash glass" aria-labelledby="mini-dash-liters-title">
        <header className="mini-dash-header">
          <div className="mini-dash-title">
            <span className="mini-dash-icon"><Droplets size={16} /></span>
            <div>
              <h2 id="mini-dash-liters-title">Litros por Veículo</h2>
              <p>{currentPeriod.desc}</p>
            </div>
          </div>
          <div className="mini-dash-actions">
            <span className="mini-dash-pill">{liters(fleetTotal)}</span>
            <div className="period-filter" ref={periodRef}>
              <button
                type="button"
                id="liters-period-filter-btn"
                className={`period-filter-btn ${periodOpen ? 'open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={periodOpen}
                onClick={() => setPeriodOpen((o) => !o)}
              >
                <CalendarDays size={13} />
                {currentPeriod.label}
                <ChevronDown size={13} className="chev" />
              </button>
              {periodOpen && (
                <ul className="period-filter-menu" role="listbox">
                  {PERIODS.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        id={`liters-period-${p.key}`}
                        role="option"
                        aria-selected={p.key === period}
                        className={p.key === period ? 'active' : ''}
                        onClick={() => {
                          setPeriod(p.key);
                          setPeriodOpen(false);
                        }}
                      >
                        <span>{p.label}</span>
                        {p.key === period && <Check size={13} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>

        <div className="mini-dash-legend">
          <span><i className="dot gasoline" /> Gasolina</span>
          <span><i className="dot ethanol" /> Álcool</span>
        </div>

        <ul className="mini-dash-list" id="liters-by-vehicle-list">
          {litersByVehicle.length === 0 ? (
            <li className="mini-dash-empty">Nenhum veículo cadastrado.</li>
          ) : (
            litersByVehicle.map(({ vehicle, total, gasoline, ethanol, refuels }, i) => {
              const width = maxLiters ? (total / maxLiters) * 100 : 0;
              const gPct = total ? (gasoline / total) * 100 : 0;
              return (
                <li key={vehicle.id} className="mini-dash-row">
                  <div className="mini-dash-row-top">
                    <div className="mini-dash-row-name">
                      <span className="rank">{i + 1}</span>
                      <strong>{vehicle.name}</strong>
                      <span className="plate">{vehicle.plate}</span>
                    </div>
                    <span className="mini-dash-value">{liters(total)}</span>
                  </div>
                  <div className="mini-dash-bar" title={`Gasolina: ${liters(gasoline)} • Álcool: ${liters(ethanol)}`}>
                    <div className="mini-dash-bar-fill" style={{ width: `${width}%` }}>
                      <span className="seg gasoline" style={{ width: `${gPct}%` }} />
                      <span className="seg ethanol" style={{ width: `${100 - gPct}%` }} />
                    </div>
                  </div>
                  <div className="mini-dash-row-sub">
                    {refuels} abastecimento{refuels !== 1 ? 's' : ''}
                    {total > 0 && <> • G {liters(gasoline)} • A {liters(ethanol)}</>}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* PANEL 2: Gas station prices */}
      <section className="mini-dash glass" aria-labelledby="mini-dash-stations-title">
        <header className="mini-dash-header">
          <div className="mini-dash-title">
            <span className="mini-dash-icon accent"><Fuel size={16} /></span>
            <div>
              <h2 id="mini-dash-stations-title">Preços por Posto</h2>
              <p>Valor do litro (R$/L)</p>
            </div>
          </div>
          <span className="mini-dash-pill">{stations.length} posto{stations.length !== 1 ? 's' : ''}</span>
        </header>

        <div className="mini-dash-table-head">
          <span>Posto</span>
          <span>Gasolina</span>
          <span>Álcool</span>
        </div>

        <ul className="mini-dash-list" id="gas-station-prices-list">
          {stationsStatus === 'loading' && <li className="mini-dash-empty">Carregando postos...</li>}
          {stationsStatus === 'error' && <li className="mini-dash-empty">Não foi possível carregar os postos.</li>}
          {stationsStatus === 'ok' && stations.length === 0 && (
            <li className="mini-dash-empty">Nenhum posto cadastrado.</li>
          )}
          {stationsStatus === 'ok' &&
            stations.map((s) => {
              const g = Number(s.gasolinePrice);
              const e = Number(s.ethanolPrice);
              const ethanolWorthIt = g > 0 && e > 0 && e / g <= 0.7;
              return (
                <li key={s.id} className="mini-dash-station">
                  <div className="station-info">
                    <strong>{s.name}</strong>
                    {s.location && (
                      <span className="station-location"><MapPin size={11} /> {s.location}</span>
                    )}
                    {g > 0 && e > 0 && (
                      <span className={`station-tip ${ethanolWorthIt ? 'ethanol' : 'gasoline'}`}>
                        {ethanolWorthIt ? 'Álcool compensa' : 'Gasolina compensa'} ({Math.round((e / g) * 100)}%)
                      </span>
                    )}
                  </div>
                  <span className={`price gasoline ${g > 0 && g === cheapest.gasoline ? 'best' : ''}`}>
                    {g > 0 ? brl(g) : '—'}
                    {g > 0 && g === cheapest.gasoline && stations.length > 1 && <Trophy size={11} />}
                  </span>
                  <span className={`price ethanol ${e > 0 && e === cheapest.ethanol ? 'best' : ''}`}>
                    {e > 0 ? brl(e) : '—'}
                    {e > 0 && e === cheapest.ethanol && stations.length > 1 && <Trophy size={11} />}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
