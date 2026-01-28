'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import Sidebar from '@/components/User/DashboardComponent/Sidebar/Sidebar';
import DeviceList from '../../../components/User/Monitor/Object/DeviceList/DeviceList.jsx';
import Map from '@/components/User/Monitor/Map/Map';
import DeviceDetailCard from '../../../components/User/Monitor/Object/IndividualDeviceDetailCard/IndividualDeviceDetailCard.jsx';
import InputFrom from '@/components/User/Monitor/Tracks/InputFrom';
import TrackMap from '@/components/User/Monitor/Tracks/TrackMap';
import apiService from '@/services/api';

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState('Monitor');
  const [activeSidebarItem, setActiveSidebarItem] = useState('objects');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);
  const [trackData, setTrackData] = useState({ points: [], summary: null, device: null });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiService.getUserDevices({ limit: 100 });
        if (response.success && response.data) {
          setDevices(response.data);
        } else {
          setDevices([]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load devices');
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

  const handleDeviceSelect = async (device) => {
    setSelectedDevice(device);

    const fetchLocation = async () => {
    try {
      const response = await apiService.getLiveLocation(device.imei);
      if (response && response.success && response.data) {
        const data = response.data;
        if (data.latitude !== null && data.longitude !== null) {
          setMapLocation({ lat: data.latitude, lng: data.longitude });
        }

        setSelectedDevice((current) => ({
          ...(current || device),
          deviceName: data.deviceName || device.deviceName,
          deviceModel: data.deviceModel || device.deviceModel,
          status: data.status || device.status,
          speed: data.speed ?? device.speed,
          accStatus:
            data.accStatus !== undefined && data.accStatus !== null
              ? data.accStatus
              : device.accStatus,
          gnssType: data.gnssType || device.gnssType,
          satellites: data.satellites ?? device.satellites,
          signalStrength: data.signalStrength || device.signalStrength,
          latitude: data.latitude,
          longitude: data.longitude,
          receivedAt: data.receivedAt || device.receivedAt,
          lastSeen: data.lastSeen || device.lastSeen,
        }));
      }
    } catch (err) {
      setError((prev) => prev || 'Failed to load live location');
    }
  };

    // Fetch immediately
    await fetchLocation();
  };

  // Poll for updates when a device is selected
  useEffect(() => {
    if (!selectedDevice) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await apiService.getLiveLocation(selectedDevice.imei);
        if (response && response.success && response.data) {
          const data = response.data;
          if (data.latitude !== null && data.longitude !== null) {
            setMapLocation({ lat: data.latitude, lng: data.longitude });
          }

          setSelectedDevice((current) => ({
            ...current,
            deviceName: data.deviceName || current.deviceName,
            deviceModel: data.deviceModel || current.deviceModel,
            status: data.status || current.status,
            speed: data.speed ?? current.speed,
            accStatus:
              data.accStatus !== undefined && data.accStatus !== null
                ? data.accStatus
                : current.accStatus,
            gnssType: data.gnssType || current.gnssType,
            satellites: data.satellites ?? current.satellites,
            signalStrength: data.signalStrength || current.signalStrength,
            latitude: data.latitude,
            longitude: data.longitude,
            receivedAt: data.receivedAt || current.receivedAt,
            lastSeen: data.lastSeen || current.lastSeen,
          }));
        }
      } catch (err) {
        // Silently fail for polling errors
        console.error('Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [selectedDevice?.imei]);

  const handleCloseDetail = () => {
    setSelectedDevice(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeItem={activeSidebarItem}
          onItemChange={setActiveSidebarItem}
          activeTab={activeTab}
        />
        <div className="flex flex-1 overflow-hidden bg-white">
          {activeSidebarItem === 'tracks' ? (
            // Show Tracks Input Form on left and TrackMap on right
            <>
              <div className="w-80 border-r border-gray-200 overflow-hidden">
                <InputFrom onTrackDataChange={setTrackData} />
              </div>
              <div className="flex-1 relative">
                <TrackMap 
                  trackPoints={trackData.points}
                  trackSummary={trackData.summary}
                />
              </div>
            </>
          ) : (
            // Show Device List and Map for other items (objects, alerts)
            <>
          <div className="w-80 border-r border-gray-200 overflow-hidden">
            <DeviceList
              devices={devices}
              onSelectDevice={handleDeviceSelect}
              selectedDevice={selectedDevice}
            />
            {error && (
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
                {error}
              </div>
            )}
            {loading && !error && (
              <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                Loading devices...
              </div>
            )}
          </div>
          <div className="flex-1 relative">
                <Map 
                  devices={devices} 
                  location={mapLocation} 
                  selectedDevice={selectedDevice}
                />
            {selectedDevice && (
                  <div className="absolute right-0 top-0 bottom-0 z-[1000] w-96 bg-white shadow-2xl overflow-hidden">
                <DeviceDetailCard
                  device={selectedDevice}
                  onClose={handleCloseDetail}
                />
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

