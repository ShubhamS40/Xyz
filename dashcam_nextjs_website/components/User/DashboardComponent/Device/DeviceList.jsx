'use client';

import { useState } from 'react';
import DeviceCard from './DeviceCard';

export default function DeviceList({ devices = [], selectedDevice, onSelectDevice, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredDevices = devices.filter(device =>
    (device.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     device.imei?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = devices.filter(d => d.status === 'active').length;
  const inactiveCount = devices.filter(d => d.status === 'inactive').length;
  const otherCount = devices.length - activeCount - inactiveCount;

  return (
    <div className="bg-white flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Device List</h3>
        
        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Please enter the device name or IMEI Q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 text-xs">Q</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-3">
          <button className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">
            Add group
          </button>
          
          <div className="flex items-center space-x-2">
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
            <button 
              onClick={onRefresh}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-gray-700 font-medium">All {devices.length}</span>
          <div className="flex items-center space-x-1">
            <span className="text-green-600 font-medium">{activeCount}</span>
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-red-600 font-medium">{inactiveCount}</span>
            <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-600 font-medium">{otherCount}</span>
            <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Device Groups */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-xs font-medium text-gray-600 mb-2 px-2">
            Default group({devices.length})
          </div>
          <div className="divide-y divide-gray-100">
            {filteredDevices.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">No devices found</p>
              </div>
            ) : (
              filteredDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isSelected={selectedDevice?.id === device.id}
                  onClick={() => onSelectDevice && onSelectDevice(device)}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

