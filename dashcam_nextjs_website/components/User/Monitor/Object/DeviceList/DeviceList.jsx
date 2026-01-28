import React, { useState } from 'react';
import {
  Heart,
  Edit2,
  UserPlus,
  Eye,
  MoreVertical,
  MapPin,
  Terminal,
  Grid3x3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function DeviceList({ devices = [], onSelectDevice, selectedDevice }) {
  const [isGroupExpanded, setIsGroupExpanded] = useState(true);
  const [openMenuFor, setOpenMenuFor] = useState(null);

  const fallbackDevice = {
    id: 'JC182-04062',
    deviceName: 'JC182-04062',
    imei: '869058070004062',
    lastUpdate: '2026-01-10 10:26:35',
    status: 'offline',
  };

  const listDevices = devices.length > 0 ? devices : [fallbackDevice];

  const getDisplayName = (device) => {
    if (device.deviceName) return device.deviceName;
    if (device.deviceModel && device.imei) {
      return `${device.deviceModel}-${device.imei.slice(-4)}`;
    }
    return device.imei || device.id || 'Unknown device';
  };

  const getLastUpdate = (device) => {
    if (device.lastSeen) {
      const date = new Date(device.lastSeen);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
    if (device.lastUpdate) return device.lastUpdate;
    return '—';
  };

  const getStatusLabel = (device) => {
    // Calculate actual status based on receivedAt or lastSeen
    // Device is online if data received within last 4 minutes
    let status = device.status || 'inactive';
    
    if (status !== 'inactive') {
      // Check latest location data timestamp (receivedAt) or lastSeen
      const latestDataTime = device.data && device.data.length > 0 
        ? device.data[0].receivedAt 
        : device.lastSeen;
      
      if (latestDataTime) {
        const lastDataTime = new Date(latestDataTime).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastDataTime) / (1000 * 60);
        status = diffMinutes <= 4 ? 'online' : 'offline';
      } else {
        status = 'offline';
      }
    }
    
    return status;
  };

  const handleMenuToggle = (deviceKey) => {
    setOpenMenuFor((current) => (current === deviceKey ? null : deviceKey));
  };

  return (
    <div className="w-full max-w-md bg-white">
      {/* Stats Bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          All {listDevices.length}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-green-600">▲ 0</span>
        </div>
        <div className="flex items-center gap-1">
          <Heart className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-gray-700">0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700">📶 5</span>
        </div>
      </div>

      {/* Group Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsGroupExpanded(!isGroupExpanded)}
            className="text-gray-600 hover:text-gray-800"
          >
            {isGroupExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <span className="text-sm font-medium text-gray-700">Default group</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
          <MoreVertical className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
        </div>
      </div>

      {/* Scrollable Device List */}
      {isGroupExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {listDevices.map((device) => {
            const deviceKey = device.imei || device.id || getDisplayName(device);
            const isSelected =
              selectedDevice && selectedDevice.imei && device.imei
                ? selectedDevice.imei === device.imei
                : false;

            return (
              <div
                key={deviceKey}
                className={`relative border-b border-gray-100 hover:bg-gray-50 ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
              >
                <div
                  className="flex items-center px-4 py-3 cursor-pointer"
                  onClick={() => onSelectDevice && onSelectDevice(device)}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white mr-3 flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-blue-600">
                        {getDisplayName(device)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {getStatusLabel(device)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{getLastUpdate(device)}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuToggle(deviceKey);
                    }}
                    className="ml-2 p-1 hover:bg-gray-200 rounded"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-4 px-4 pb-3">
                  <Heart className="w-5 h-5 text-gray-300 cursor-pointer hover:text-red-500" />
                  <Edit2 className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                  <UserPlus className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                  <Eye className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                </div>

                {openMenuFor === deviceKey && (
                  <div className="absolute right-4 top-16 bg-white shadow-lg rounded-lg border border-gray-200 py-2 w-48 z-10">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      Move to group
                      <span className="ml-auto">›</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Live
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Device Command
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      Common Address
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
