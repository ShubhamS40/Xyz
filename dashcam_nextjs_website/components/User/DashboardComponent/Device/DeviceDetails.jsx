'use client';

import { useState, useEffect } from 'react';
import apiService from '@/services/api';
import geocodingService from '@/services/geocoding';

export default function DeviceDetails({ device, onClose, onLocationUpdate }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(device?.address || null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  
  // Fetch address when device location changes
  useEffect(() => {
    const fetchAddress = async () => {
      if (device?.latitude && device?.longitude) {
        setLoadingAddress(true);
        try {
          const fetchedAddress = await geocodingService.getAddress(
            device.latitude,
            device.longitude
          );
          if (fetchedAddress) {
            setAddress(fetchedAddress);
          } else if (device.address) {
            setAddress(device.address);
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          if (device.address) {
            setAddress(device.address);
          }
        } finally {
          setLoadingAddress(false);
        }
      } else if (device?.address) {
        setAddress(device.address);
      }
    };

    fetchAddress();
  }, [device?.latitude, device?.longitude]);
  
  if (!device) return null;

  const handleLiveClick = async () => {
    try {
      setLoading(true);
      // First request location from device
      await apiService.requestLocation(device.imei);
      
      // Wait a bit for device to respond, then try multiple times
      let attempts = 0;
      const maxAttempts = 5;
      
      const checkLocation = async () => {
        try {
          // Get latest location from database
          const result = await apiService.getLiveLocation(device.imei);
          if (result.success && result.data) {
            // Check if we have valid location data
            if (result.data.latitude && result.data.longitude) {
              // Fetch address for new location
              const newAddress = await geocodingService.getAddress(
                result.data.latitude,
                result.data.longitude
              );
              
              // Update device with latest location
              if (onLocationUpdate) {
                onLocationUpdate({
                  ...device,
                  latitude: result.data.latitude,
                  longitude: result.data.longitude,
                  speed: result.data.speed,
                  accStatus: result.data.accStatus,
                  lastSeen: result.data.receivedAt || result.data.lastSeen,
                  address: newAddress || device.address
                });
              }
              
              if (newAddress) {
                setAddress(newAddress);
              }
              
              setLoading(false);
              return;
            } else if (attempts < maxAttempts) {
              // No location yet, wait and try again
              attempts++;
              setTimeout(checkLocation, 2000);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching live location:', error);
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkLocation, 2000);
            return;
          }
        }
        setLoading(false);
      };
      
      // Start checking after 2 seconds
      setTimeout(checkLocation, 2000);
    } catch (error) {
      console.error('Error requesting location:', error);
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTimeSince = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const lastSeen = new Date(date);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-green-600' : 'text-orange-600';
  };

  const getSignalStrength = () => {
    return device.signalStrength || 'Strong';
  };

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {device.deviceName || `${device.deviceModel}-${device.imei.slice(-5)}`}
          </h3>
          <p className="text-xs text-gray-500 truncate">{device.imei}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${getStatusColor(device.status)}`}>
              {device.status === 'active' ? 'Online' : 'Unactive'}
              {device.accStatus === 1 && ' (ACC: ON)'}
            </span>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span className="text-xs text-gray-600">{getTimeSince(device.lastSeen)}</span>
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Address</h4>
          {loadingAddress ? (
            <p className="text-sm text-gray-500 mb-2">Loading address...</p>
          ) : (
            <p className="text-sm text-gray-900 mb-2">
              {address || device.address || 'No address available'}
            </p>
          )}
          {device.latitude && device.longitude && (
            <p className="text-xs text-gray-500">
              {device.latitude.toFixed(6)}°N, {device.longitude.toFixed(6)}°E
            </p>
          )}
          <div className="mt-3 flex items-center">
            <label className="text-xs text-gray-600 mr-2">Unit switching:</label>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
            </button>
          </div>
        </div>

        {/* Device Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Device Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">GNSS:</span>
              <span className="text-gray-900 font-medium">{device.gnssType || 'GPS'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Visible satellites:</span>
              <span className="text-gray-900 font-medium">{device.satellites || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ACC status:</span>
              <span className="text-gray-900 font-medium">
                {device.accStatus === 1 ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cellular signal strength:</span>
              <div className="flex items-center space-x-1">
                <span className="text-gray-900 font-medium">{getSignalStrength()}</span>
                <div className="flex space-x-0.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-3 rounded ${
                        bar <= (getSignalStrength() === 'Strong' ? 4 : getSignalStrength() === 'Medium' ? 2 : 1)
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last online:</span>
              <span className="text-gray-900 font-medium text-xs">
                {formatDate(device.lastSeen)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Speed:</span>
              <span className="text-gray-900 font-medium">
                {device.speed !== null && device.speed !== undefined 
                  ? `${device.speed.toFixed(1)} km/h` 
                  : '0.0 km/h'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={handleLiveClick}
              disabled={loading}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Live'}
            </button>
            <button className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700">
              Tracks
            </button>
            <button className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700">
              Device
            </button>
            <button className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700">
              Command
            </button>
            <button className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700">
              Configure
            </button>
            <button className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700">
              Share
            </button>
          </div>
          <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            Dashboard setting
          </button>
        </div>
      </div>
    </div>
  );
}



