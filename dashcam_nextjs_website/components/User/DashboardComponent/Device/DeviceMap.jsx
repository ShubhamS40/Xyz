'use client';

import { useEffect, useRef, useState } from 'react';

export default function DeviceMap({ device, location }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === 'undefined' || !location) return;
    
    const initMap = async () => {
      const L = await import('leaflet');
      
      if (!mapRef.current || mapInstanceRef.current) return;

      // Initialize map centered on device location
      const map = L.map(mapRef.current).setView([location.lat, location.lng], 15);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Create custom marker icon
      const carIconSvg = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M5 11V18M19 11H21M19 11V18M7 18H17M7 18C7 18.5523 6.55228 19 6 19C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17C6.55228 17 7 17.4477 7 18ZM17 18C17 18.5523 17.4477 19 18 19C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17C17.4477 17 17 17.4477 17 18Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="white"/>
        </svg>
      `;
      
      const icon = L.divIcon({
        className: 'custom-device-marker',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
          ">
            ${carIconSvg}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      // Add marker
      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <p style="font-weight: 600; margin-bottom: 4px;">${device?.deviceName || `Device ${device?.imei?.slice(-4)}`}</p>
            <p style="font-size: 12px; color: #666; margin: 2px 0;">IMEI: ${device?.imei}</p>
            <p style="font-size: 12px; color: #666; margin: 2px 0;">
              Status: <span style="color: ${device?.status === 'active' ? '#10b981' : '#f97316'}">${device?.status === 'active' ? 'Online' : 'Offline'}</span>
            </p>
            ${device?.speed !== null && device?.speed !== undefined ? `<p style="font-size: 12px; color: #666; margin: 2px 0;">Speed: ${device.speed.toFixed(1)} km/h</p>` : ''}
          </div>
        `);

      markerRef.current = marker;

      // Map controls
      L.control.zoom({
        position: 'topright'
      }).addTo(map);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location, device]);

  if (!isClient || !location) {
    return (
      <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">Loading Map...</p>
          <p className="text-sm">Initializing OpenStreetMap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-100">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Controls */}
      <div className="absolute right-4 top-4 flex flex-col space-y-2 z-[1000]">
        <button 
          onClick={() => {
            if (mapInstanceRef.current && location) {
              mapInstanceRef.current.setView([location.lat, location.lng], 15);
            }
          }}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 border border-gray-200"
          title="Center on device"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

