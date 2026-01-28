'use client';

export default function DeviceInfoCard({ device }) {
  const getSignalStrength = () => {
    // Mock signal strength - you can get this from device data
    return 'Strong';
  };

  const getSatellites = () => {
    // Mock satellite count - you can get this from device data
    return 4;
  };

  const getGNSS = () => {
    // Mock GNSS type - you can get this from device data
    return 'GPS';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-3">Device Details</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">GNSS</span>
          <span className="text-sm font-medium text-black">{getGNSS()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Visible satellites</span>
          <span className="text-sm font-medium text-black">{getSatellites()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Cellular signal strength</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-600">{getSignalStrength()}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-green-500 rounded-full"
                  style={{ height: `${i * 3}px` }}
                />
              ))}
            </div>
          </div>
        </div>
        {device.lastSeen && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last online</span>
            <span className="text-sm font-medium text-black">
              {new Date(device.lastSeen).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

