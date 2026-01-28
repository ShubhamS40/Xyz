'use client';

import { useEffect, useRef, useState } from 'react';

export default function MapView({ devices = [], selectedDevice, onDeviceClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window === 'undefined') return;
    
    const initMap = async () => {
      const L = await import('leaflet');
      
      if (!mapRef.current || mapInstanceRef.current) return;

      // Default center (New Delhi)
      let center = [28.6139, 77.2090];
      let zoom = 13;

      // Set center to selected device or first device with location
      if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
        center = [selectedDevice.latitude, selectedDevice.longitude];
        zoom = 15;
      } else if (devices.length > 0) {
        const deviceWithLocation = devices.find(d => d.latitude && d.longitude);
        if (deviceWithLocation) {
          center = [deviceWithLocation.latitude, deviceWithLocation.longitude];
        }
      }

      // Initialize map
      const map = L.map(mapRef.current).setView(center, zoom);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add markers for devices with locations
      devices
        .filter(d => d.latitude && d.longitude)
        .forEach((device) => {
          const isSelected = selectedDevice && selectedDevice.imei === device.imei;
          
          // Create car icon SVG
          const carColor = isSelected ? '#3b82f6' : device.status === 'active' ? '#10b981' : '#f97316';
          const carIconSvg = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M5 11V18M19 11H21M19 11V18M7 18H17M7 18C7 18.5523 6.55228 19 6 19C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17C6.55228 17 7 17.4477 7 18ZM17 18C17 18.5523 17.4477 19 18 19C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17C17.4477 17 17 17.4477 17 18Z" stroke="${carColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="white"/>
            </svg>
          `;
          
          // Create custom car icon
          const icon = L.divIcon({
            className: 'custom-car-marker',
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                ${isSelected ? 'transform: scale(1.2);' : ''}
              ">
                ${carIconSvg}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([device.latitude, device.longitude], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 150px;">
                <p style="font-weight: 600; margin-bottom: 4px;">${device.deviceName || `Device ${device.imei.slice(-4)}`}</p>
                <p style="font-size: 11px; color: #666; margin: 2px 0;">IMEI: ${device.imei}</p>
                <p style="font-size: 11px; color: #666; margin: 2px 0;">
                  Status: <span style="color: ${device.status === 'active' ? '#10b981' : '#f97316'}">${device.status === 'active' ? 'Online' : 'Unactive'}</span>
                </p>
                <p style="font-size: 11px; color: #666; margin: 2px 0;">
                  Speed: ${device.speed !== null && device.speed !== undefined ? `${device.speed.toFixed(1)} km/h` : '0.0 km/h'}
                </p>
                ${device.accStatus !== null && device.accStatus !== undefined ? `<p style="font-size: 11px; color: #666; margin: 2px 0;">ACC: ${device.accStatus === 1 ? 'ON' : 'OFF'}</p>` : ''}
                ${device.address ? `<p style="font-size: 10px; color: #888; margin: 4px 0 0 0; max-width: 200px; word-wrap: break-word;">${device.address}</p>` : ''}
              </div>
            `);

          marker.on('click', () => {
            onDeviceClick && onDeviceClick(device);
          });

          markersRef.current.push(marker);
        });

      // Center on selected device
      if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
        map.setView([selectedDevice.latitude, selectedDevice.longitude], 15);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [devices, selectedDevice, onDeviceClick, isClient]);

  if (!isClient) {
    return (
      <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">Loading Map...</p>
          <p className="text-sm">Initializing OpenStreetMap</p>
        </div>
      </div>
    );
  }

  // Filter devices with valid locations
  const devicesWithLocation = devices.filter(d => d.latitude && d.longitude);

  return (
    <div className="relative h-full w-full bg-gray-100">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Controls */}
      <div className="absolute right-4 top-4 flex flex-col space-y-2 z-[1000]">
        <button 
          onClick={() => {
            if (mapInstanceRef.current && selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
              mapInstanceRef.current.setView([selectedDevice.latitude, selectedDevice.longitude], 15);
            }
          }}
          className="p-2 bg-white rounded shadow hover:bg-gray-50"
          title="Center on selected device"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
        <button className="p-2 bg-white rounded shadow hover:bg-gray-50" title="My Location">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        <button className="p-2 bg-white rounded shadow hover:bg-gray-50" title="Fullscreen">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="absolute top-4 left-4 w-64 z-[1000]">
        <div className="relative">
          <input
            type="text"
            placeholder="Please enter address Q"
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 text-xs">Q</span>
        </div>
      </div>

      {/* Device Count Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1.5 rounded text-xs text-gray-600 shadow z-[1000]">
        <div className="flex items-center space-x-4">
          <span>Devices: {devicesWithLocation.length}</span>
          {selectedDevice && (
            <span className="text-blue-600">
              Selected: {selectedDevice.deviceName || selectedDevice.imei.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
