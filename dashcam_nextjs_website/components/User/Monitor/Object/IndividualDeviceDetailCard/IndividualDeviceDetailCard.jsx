import React, { useState, useEffect } from 'react';
import { X, Signal } from 'lucide-react';

export default function DeviceDetailCard({ device, onClose }) {
  const [unitSwitching, setUnitSwitching] = useState(false);
  const [address, setAddress] = useState(device?.address || null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [autoAccStatus, setAutoAccStatus] = useState('OFF');
  const [vl502Data, setVl502Data] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState('Unknown');

  const fallbackDevice = {
    id: 'JC182-04062',
    imei: '869058070004062',
    status: 'Offline',
    accStatus: 'OFF',
    daysOffline: '6 day+',
    address: 'Ghaziabad, Uttar Pradesh, 201001, India',
    coordinates: `28°40'34.87"N,77°25'48.57"E`,
  };

  const data = device || fallbackDevice;

  // Auto ACC Status Logic based on location data freshness
  useEffect(() => {
    const checkAccStatus = () => {
      // Check if we have received fresh location data
      const hasRecentLocationData = data?.receivedAt || data?.lastSeen;
      
      if (!hasRecentLocationData) {
        setAutoAccStatus('OFF');
        return;
      }

      const lastDataTime = new Date(data.receivedAt || data.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastDataTime) / (1000 * 60));

      // If location data received within last 5 minutes, ACC is ON
      // Otherwise ACC is OFF
      if (diffMinutes <= 5) {
        setAutoAccStatus('ON');
      } else {
        setAutoAccStatus('OFF');
      }
    };

    checkAccStatus();

    // Check every 30 seconds
    const interval = setInterval(checkAccStatus, 30000);

    return () => clearInterval(interval);
  }, [data?.receivedAt, data?.lastSeen]);

  // Fetch address when device location changes
  useEffect(() => {
    const fetchAddress = async () => {
      if (data?.latitude && data?.longitude && !data.address) {
        setLoadingAddress(true);
        try {
          // Simulated geocoding - replace with actual service
          const fetchedAddress = `Lat: ${data.latitude.toFixed(5)}, Lng: ${data.longitude.toFixed(5)}`;
          setAddress(fetchedAddress);
        } catch (error) {
          console.error('Error fetching address:', error);
        } finally {
          setLoadingAddress(false);
        }
      } else if (data?.address) {
        setAddress(data.address);
      }
    };

    fetchAddress();
  }, [data?.latitude, data?.longitude, data?.address]);

  // Fetch VL502 specific data (OBD)
  useEffect(() => {
    if (data?.deviceModel === 'VL502' && data?.imei) {
      const fetchVL502Data = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/vl502/location/${data.imei}/live`);
          const json = await res.json();
          if (json.success && json.data) {
             setVl502Data(json.data);
             if (json.data.vehicleStatus) {
                 setVehicleStatus(json.data.vehicleStatus);
             }
          }
        } catch (e) {
          console.error("Failed to fetch VL502 data", e);
        }
      };
      fetchVL502Data();
      const interval = setInterval(fetchVL502Data, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [data?.imei, data?.deviceModel]);

  const getTitle = () => {
    if (data.deviceName) return data.deviceName;
    if (data.deviceModel && data.imei) {
      return `${data.deviceModel}-${data.imei.slice(-4)}`;
    }
    return data.id || data.imei || 'Device';
  };

  const getCoordinates = () => {
    if (data.coordinates) return data.coordinates;
    if (data.latitude && data.longitude) {
      if (unitSwitching) {
        // DMS format (degrees, minutes, seconds)
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        const latDeg = Math.floor(Math.abs(lat));
        const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
        const latSec = ((Math.abs(lat) - latDeg - latMin / 60) * 3600).toFixed(2);
        const latDir = lat >= 0 ? 'N' : 'S';
        
        const lngDeg = Math.floor(Math.abs(lng));
        const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
        const lngSec = ((Math.abs(lng) - lngDeg - lngMin / 60) * 3600).toFixed(2);
        const lngDir = lng >= 0 ? 'E' : 'W';
        
        return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
      } else {
        // Decimal format
        return `${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}`;
      }
    }
    if (data.location && data.location.lat && data.location.lng) {
      return `${Number(data.location.lat).toFixed(5)}, ${Number(data.location.lng).toFixed(5)}`;
    }
    return '—';
  };

  const getStatusDisplay = () => {
    // Calculate actual status based on receivedAt or lastSeen
    // Device is online if data received within last 4 minutes
    let actualStatus = data.status || 'inactive';
    
    if (actualStatus !== 'inactive') {
      const latestDataTime = data.receivedAt || data.lastSeen;
      if (latestDataTime) {
        const lastDataTime = new Date(latestDataTime).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastDataTime) / (1000 * 60);
        actualStatus = diffMinutes <= 4 ? 'online' : 'offline';
      } else {
        actualStatus = 'offline';
      }
    }
    
    const statusMap = {
      'online': 'Online',
      'offline': 'Offline',
      'inactive': 'Inactive',
    };
    return statusMap[actualStatus.toLowerCase()] || actualStatus;
  };

  const getAccStatus = () => {
    // Priority 1: Use auto-calculated ACC status based on location data
    if (autoAccStatus) return autoAccStatus;

    // Priority 2: Use device's actual ACC status if available
    // 0x00 = ACC OFF (0), 0x01 = ACC ON (1)
    if (data.accStatus === 1 || data.accStatus === 0x01) return 'ON';
    if (data.accStatus === 0 || data.accStatus === 0x00) return 'OFF';
    
    return 'OFF';
  };

  const getAccStatusColor = () => {
    const accStatus = getAccStatus();
    return accStatus === 'ON' ? 'text-green-600' : 'text-gray-600';
  };

  const getSignalStrengthDisplay = () => {
    return data.signalStrength || 'Medium';
  };

  const getSignalStrengthColor = () => {
    const strength = getSignalStrengthDisplay().toLowerCase();
    if (strength.includes('strong') || strength.includes('excellent')) return 'text-green-600';
    if (strength.includes('medium') || strength.includes('good')) return 'text-yellow-600';
    if (strength.includes('weak') || strength.includes('poor')) return 'text-orange-600';
    if (strength.includes('extremely poor') || strength.includes('no signal')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSignalStrengthBars = () => {
    const strength = getSignalStrengthDisplay().toLowerCase();
    let bars = 0;
    if (strength.includes('strong') || strength.includes('excellent')) bars = 4;
    else if (strength.includes('medium') || strength.includes('good')) bars = 3;
    else if (strength.includes('weak')) bars = 2;
    else if (strength.includes('poor')) bars = 1;
    return bars;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '—';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return '—';
    }
  };

  const getDaysOffline = () => {
    if (data.lastSeen) {
      const lastSeenDate = new Date(data.lastSeen);
      const now = new Date();
      const diffTime = Math.abs(now - lastSeenDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}+`;
      }
    }
    return data.daysOffline || null;
  };

  const getSpeed = () => {
    // If device is online, show actual speed, otherwise show 0
    const status = (data.status || 'inactive').toLowerCase();
    if (status === 'online' && data.speed !== null && data.speed !== undefined) {
      return Number(data.speed).toFixed(1);
    }
    return '0.0';
  };

  const getLocationDataAge = () => {
    if (!data?.receivedAt && !data?.lastSeen) return '—';
    
    const lastDataTime = new Date(data.receivedAt || data.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastDataTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-300">
        <div>
          <h2 className="text-lg font-semibold text-black">{getTitle()}</h2>
          <p className="text-sm text-gray-600">{data.imei}</p>
          {data.deviceModel && (
            <p className="text-xs text-gray-500 mt-1">Model: {data.deviceModel}</p>
          )}
        </div>
        <button
          className="p-1 hover:bg-gray-200 rounded-full"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Signal className="w-5 h-5 text-black" />
              <span className="font-medium text-black">
                {getStatusDisplay()}
              </span>
              <span className={`text-sm font-medium ${getAccStatusColor()}`}>
                (ACC: {getAccStatus()})
              </span>
              {/* Vehicle Status Badge */}
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                vehicleStatus === 'Moving' ? 'bg-green-100 text-green-800' :
                vehicleStatus === 'Idle' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {vehicleStatus}
              </span>
            </div>
            {getDaysOffline() && (
              <span className="text-sm font-medium text-black">
                {getDaysOffline()}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Speed:</span>
            <span className="text-sm font-semibold text-black">
              {getSpeed()} km/h
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last location data:</span>
            <span className="text-xs font-medium text-gray-700">
              {getLocationDataAge()}
            </span>
          </div>
        </div>

        <div className="p-4 border-b border-gray-300">
          <h3 className="text-sm font-medium text-black mb-2">Address</h3>
          <p className="text-sm text-black font-medium mb-3">
            {loadingAddress ? 'Loading...' : (address || '—')}
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-black">Coordinates</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Unit switching</span>
              <button
                onClick={() => setUnitSwitching(!unitSwitching)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  unitSwitching ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                    unitSwitching ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-black">{getCoordinates()}</p>
        </div>

        {/* OBD Data Section (VL502 Only) */}
        {data.deviceModel === 'VL502' && vl502Data?.obd && (
          <div className="p-4 border-b border-gray-300 bg-gray-50">
            <h3 className="text-sm font-medium text-black mb-3">Vehicle OBD Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-500 block">Accumulated Mileage</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.accumulatedMileage ? `${(vl502Data.obd.accumulatedMileage / 1000).toFixed(1)} km` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Battery Voltage</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.batteryVoltage ? `${vl502Data.obd.batteryVoltage} V` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Coolant Temp</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.coolantTemp ? `${vl502Data.obd.coolantTemp} °C` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Engine RPM</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.rpm ? `${vl502Data.obd.rpm} rpm` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Fuel Level</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.fuelLevel ? `${vl502Data.obd.fuelLevel} %` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Intake Pressure</span>
                <span className="text-sm font-medium text-black">
                  {vl502Data.obd.intakePressure ? `${vl502Data.obd.intakePressure} kPa` : '—'}
                </span>
              </div>
              <div>
                 <span className="text-xs text-gray-500 block">Engine Load</span>
                 <span className="text-sm font-medium text-black">
                   {vl502Data.obd.engineLoad ? `${vl502Data.obd.engineLoad} %` : '—'}
                 </span>
              </div>
              <div>
                 <span className="text-xs text-gray-500 block">Intake Air Temp</span>
                 <span className="text-sm font-medium text-black">
                   {vl502Data.obd.intakeAirTemp ? `${vl502Data.obd.intakeAirTemp} °C` : '—'}
                 </span>
              </div>
            </div>
          </div>
        )}

        {/* Device Information Section */}
        <div className="p-4 border-b border-gray-300">
          <h3 className="text-sm font-medium text-black mb-3">Device</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">GNSS:</span>
              <span className="text-sm font-medium text-black">{data.gnssType || 'GPS'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Visible satellites:</span>
              <span className="text-sm font-medium text-black">{data.satellites || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cellular signal strength:</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${getSignalStrengthColor()}`}>
                  {getSignalStrengthDisplay()}
                </span>
                <div className="flex items-end gap-0.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 rounded ${
                        bar <= getSignalStrengthBars()
                          ? getSignalStrengthBars() >= 3
                            ? 'bg-green-500'
                            : getSignalStrengthBars() === 2
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                      style={{ height: `${bar * 3 + 2}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Camera condition:</span>
              <span className="text-sm font-medium text-green-600">Normal</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory card condition:</span>
              <span className="text-sm font-medium text-green-600">Normal</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last online:</span>
              <span className="text-sm font-medium text-black">
                {formatDateTime(data.lastSeen || data.receivedAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last fix:</span>
              <span className="text-sm font-medium text-black">
                {formatDateTime(data.receivedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* ACC Status Logic Info */}
        <div className="p-4 bg-blue-50 border-b border-gray-300">
          <h3 className="text-xs font-semibold text-blue-800 mb-2">ℹ️ ACC Status Logic</h3>
          <p className="text-xs text-blue-700">
            ACC status is automatically determined based on location data freshness:
          </p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1 pl-4">
            <li>• <strong>ON</strong>: Location data received within last 4 minutes</li>
            <li>• <strong>OFF</strong>: No data or data older than 4 minutes</li>
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-300">
        <button className="w-full py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
          Dashboard setting
        </button>
      </div>
    </div>
  );
}