'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Loader2, Compass, Search } from 'lucide-react';

const L_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const L_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Load Leaflet resources dynamically on client
function loadLeaflet() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existingScript = document.getElementById('leaflet-js');
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.L) {
          clearInterval(checkLoaded);
          resolve(window.L);
        }
      }, 100);
      return;
    }

    // Add Stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = L_CSS;
    link.id = 'leaflet-css';
    document.head.appendChild(link);

    // Add Script
    const script = document.createElement('script');
    script.src = L_JS;
    script.id = 'leaflet-js';
    script.onload = () => resolve(window.L);
    document.body.appendChild(script);
  });
}

export default function MapPickerModal({ isOpen, onClose, onConfirm, title = "Selecionar Localização" }) {
  const [loadingMap, setLoadingMap] = useState(true);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [coords, setCoords] = useState({ lat: -5.7944, lng: -35.2110 }); // Default: Natal, RN
  
  // Address Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Debounce search input to query Nominatim
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(searchQuery.trim());
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSuggestions = async (query) => {
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=pt-br`,
        {
          headers: {
            'User-Agent': 'SEAPAC-Transportes-App/1.0'
          }
        }
      );
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (sug) => {
    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    
    setCoords({ lat, lng });
    
    // Center map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
    }
    
    // Move marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    
    // Parse address
    const addr = sug.address;
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
    setAddress(shortAddr || sug.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    setFullAddress(sug.display_name);
    
    // Clear suggestions and search box
    setSuggestions([]);
    setSearchQuery('');
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    let map = null;
    setLoadingMap(true);

    loadLeaflet().then((L) => {
      if (!mapContainerRef.current) return;
      setLoadingMap(false);

      // Default position
      let startCoords = [coords.lat, coords.lng];

      // Setup Map
      map = L.map(mapContainerRef.current).setView(startCoords, 13);
      mapInstanceRef.current = map;

      // Add Tile Layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Custom Pin Icon (Leaflet defaults sometimes break in Next.js builds because of asset paths)
      const pinIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Add Draggable Marker
      const marker = L.marker(startCoords, { icon: pinIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      // Initial Geocoding
      geocodePosition(startCoords[0], startCoords[1]);

      // Move marker on Map Click
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        geocodePosition(lat, lng);
      });

      // Handle marker dragend
      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setCoords({ lat, lng });
        geocodePosition(lat, lng);
      });

      // Attempt to center map on user's current physical position if GPS is available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            setCoords({ lat: userLat, lng: userLng });
            map.setView([userLat, userLng], 15);
            marker.setLatLng([userLat, userLng]);
            geocodePosition(userLat, userLng);
          },
          () => {
            // Geolocation error - keep default Natal coords
          },
          { timeout: 5000 }
        );
      }
    });

    // Cleanup map instance on close/unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen]);

  // Center on Current GPS position manually
  const handleCenterOnGPS = () => {
    if (!navigator.geolocation || !mapInstanceRef.current || !markerRef.current) return;

    setResolvingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const L = window.L;
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        setCoords({ lat: userLat, lng: userLng });
        mapInstanceRef.current.setView([userLat, userLng], 15);
        markerRef.current.setLatLng([userLat, userLng]);
        geocodePosition(userLat, userLng);
      },
      (err) => {
        setResolvingAddress(false);
        alert('Não foi possível obter a sua localização GPS.');
      }
    );
  };

  // Reverse Geocoding via Nominatim OpenStreetMap API
  const geocodePosition = async (lat, lng) => {
    setResolvingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&accept-language=pt-br`,
        {
          headers: {
            'User-Agent': 'SEAPAC-Transportes-App/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding query failed');
      const data = await response.json();

      if (data && data.address) {
        setFullAddress(data.display_name);

        const addr = data.address;
        const parts = [];

        // Build simplified address string
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
        setAddress(shortAddr || data.name || 'Localização no Mapa');
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setFullAddress(`Coordenadas: Lat ${lat}, Lng ${lng}`);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setFullAddress(`Coordenadas: Lat ${lat}, Lng ${lng} (Erro ao resolver endereço)`);
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (address) {
      onConfirm(address, coords.lat, coords.lng);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-content glass" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} style={{ color: 'hsl(var(--primary))' }} />
            <h2 style={{ fontSize: '1.15rem' }}>{title}</h2>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1rem', position: 'relative' }}>

          {/* Search Address Box */}
          <div style={{ position: 'relative', marginBottom: '0.75rem', zIndex: 1010 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control"
                placeholder="Digitar endereço para buscar..."
                style={{ paddingLeft: '2.25rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'hsl(var(--muted-foreground))' }} />
              {searching && (
                <Loader2 size={14} style={{ position: 'absolute', right: '10px', color: 'hsl(var(--primary))', animation: 'spin 1s infinite linear' }} />
              )}
            </div>
            
            {/* Suggestions list popup */}
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 2000, marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {suggestions.map((sug, i) => (
                  <div 
                    key={i}
                    style={{ padding: '0.6rem 0.8rem', borderBottom: i < suggestions.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(sug)}
                  >
                    <div style={{ fontWeight: 700 }}>{sug.name || sug.display_name.split(',')[0]}</div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sug.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map area */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', border: '1px solid hsl(var(--border))' }}>
            {loadingMap && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'hsl(var(--muted))', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                <Loader2 size={30} className="spin-animation" style={{ color: 'hsl(var(--primary))' }} />
                <span style={{ marginLeft: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Carregando Mapa...</span>
              </div>
            )}

            <div
              ref={mapContainerRef}
              style={{ height: '350px', width: '100%', backgroundColor: '#eee' }}
            />

            {/* GPS Floating Button */}
            {!loadingMap && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ position: 'absolute', right: '10px', bottom: '10px', zIndex: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', padding: '0.4rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'hsl(var(--card))' }}
                onClick={handleCenterOnGPS}
                title="Minha Posição Atual"
              >
                <Compass size={14} style={{ color: 'hsl(var(--primary))' }} /> Minha Posição
              </button>
            )}
          </div>

          {/* Resolved Address Display */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <MapPin size={14} style={{ color: 'hsl(var(--accent))' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                Endereço Selecionado
              </span>
              {resolvingAddress && (
                <Loader2 size={10} className="spin-animation" style={{ color: 'hsl(var(--primary))', marginLeft: 'auto' }} />
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'hsl(var(--foreground))' }}>
              {resolvingAddress ? 'Buscando endereço...' : address || 'Clique no mapa para selecionar'}
            </div>

            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem', wordBreak: 'break-word' }}>
              {resolvingAddress ? 'Consultando Nominatim OSM...' : fullAddress || 'Selecione um ponto no mapa para carregar as coordenadas e o endereço.'}
            </div>
          </div>

        </div>

        <div className="modal-footer" style={{ padding: '0.75rem 1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={resolvingAddress || !address}
            style={{ opacity: (resolvingAddress || !address) ? 0.6 : 1, cursor: (resolvingAddress || !address) ? 'not-allowed' : 'pointer' }}
          >
            Confirmar Localização
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .spin-animation {
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
