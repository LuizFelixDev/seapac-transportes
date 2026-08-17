'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  User, 
  Calendar, 
  Compass, 
  Clock, 
  TrendingUp, 
  Plus, 
  Users, 
  Settings, 
  Printer, 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  Sun, 
  Moon, 
  MapPin, 
  FileText,
  Percent,
  LogOut,
  Shield
} from 'lucide-react';

import TripFormModal from '@/components/TripFormModal';
import VehicleModal from '@/components/VehicleModal';
import DriverModal from '@/components/DriverModal';
import UserManagementModal from '@/components/UserManagementModal';

export default function Dashboard() {
  // Session User
  const [user, setUser] = useState(null);

  // Data States
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeVehicleId, setActiveVehicleId] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 10;

  const fetchPendingRequestsCount = async () => {
    try {
      const res = await fetch('/api/users/requests');
      if (res.ok) {
        const data = await res.json();
        setPendingRequestsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  // Load Initial Data & Check Session
  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('seapac-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    let intervalId;

    const checkSessionAndFetch = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          fetchInitialData();

          if (data.user.role === 'adm') {
            fetchPendingRequestsCount();
            intervalId = setInterval(fetchPendingRequestsCount, 15000); // Poll every 15s
          }
        } else {
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Session check error:', error);
        window.location.href = '/login';
      }
    };

    checkSessionAndFetch();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'DELETE'
      });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const [vehiclesRes, driversRes, tripsRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/drivers'),
        fetch('/api/trips')
      ]);

      const vehiclesData = await vehiclesRes.json();
      const driversData = await driversRes.json();
      const tripsData = await tripsRes.json();

      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setTrips(Array.isArray(tripsData) ? tripsData : []);

      if (vehiclesData.length > 0) {
        setActiveVehicleId(vehiclesData[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('seapac-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Get active vehicle info
  const activeVehicle = useMemo(() => {
    if (!Array.isArray(vehicles)) return null;
    return vehicles.find(v => v.id === activeVehicleId) || null;
  }, [vehicles, activeVehicleId]);

  // Get most recent trip recorded for the active vehicle
  const lastTrip = useMemo(() => {
    if (!Array.isArray(trips) || trips.length === 0) return null;
    const vehicleTrips = trips.filter(t => t.vehicleId === activeVehicleId);
    if (vehicleTrips.length === 0) return null;
    return [...vehicleTrips].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.departureTime.localeCompare(a.departureTime);
    })[0];
  }, [trips, activeVehicleId]);

  // Filtered trips for calculation and display
  const filteredTrips = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.filter(trip => {
      // Vehicle Filter
      if (trip.vehicleId !== activeVehicleId) return false;

      // Text Search Filter (Driver, Route)
      const textMatch = searchQuery === '' || 
        trip.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.routeFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.routeTo.toLowerCase().includes(searchQuery.toLowerCase());

      // Driver Filter
      const driverMatch = driverFilter === '' || trip.driver === driverFilter;

      // Date Range Filter
      const dateMatch = (dateStartFilter === '' || trip.date >= dateStartFilter) &&
                        (dateEndFilter === '' || trip.date <= dateEndFilter);

      return textMatch && driverMatch && dateMatch;
    });
  }, [trips, activeVehicleId, searchQuery, driverFilter, dateStartFilter, dateEndFilter]);

  // Statistics Calculations
  const stats = useMemo(() => {
    let totalKm = 0;
    let refuelKmSum = 0;
    let refuelLitersSum = 0;
    let totalTrips = filteredTrips.length;
    let alcoholTrips = 0;
    let gasolineTrips = 0;

    filteredTrips.forEach(t => {
      const tripKm = Number(t.arrivalKm) - Number(t.departureKm);
      totalKm += tripKm > 0 ? tripKm : 0;

      if (t.refuelLiters && t.refuelKm) {
        refuelKmSum += tripKm;
        refuelLitersSum += Number(t.refuelLiters);
        
        if (t.fuelType === 'A') alcoholTrips++;
        if (t.fuelType === 'G') gasolineTrips++;
      }
    });

    // Média de consumo (KM/L) considerando apenas as viagens onde houve abastecimento
    const avgConsumption = refuelLitersSum > 0 ? (refuelKmSum / refuelLitersSum) : 0;
    
    // Custo estimado de combustível: Álcool R$ 4.20/L, Gasolina R$ 5.90/L
    let estimatedCost = 0;
    filteredTrips.forEach(t => {
      if (t.refuelLiters) {
        const rate = t.fuelType === 'A' ? 4.20 : 5.90;
        estimatedCost += Number(t.refuelLiters) * rate;
      }
    });

    return {
      totalKm,
      totalTrips,
      totalLiters: refuelLitersSum,
      avgConsumption: avgConsumption.toFixed(2),
      estimatedCost: estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      fuelSplit: {
        alcohol: alcoholTrips,
        gasoline: gasolineTrips
      }
    };
  }, [filteredTrips]);

  // Group data by Month for chart
  const chartData = useMemo(() => {
    const monthlyKms = {};
    
    // Initialise last 5 months
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyKms[key] = { label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`, km: 0 };
    }

    // Populate data
    filteredTrips.forEach(t => {
      const tripMonth = t.date.slice(0, 7); // YYYY-MM
      if (monthlyKms[tripMonth]) {
        const km = Number(t.arrivalKm) - Number(t.departureKm);
        monthlyKms[tripMonth].km += km > 0 ? km : 0;
      }
    });

    return Object.values(monthlyKms);
  }, [filteredTrips]);

  const maxChartKm = useMemo(() => {
    const values = chartData.map(d => d.km);
    const max = Math.max(...values);
    return max > 0 ? max : 100;
  }, [chartData]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTrips.length / tripsPerPage);
  const currentTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * tripsPerPage;
    return filteredTrips.slice(startIndex, startIndex + tripsPerPage);
  }, [filteredTrips, currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // CRUD handlers for Trips
  const handleCreateOrUpdateTrip = async (formData) => {
    try {
      let response;
      if (selectedTrip) {
        // Edit Mode
        response = await fetch(`/api/trips/${selectedTrip.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create Mode
        response = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        // Refresh local data
        const updatedRes = await fetch('/api/trips');
        const updatedData = await updatedRes.json();
        setTrips(Array.isArray(updatedData) ? updatedData : []);
        
        // Auto-switch dashboard active vehicle to the saved trip's vehicle to keep it in view
        if (formData.vehicleId) {
          setActiveVehicleId(formData.vehicleId);
        }

        setIsTripModalOpen(false);
        setSelectedTrip(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao processar viagem.');
      }
    } catch (error) {
      console.error('Erro ao salvar viagem:', error);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (confirm('Tem certeza de que deseja remover esta viagem?')) {
      try {
        const response = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setTrips(trips.filter(t => t.id !== id));
        } else {
          alert('Erro ao excluir viagem.');
        }
      } catch (error) {
        console.error('Erro ao excluir viagem:', error);
      }
    }
  };

  // CRUD handlers for Vehicles
  const handleCreateVehicle = async (vehicleData) => {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      });
      if (response.ok) {
        const newVehicle = await response.json();
        setVehicles([...vehicles, newVehicle]);
        setActiveVehicleId(newVehicle.id);
        return newVehicle;
      }
    } catch (error) {
      console.error('Erro ao cadastrar veículo:', error);
    }
  };

  const handleDeleteVehicle = async (id) => {
    try {
      const response = await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        const updatedVehicles = vehicles.filter(v => v.id !== id);
        setVehicles(updatedVehicles);
        if (activeVehicleId === id && updatedVehicles.length > 0) {
          setActiveVehicleId(updatedVehicles[0].id);
        }
      } else {
        const err = await response.json();
        alert(err.error || 'Erro ao excluir veículo.');
      }
    } catch (error) {
      console.error('Erro ao deletar veículo:', error);
    }
  };

  // CRUD handlers for Drivers
  const handleCreateDriver = async (driverData) => {
    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData)
      });
      if (response.ok) {
        const newDriver = await response.json();
        setDrivers([...drivers, newDriver]);
      }
    } catch (error) {
      console.error('Erro ao cadastrar motorista:', error);
    }
  };

  const handleDeleteDriver = async (id) => {
    try {
      const response = await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setDrivers(drivers.filter(d => d.id !== id));
      } else {
        alert('Erro ao excluir motorista.');
      }
    } catch (error) {
      console.error('Erro ao deletar motorista:', error);
    }
  };

  // CSV Export Logic
  const handleExportCSV = () => {
    if (filteredTrips.length === 0) return alert('Nenhum dado para exportar.');

    // CSV Headers
    const headers = [
      'Data', 
      'Condutor', 
      'Origem (De)', 
      'Destino (Para)', 
      'Saida Horario', 
      'KM Saida', 
      'Chegada Horario', 
      'KM Final', 
      'KM Rodado',
      'KM Abastecimento', 
      'Quantidade Litros', 
      'Tipo Combustivel', 
      'Assinatura'
    ];

    // CSV Rows
    const rows = filteredTrips.map(t => [
      t.date,
      t.driver,
      t.routeFrom,
      t.routeTo,
      t.departureTime,
      t.departureKm,
      t.arrivalTime,
      t.arrivalKm,
      Number(t.arrivalKm) - Number(t.departureKm),
      t.refuelKm || '',
      t.refuelLiters || '',
      t.fuelType || '',
      t.signature && t.signature.startsWith('data:image') ? 'Assinatura Desenho' : t.signature
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_abastecimento_${activeVehicle?.plate || 'veiculo'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', backgroundColor: 'hsl(var(--background))' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Carregando Relatório...</span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* HEADER PRINT-ONLY (mimics original spreadsheet) */}
      <div className="print-only-header">
        <div className="print-title">Relatório de Abastecimento e Controle de Veículo</div>
        <div className="print-meta-grid">
          <div className="print-meta-item"><strong>Instituição:</strong> {activeVehicle?.institution || 'SEAPAC'}</div>
          <div className="print-meta-item"><strong>Veículo:</strong> {activeVehicle?.name || 'FIAT Strada'}</div>
          <div className="print-meta-item"><strong>Placa:</strong> {activeVehicle?.plate || 'QGS5D36'}</div>
          <div className="print-meta-item" style={{ gridColumn: '1 / -1' }}>
            <strong>Endereço:</strong> {activeVehicle?.address || 'Rua Trajano Murta, 3317 - Candelária - Natal/RN'}
          </div>
          <div className="print-meta-item" style={{ gridColumn: '1 / -2' }}>
            <strong>Seguro:</strong> {activeVehicle?.insurance || '--------'}
          </div>
          <div className="print-meta-item">
            <strong>Obs.:</strong> {activeVehicle?.obs || ''}
          </div>
        </div>
      </div>

      {/* DASHBOARD HEADER */}
      <header className="app-header glass">
        <div className="brand-section">
          <div className="logo-icon">
            <Car size={24} />
          </div>
          <div className="brand-info">
            <h1>SEAPAC Transportes</h1>
            <p>Sistema de Controle & Abastecimento</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Vehicle Switcher in header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>Veículo:</span>
            <select 
              className="select-field" 
              style={{ minWidth: '150px', padding: '0.5rem' }} 
              value={activeVehicleId}
              onChange={(e) => {
                setActiveVehicleId(e.target.value);
                setCurrentPage(1);
              }}
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
              ))}
            </select>
          </div>

          {user && (
            <div className="user-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem', borderRight: '1px solid hsl(var(--border))', paddingRight: '0.75rem' }}>
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid hsl(var(--border))' }}
                />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', marginRight: '0.25rem' }} className="user-info-text">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>{user.name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.6rem', color: 'hsl(var(--muted-foreground))' }}>{user.email}</span>
              </div>
              <button 
                className="btn btn-secondary btn-icon" 
                onClick={handleLogout} 
                title="Sair do Sistema"
                style={{ padding: '0.25rem', height: '28px', width: '28px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          <button className="btn btn-secondary btn-icon" onClick={handleThemeToggle} id="theme-toggle-btn" title="Alternar Tema">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Pending Access Requests Banner for Admins */}
      {user?.role === 'adm' && pendingRequestsCount > 0 && (
        <div 
          style={{
            backgroundColor: 'rgba(239, 71, 111, 0.12)',
            borderBottom: '1px solid rgba(239, 71, 111, 0.3)',
            color: '#ef476f',
            padding: '0.6rem 1.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            borderRadius: '12px',
            border: '1px solid rgba(239, 71, 111, 0.25)',
            boxShadow: 'var(--shadow-sm)'
          }}
          className="print-hide glass"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'red', animation: 'pulse 1.5s infinite' }} />
            <span>Atenção: Há {pendingRequestsCount} solicitação(ões) de acesso pendente(s) aguardando aprovação!</span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', height: '24px' }}
            onClick={() => setIsUserModalOpen(true)}
          >
            Analisar Solicitações
          </button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>KM Rodados</span>
            <div className="metric-icon">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value">{stats.totalKm.toLocaleString('pt-BR')} km</div>
            <div className="metric-sub">Distância total percorrida</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Total Viagens</span>
            <div className="metric-icon">
              <Compass size={16} />
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value">{stats.totalTrips}</div>
            <div className="metric-sub">Viagens registradas no período</div>
          </div>
        </div>

        <div className="metric-card accent">
          <div className="metric-header">
            <span>Consumo Médio</span>
            <div className="metric-icon">
              <Percent size={16} />
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value">{stats.avgConsumption} km/L</div>
            <div className="metric-sub">Baseado em {stats.totalLiters.toFixed(1)} Litros</div>
          </div>
        </div>

        <div className="metric-card accent">
          <div className="metric-header">
            <span>Gasto Estimado</span>
            <div className="metric-icon">
              <FileText size={16} />
            </div>
          </div>
          <div className="metric-body">
            <div className="metric-value">{stats.estimatedCost}</div>
            <div className="metric-sub">Combustível abastecido</div>
          </div>
        </div>
      </div>

      {/* CHARTS & VEHICLE CARD */}
      <div className="charts-grid">
        <div className="section-card glass">
          <div className="section-title">
            <h2>Quilometragem por Mês</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase' }}>Histórico Recente</span>
          </div>
          
          <div className="chart-container">
            {chartData.map((d, index) => {
              const heightPct = maxChartKm > 0 ? (d.km / maxChartKm) * 80 : 5;
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="chart-bar-tooltip">{d.km.toLocaleString('pt-BR')} km</div>
                  </div>
                  <span className="chart-label">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-card glass">
          <div className="section-title">
            <h2>Dados do Veículo Ativo</h2>
            <Car size={18} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          
          {activeVehicle ? (
            <div className="vehicle-info-box">
              <div className="info-row">
                <span className="info-label">Nome:</span>
                <span className="info-value">{activeVehicle.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Placa:</span>
                <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '0.9rem', backgroundColor: 'hsl(var(--background))', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{activeVehicle.plate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Instituição:</span>
                <span className="info-value">{activeVehicle.institution}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Seguro:</span>
                <span className="info-value" style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{activeVehicle.insurance}</span>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                <strong>Endereço:</strong> {activeVehicle.address}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'hsl(var(--muted-foreground))' }}>Nenhum veículo selecionado.</div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', minWidth: '80px' }} onClick={() => setIsVehicleModalOpen(true)}>
              <Settings size={14} /> Frotas
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', minWidth: '95px' }} onClick={() => setIsDriverModalOpen(true)}>
              <Users size={14} /> Condutores
            </button>
            {user?.role === 'adm' && (
              <button 
                className="btn btn-secondary" 
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  minWidth: '95px', 
                  position: 'relative',
                  border: pendingRequestsCount > 0 ? '1.5px solid #ef476f' : '1px solid hsl(var(--border))'
                }} 
                onClick={() => setIsUserModalOpen(true)}
              >
                <Shield size={14} /> Usuários
                {pendingRequestsCount > 0 && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      top: '-6px', 
                      right: '-6px', 
                      backgroundColor: '#ef476f', 
                      color: '#fff', 
                      fontSize: '0.6rem', 
                      padding: '0.1rem 0.35rem', 
                      borderRadius: '10px', 
                      fontWeight: 800,
                      boxShadow: '0 0 6px rgba(239,71,111,0.6)'
                    }}
                  >
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="controls-bar glass">
        <div className="search-filters">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Buscar por condutor ou roteiro..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select 
            className="select-field"
            value={driverFilter}
            onChange={(e) => { setDriverFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos Condutores</option>
            {drivers.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input 
              type="date" 
              className="date-field" 
              value={dateStartFilter}
              onChange={(e) => { setDateStartFilter(e.target.value); setCurrentPage(1); }}
            />
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 'bold' }}>até</span>
            <input 
              type="date" 
              className="date-field" 
              value={dateEndFilter}
              onChange={(e) => { setDateEndFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Exportar CSV
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
          <button className="btn btn-primary" onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }}>
            <Plus size={16} /> Nova Viagem
          </button>
        </div>
      </div>

      {/* PLANILHA DATA TABLE */}
      <div className="section-card glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Data</th>
                <th>Condutor</th>
                <th>Roteiro (De / Para)</th>
                <th style={{ width: '90px' }}>Saída</th>
                <th style={{ width: '100px' }}>KM Saída</th>
                <th style={{ width: '90px' }}>Chegada</th>
                <th style={{ width: '100px' }}>KM Final</th>
                <th style={{ width: '80px' }}>Rodados</th>
                <th style={{ width: '120px' }}>Refil (KM / L)</th>
                <th style={{ width: '60px' }}>A/G</th>
                <th style={{ width: '140px' }}>Assinatura</th>
                <th className="actions-header" style={{ width: '90px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {currentTrips.length === 0 ? (
                <tr>
                  <td colSpan={12} className="empty-state">
                    Nenhuma viagem registrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                currentTrips.map((t) => {
                  const rodados = Number(t.arrivalKm) - Number(t.departureKm);
                  const isImageSig = t.signature && t.signature.startsWith('data:image');
                  
                  return (
                    <tr key={t.id}>
                      <td>{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 700 }}>{t.driver}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                          <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>{t.routeFrom}</span>
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>➔</span>
                          <span style={{ color: 'hsl(var(--accent))', fontWeight: 600 }}>{t.routeTo}</span>
                        </div>
                      </td>
                      <td>{t.departureTime}</td>
                      <td><span className="km-badge">{t.departureKm.toLocaleString('pt-BR')}</span></td>
                      <td>{t.arrivalTime}</td>
                      <td><span className="km-badge">{t.arrivalKm.toLocaleString('pt-BR')}</span></td>
                      <td style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>+{rodados} km</td>
                      <td>
                        {t.refuelKm && t.refuelLiters ? (
                          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                            <strong>KM: {t.refuelKm.toLocaleString('pt-BR')}</strong>
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Vol: {t.refuelLiters} L</span>
                          </div>
                        ) : (
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>-</span>
                        )}
                      </td>
                      <td>
                        {t.fuelType ? (
                          <span className={`fuel-badge ${t.fuelType === 'G' ? 'gasoline' : ''}`}>
                            {t.fuelType}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="signature-cell">
                        {isImageSig ? (
                          <img 
                            src={t.signature} 
                            alt="Assinatura" 
                            style={{ height: '24px', maxWidth: '120px', filter: theme === 'dark' ? 'invert(1) opacity(0.8)' : 'opacity(0.8)', mixBlendMode: 'multiply' }} 
                          />
                        ) : (
                          t.signature || '-'
                        )}
                      </td>
                      <td className="actions-cell" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '0.35rem' }} 
                            onClick={() => { setSelectedTrip(t); setIsTripModalOpen(true); }}
                            title="Editar Viagem"
                          >
                            <Edit3 size={14} />
                          </button>
                          {user?.role === 'adm' && (
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '0.35rem', color: '#ef4444' }} 
                              onClick={() => handleDeleteTrip(t.id)}
                              title="Excluir Viagem"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '1rem 1.5rem', borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
            <span className="pagination-text">
              Mostrando {currentTrips.length} de {filteredTrips.length} viagens
            </span>
            <div className="pagination-buttons">
              <button 
                className="btn btn-secondary btn-icon" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Pág. {currentPage} de {totalPages}
              </span>
              <button 
                className="btn btn-secondary btn-icon" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TRIP FORM MODAL */}
      <TripFormModal 
        isOpen={isTripModalOpen}
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }}
        onSubmit={handleCreateOrUpdateTrip}
        trip={selectedTrip}
        lastTrip={lastTrip}
        drivers={drivers}
        vehicles={vehicles}
        onAddVehicle={handleCreateVehicle}
        activeVehicleId={activeVehicleId}
      />

      {/* VEHICLES MODAL */}
      <VehicleModal 
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicles={vehicles}
        activeVehicleId={activeVehicleId}
        onSelect={(id) => { setActiveVehicleId(id); setIsVehicleModalOpen(false); setCurrentPage(1); }}
        onCreate={handleCreateVehicle}
        onDelete={handleDeleteVehicle}
      />

      {/* DRIVERS MODAL */}
      <DriverModal 
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        drivers={drivers}
        onCreate={handleCreateDriver}
        onDelete={handleDeleteDriver}
      />

      {/* USER MANAGEMENT MODAL */}
      <UserManagementModal 
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUserEmail={user?.email || ''}
      />

    </div>
  );
}
