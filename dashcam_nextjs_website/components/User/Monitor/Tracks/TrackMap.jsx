'use client';

import { useEffect, useRef, useState } from 'react';
import PlaybackControls from './PlaybackControls';

export default function TrackMap({ trackPoints = [], trackSummary = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLineRef = useRef(null);
  const markersRef = useRef([]);
  const [isClient, setIsClient] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const playbackIntervalRef = useRef(null);

  const defaultCenter = { lat: 28.6139, lng: 77.209 };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isClient) return;
    if (typeof window === 'undefined') return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;

      // Import leaflet CSS
      await import('leaflet/dist/leaflet.css');

      const center = trackPoints.length > 0
        ? [trackPoints[0].latitude, trackPoints[0].longitude]
        : [defaultCenter.lat, defaultCenter.lng];

      const map = L.map(mapRef.current).setView(center, trackPoints.length > 0 ? 15 : 13);

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
      }
    };
  }, [isClient]);

  // Update map with track points
  useEffect(() => {
    if (!isClient) return;
    if (!mapInstanceRef.current) return;
    if (!trackPoints || trackPoints.length === 0) return;

    const updateMap = async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default || leafletModule;

      // Clear existing markers and route
      markersRef.current.forEach(marker => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      markersRef.current = [];

      if (routeLineRef.current) {
        mapInstanceRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      // Create route line from all points - filter out invalid coordinates
      const routeCoordinates = trackPoints
        .filter(p => {
          const lat = p.latitude;
          const lng = p.longitude;
          // Validate coordinates: latitude between -90 and 90, longitude between -180 and 180
          return lat != null && lng != null && 
                 !isNaN(lat) && !isNaN(lng) &&
                 lat >= -90 && lat <= 90 &&
                 lng >= -180 && lng <= 180;
        })
        .map(p => [p.latitude, p.longitude]);

      if (routeCoordinates.length > 0) {
        routeLineRef.current = L.polyline(routeCoordinates, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
        }).addTo(mapInstanceRef.current);
      }

      // Create custom icons for different point types
      const createIcon = (pointType, isCurrent = false) => {
        const size = isCurrent ? 20 : 12;
        const color = isCurrent ? '#ef4444' : 
                     pointType === 'start' ? '#10b981' :
                     pointType === 'end' ? '#f59e0b' :
                     pointType === 'stop' ? '#6b7280' : '#3b82f6';

        return L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      };

      // Add markers for all points - filter out invalid coordinates
      trackPoints.forEach((point, index) => {
        const lat = point.latitude;
        const lng = point.longitude;
        // Validate coordinates
        if (lat == null || lng == null || 
            isNaN(lat) || isNaN(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180) {
          return;
        }

        const isCurrent = index === currentIndex;
        const icon = createIcon(point.pointType, isCurrent);

        const popupContent = `
          <div style="min-width: 200px; font-size: 12px;">
            <p style="font-weight: 600; margin-bottom: 4px; color: #000;">
              ${point.pointType === 'start' ? '🚩 Start' : 
                point.pointType === 'end' ? '🏁 End' : 
                point.pointType === 'stop' ? '⏸ Stop' : '📍 Point'}
            </p>
            <p style="color: #666; margin: 2px 0;">
              <strong>Time:</strong> ${new Date(point.receivedAt).toLocaleString()}
            </p>
            ${point.speedKmh != null ? `<p style="color: #666; margin: 2px 0;"><strong>Speed:</strong> ${point.speedKmh.toFixed(1)} km/h</p>` : ''}
            ${point.address ? `<p style="color: #666; margin: 2px 0;"><strong>Address:</strong> ${point.address}</p>` : ''}
            ${point.gnssType ? `<p style="color: #666; margin: 2px 0;"><strong>GNSS:</strong> ${point.gnssType}</p>` : ''}
            ${point.satellites != null ? `<p style="color: #666; margin: 2px 0;"><strong>Satellites:</strong> ${point.satellites}</p>` : ''}
          </div>
        `;

        const marker = L.marker([point.latitude, point.longitude], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popupContent);

        markersRef.current.push(marker);
      });

      // Fit map to show all points
      if (routeCoordinates.length > 0) {
        const bounds = L.latLngBounds(routeCoordinates);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      // Center on current point if playing
      if (currentIndex < trackPoints.length) {
        const currentPoint = trackPoints[currentIndex];
        if (currentPoint && currentPoint.latitude != null && currentPoint.longitude != null) {
          mapInstanceRef.current.setView([currentPoint.latitude, currentPoint.longitude], 16);
        }
      }

      mapInstanceRef.current.invalidateSize();
    };

    updateMap();
  }, [trackPoints, currentIndex, isClient]);

  // Playback logic
  useEffect(() => {
    if (!isPlaying || !trackPoints || trackPoints.length === 0) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    const interval = 1000 / playbackSpeed; // Base interval: 1 second per point, adjusted by speed

    playbackIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= trackPoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, trackPoints]);

  const handleTogglePlay = () => {
    if (currentIndex >= trackPoints.length - 1) {
      // Reset to start if at end
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
  };

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
      
      {trackPoints.length > 0 && (
        <PlaybackControls
          isPlaying={isPlaying}
          speed={playbackSpeed}
          onTogglePlay={handleTogglePlay}
          onSpeedChange={handleSpeedChange}
          onStop={handleStop}
        />
      )}

      {trackPoints.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur border border-gray-200 shadow rounded-lg px-4 py-2 text-sm">
          <div className="text-gray-700">
            <span className="font-semibold">Point:</span> {currentIndex + 1} / {trackPoints.length}
          </div>
          {trackSummary && (
            <div className="text-gray-600 mt-1">
              <span className="font-semibold">Distance:</span> {trackSummary.totalDistanceKm.toFixed(2)} km
            </div>
          )}
        </div>
      )}

      {trackPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000]">
          <div className="bg-white/90 backdrop-blur border border-gray-200 shadow rounded-lg px-6 py-4 text-center">
            <p className="text-gray-600 text-sm">No track data to display</p>
            <p className="text-gray-500 text-xs mt-1">Select a device and date range to view track history</p>
          </div>
        </div>
      )}
    </div>
  );
}

