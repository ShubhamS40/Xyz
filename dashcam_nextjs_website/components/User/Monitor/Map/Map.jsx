'use client';

import { useEffect, useRef, useState } from 'react';

export default function Map({ devices = [], location, selectedDevice }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isClient, setIsClient] = useState(false);

  const defaultCenter = { lat: 28.6139, lng: 77.209 };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (typeof window === 'undefined') return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;

      // Determine center based on selected device or first device with location
      let center = [defaultCenter.lat, defaultCenter.lng];
      let zoom = 13;

      if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
        center = [selectedDevice.latitude, selectedDevice.longitude];
        zoom = 15;
      } else if (devices.length > 0) {
        const deviceWithLocation = devices.find(d => 
          (d.latitude && d.longitude) || (d.data && d.data[0] && d.data[0].latitude && d.data[0].longitude)
        );
        if (deviceWithLocation) {
          const lat = deviceWithLocation.latitude || deviceWithLocation.data[0].latitude;
          const lng = deviceWithLocation.longitude || deviceWithLocation.data[0].longitude;
          center = [lat, lng];
          zoom = 15;
        }
      }

      const map = L.map(mapRef.current).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      map.invalidateSize();
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    if (!mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;

      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      markersRef.current = [];

      // Create car icon using the map_car.png file
      // Use custom divIcon to handle image loading properly
      const createCarIcon = (isSelected = false) => {
        // Increased icon size
        const iconSize = 60;
        const iconAnchor = iconSize / 2;
        
        // Base64 fallback SVG car icon (blue car)
        const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 11L6.5 6.5H17.5L19 11M5 11H3M19 11H21M19 11V18M5 11V18M7 18H17M7 18C7 18.5523 6.55228 19 6 19C5.44772 19 5 18.5523 5 18C5 17.4477 5.44772 17 6 17C6.55228 17 7 17.4477 7 18ZM17 18C17 18.5523 17.4477 19 18 19C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17C17.4477 17 17 17.4477 17 18Z" 
                  stroke="${isSelected ? '#3b82f6' : '#2563eb'}" 
                  stroke-width="2" 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  fill="white"/>
          </svg>
        `)}`;
        
        return L.divIcon({
          className: 'custom-car-icon',
          html: `
            <div style="
              width: ${iconSize}px;
              height: ${iconSize}px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
              border: none;
              ${isSelected ? 'transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));' : ''}
            ">
              <img 
                src="/assets/map_car.png" 
                alt="Car"
                style="
                  width: ${iconSize}px;
                  height: ${iconSize}px;
                  object-fit: contain;
                  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                  pointer-events: none;
                "
                onerror="this.onerror=null; this.src='${fallbackSvg}';"
              />
            </div>
          `,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconAnchor, iconAnchor],
          popupAnchor: [0, -iconAnchor],
      });
      };

      // Add markers for all devices with locations
      devices.forEach((device) => {
        let lat, lng;
        
        // Get location from device data or from latest location data
        if (device.latitude && device.longitude) {
          lat = device.latitude;
          lng = device.longitude;
        } else if (device.data && device.data[0]) {
          lat = device.data[0].latitude;
          lng = device.data[0].longitude;
        }

        if (!lat || !lng) return;

        const isSelected = selectedDevice && selectedDevice.imei === device.imei;
        const deviceName = device.deviceName || `${device.deviceModel || 'Device'}-${(device.imei || '').slice(-4)}`;

        // Create icon for this specific device (selected devices get highlighted)
        const deviceIcon = createCarIcon(isSelected);

        const marker = L.marker([lat, lng], { icon: deviceIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="min-width: 150px;">
              <p style="font-weight: 600; margin-bottom: 4px; color: ${isSelected ? '#3b82f6' : '#000'}">${deviceName}</p>
              <p style="font-size: 11px; color: #666; margin: 2px 0;">IMEI: ${device.imei || '—'}</p>
              <p style="font-size: 11px; color: #666; margin: 2px 0;">
                Status: <span style="color: ${device.status === 'online' ? '#10b981' : device.status === 'offline' ? '#f97316' : '#6b7280'}">${device.status || 'inactive'}</span>
              </p>
            </div>
          `);

        markersRef.current.push(marker);
      });

      // Center on selected device or location
      if (selectedDevice && selectedDevice.latitude && selectedDevice.longitude) {
        mapInstanceRef.current.setView([selectedDevice.latitude, selectedDevice.longitude], 15);
      } else if (location && location.lat && location.lng) {
      mapInstanceRef.current.setView([location.lat, location.lng], 15);
      }

      mapInstanceRef.current.invalidateSize();
    };

    updateMarkers();
  }, [devices, location, selectedDevice, isClient]);

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

  return (
    <div className="relative w-full h-full bg-gray-100" style={{ zIndex: 1 }}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
