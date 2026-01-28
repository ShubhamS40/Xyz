'use client';

import StatusIndicator from './StatusIndicator';

export default function DeviceCard({ device, onRefresh, isSelected, onClick }) {
  const formatDate = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getDeviceIcon = (model) => {
    if (model?.includes('JC261') || model?.includes('JC261P')) {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${
        isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Device Info */}
        <div className="flex items-center space-x-3 flex-1">
          {getDeviceIcon(device.deviceModel)}
          <StatusIndicator status={device.status} />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {device.deviceName || `${device.deviceModel}-${device.imei.slice(-5)}`}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              IMEI: {device.imei}
            </p>
          </div>
        </div>

        {/* Right: Status Info */}
        <div className="text-right ml-2">
          <div className="flex items-center justify-end space-x-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              device.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {device.status === 'active' ? '✓' : '✗'}
            </span>
            {device.accStatus !== undefined && device.accStatus !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                device.accStatus === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
              }`}>
                ACC {device.accStatus === 1 ? 'ON' : 'OFF'}
              </span>
            )}
          </div>
          
          {device.speed !== undefined && device.speed !== null && (
            <p className="text-xs font-medium text-gray-700">
              {device.speed.toFixed(1)} km/h
            </p>
          )}

          <p className="text-xs text-gray-500">
            {getTimeSince(device.lastSeen)}
          </p>
          
          {device.ipAddress && (
            <p className="text-xs text-gray-400 mt-0.5">
              {device.ipAddress}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

