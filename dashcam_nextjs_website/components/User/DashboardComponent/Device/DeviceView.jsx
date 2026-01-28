'use client';

import { useState, useEffect } from 'react';
import DeviceMap from './DeviceMap';
import DeviceInfoCard from './DeviceInfoCard';
import VideoPlayer from './VideoPlayer';
import geocodingService from '@/services/geocoding';

export default function DeviceView({ device, onClose }) {
  const [activeTab, setActiveTab] = useState('live');
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null);

  useEffect(() => {
    if (device?.latitude && device?.longitude) {
      setDeviceLocation({
        lat: device.latitude,
        lng: device.longitude,
      });
      fetchAddress(device.latitude, device.longitude);
    }
  }, [device]);

  const fetchAddress = async (lat, lng) => {
    setLoadingAddress(true);
    try {
      const addr = await geocodingService.getAddress(lat, lng);
      setAddress(addr);
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setLoadingAddress(false);
    }
  };

  if (!device) return null;

  const isDashcam = device.category === 'Dashcam' || device.deviceModel?.includes('JC261') || device.deviceModel?.includes('dashcam');

  const tabs = [
    { id: 'live', label: 'Live', icon: '📹' },
    { id: 'tracks', label: 'Tracks', icon: '📍' },
    { id: 'device', label: 'Device', icon: '⚙️' },
    { id: 'command', label: 'Command', icon: '📡' },
    { id: 'configure', label: 'Configure', icon: '🔧' },
    { id: 'share', label: 'Share', icon: '🔗' },
  ];

  // Format coordinates
  const formatCoordinates = (lat, lng) => {
    const latDeg = Math.abs(lat);
    const lngDeg = Math.abs(lng);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    const latMin = (latDeg % 1) * 60;
    const lngMin = (lngDeg % 1) * 60;
    const latSec = (latMin % 1) * 60;
    const lngSec = (lngMin % 1) * 60;
    
    return `${Math.floor(latDeg)}°${Math.floor(latMin)}'${latSec.toFixed(2)}"${latDir}, ${Math.floor(lngDeg)}°${Math.floor(lngMin)}'${lngSec.toFixed(2)}"${lngDir}`;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-screen">
      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center Panel - Map or Video */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Search Bar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Please enter address"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black">
              <option>Default</option>
            </select>
          </div>

          {/* Map or Video Content */}
          <div className="flex-1 overflow-hidden">
            {(activeTab === 'live' && isDashcam) ? (
              <VideoPlayer device={device} mode="live" />
            ) : activeTab === 'recorded' && isDashcam ? (
              <VideoPlayer device={device} mode="recorded" />
            ) : (
              <DeviceMap device={device} location={deviceLocation} />
            )}
          </div>
        </div>

        {/* Right Panel - Device Details */}
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-black">{device.deviceName || `Device-${device.imei.slice(-4)}`}</h2>
              <p className="text-xs text-gray-600 mt-1">IMEI: {device.imei}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Status Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  device.status === 'active' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {device.status === 'active' ? (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-black">
                    {device.status === 'active' ? 'Idling' : 'Offline'} (ACC: {device.accStatus === 1 ? 'ON' : 'OFF'})
                  </p>
                  <p className="text-xs text-gray-500">1 min</p>
                </div>
              </div>
            </div>

            {/* Address Card */}
            {address && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-sm text-black">{address}</p>
              </div>
            )}

            {/* Coordinates Card */}
            {deviceLocation && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Coordinates</p>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    Unit switching
                  </label>
                </div>
                <p className="text-sm text-black font-mono">
                  {formatCoordinates(deviceLocation.lat, deviceLocation.lng)}
                </p>
              </div>
            )}

            {/* Device Details Card */}
            <DeviceInfoCard device={device} />

            {/* Assigned User Card */}
            {device.assigned && device.assignedTo && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Assigned To</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                    {device.assignedTo.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-black">{device.assignedTo}</p>
                    <p className="text-xs text-gray-500">User</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Setting Button */}
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Dashboard setting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
