import React, { useState } from 'react';
import { Heart, Camera, Edit, RefreshCw, MoreVertical, ChevronDown, Search } from 'lucide-react';
import apiService from '@/services/api';

const DeviceList = ({ devices = [], loading = false, onChannelSelect }) => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState({});

  // Initialize channels state for devices based on cameraChannels field
  React.useEffect(() => {
    const channelsState = {};
    devices.forEach(device => {
      // Use cameraChannels from device, default to 2 if not set
      const numChannels = device.cameraChannels || 2;
      channelsState[device.id] = {};
      // Only create channels up to the number of camera channels
      for (let i = 1; i <= numChannels; i++) {
        channelsState[device.id][`ch${i}`] = false;
      }
    });
    setChannels(channelsState);
  }, [devices]);

  const handleDeviceClick = (deviceId) => {
    setSelectedDevice(selectedDevice === deviceId ? null : deviceId);
  };

  const handleChannelChange = async (deviceId, channel, device) => {
    const newState = !channels[deviceId][channel];
    
    // Update local state
    setChannels(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        [channel]: newState
      }
    }));

    // If channel is being selected, start video stream
    if (newState && device && device.imei) {
      const channelNumber = parseInt(channel.replace('ch', ''));
      const cameraIndex = channelNumber - 1; // CH1 = index 0, CH2 = index 1, etc.
      
      try {
        console.log(`Starting video stream for ${device.imei}, channel ${channelNumber} (camera index ${cameraIndex})`);
        
        // Call API to start video stream
        const response = await apiService.startVideoStream(device.imei, cameraIndex);
        
        if (response.success && onChannelSelect) {
          onChannelSelect({
            device,
            channel: channelNumber,
            cameraIndex,
            streamUrl: response.streamUrl,
            hlsUrl: response.hlsUrl
          });
        }
      } catch (error) {
        console.error('Error starting video stream:', error);
        // Revert channel selection on error
        setChannels(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            [channel]: false
          }
        }));
      }
    } else if (!newState && device && device.imei) {
      // If channel is being deselected, stop video stream
      try {
        await apiService.stopVideoStream(device.imei);
      } catch (error) {
        console.error('Error stopping video stream:', error);
      }
    }
  };

  // Filter devices based on search query
  const filteredDevices = devices.filter(device => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      device.deviceName?.toLowerCase().includes(query) ||
      device.imei?.toLowerCase().includes(query) ||
      device.deviceModel?.toLowerCase().includes(query)
    );
  });

  // Format timestamp
  const formatTimestamp = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
    } catch {
      return date;
    }
  };

  // Calculate time difference
  const getTimeDifference = (date) => {
    if (!date) return 'N/A';
    try {
      const now = new Date();
      const then = new Date(date);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays}day+`;
      if (diffHours > 0) return `${diffHours}hr+`;
      if (diffMins > 0) return `${diffMins}min`;
      return 'Just now';
    } catch {
      return 'N/A';
    }
  };

  // Get device icon based on device model or category
  const getDeviceIcon = (device) => {
    if (device.deviceModel?.includes('JC261') || device.deviceModel?.includes('JC182')) {
      return '🚗';
    }
    return '📄';
  };

  // Get device color
  const getDeviceColor = (device) => {
    if (device.status === 'online') return 'bg-green-500';
    if (device.status === 'offline') return 'bg-gray-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="w-full bg-white">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Please enter the device name or IMEI"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="absolute right-3 top-2.5 text-gray-400">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Group Button */}
      <button className="flex items-center gap-2 text-blue-600 mb-4 text-sm font-medium">
        <span className="text-xl">+</span> Add group
      </button>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-4">
        <button className="text-gray-700 font-medium">All</button>
        <button className="text-gray-400">▲</button>
        <button className="text-gray-400">❤️</button>
        <button className="text-gray-400">📊</button>
        <button className="ml-auto text-blue-600">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Default Group */}
      {filteredDevices.length > 0 && (
        <div className="bg-gray-50 rounded-lg mb-2">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 text-gray-700">
              <ChevronDown className="w-4 h-4" />
              <span className="font-medium">Default group({filteredDevices.length})</span>
            </div>
            <button className="text-gray-400">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Loading devices...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDevices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No devices found matching your search' : 'No dashcam devices found'}
        </div>
      )}

      {/* Device List */}
      {!loading && filteredDevices.length > 0 && (
        <div className="space-y-2">
          {filteredDevices.map((device) => {
            const latestData = device.data && device.data.length > 0 ? device.data[0] : null;
            const timestamp = latestData?.receivedAt || device.lastSeen;
            const deviceName = device.deviceName || device.deviceModel || `Device-${device.imei?.slice(-4)}`;
            
            return (
              <div key={device.id} className="bg-white rounded-lg border border-gray-200">
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleDeviceClick(device.id)}
                >
                  <div className={`${getDeviceColor(device)} w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl`}>
                    {getDeviceIcon(device)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{deviceName}</h3>
                    <p className="text-xs text-gray-500">{formatTimestamp(timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{getTimeDifference(timestamp)}</span>
                    <button className="text-gray-400">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center justify-end gap-4 px-3 pb-3">
                  <button className="text-gray-400 hover:text-red-500">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-blue-500">
                    <Camera className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-blue-500">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>

                {/* Channel Selection - Shows when device is clicked */}
                {selectedDevice === device.id && channels[device.id] && (
                  <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-6 flex-wrap">
                      {Object.keys(channels[device.id])
                        .sort((a, b) => {
                          // Sort channels: ch1, ch2, ch3, etc.
                          const numA = parseInt(a.replace('ch', ''));
                          const numB = parseInt(b.replace('ch', ''));
                          return numA - numB;
                        })
                        .map((channel) => (
                        <label key={channel} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={channels[device.id][channel]}
                            onChange={() => handleChannelChange(device.id, channel, device)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 font-medium">{channel.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeviceList;
