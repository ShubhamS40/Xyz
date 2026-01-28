'use client';

import { useState, useEffect } from 'react';

export default function VideoPlayer({ device, mode = 'live' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('CH1');
  const [layout, setLayout] = useState('single');

  // Mock video URLs - replace with actual API endpoints
  const getVideoUrl = () => {
    if (mode === 'live') {
      // Live stream URL - replace with actual RTMP/WebRTC URL
      return null; // `rtmp://your-server.com/live/${device.imei}`;
    } else {
      // Recorded video URL - replace with actual API endpoint
      return null; // `/api/devices/${device.imei}/videos/${videoId}`;
    }
  };

  const layouts = {
    single: 'grid-cols-1',
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
  };

  const renderVideoGrid = () => {
    const cols = layouts[layout] || 'grid-cols-1';
    const count = layout === 'single' ? 1 : layout === '2x2' ? 4 : 9;
    
    return (
      <div className={`grid ${cols} gap-2 h-full p-4`}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="bg-black rounded-lg flex items-center justify-center relative overflow-hidden"
          >
            {mode === 'live' ? (
              <div className="text-center text-white">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Live Video Feed</p>
                <p className="text-xs text-gray-500 mt-1">{device.deviceName} - {selectedChannel}</p>
                <p className="text-xs text-gray-600 mt-2">Stream will start when device is online</p>
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Recorded Video</p>
                <p className="text-xs text-gray-500 mt-1">No videos available</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Controls */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">Default live broadcast duration:</span>
          <select className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>not limited</option>
            <option>1 hour</option>
            <option>2 hours</option>
            <option>4 hours</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Compatibility</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-sm text-gray-300">ON</span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout Buttons */}
          <button
            onClick={() => setLayout('single')}
            className={`p-2 rounded transition-colors ${layout === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="Single"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
            </svg>
          </button>
          <button
            onClick={() => setLayout('2x2')}
            className={`p-2 rounded transition-colors ${layout === '2x2' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="2x2 Grid"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM2 13a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4zM12 3a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1h-6a1 1 0 01-1-1V3zM12 13a1 1 0 011-1h6a1 1 0 011 1v4a1 1 0 01-1 1h-6a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
          <button
            onClick={() => setLayout('3x3')}
            className={`p-2 rounded transition-colors ${layout === '3x3' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="3x3 Grid"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM2 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4zM10 3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zM10 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zM18 3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zM18 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Channel Selection (for recorded videos) */}
      {mode === 'recorded' && (
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-2 flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-gray-300">Channel:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChannel('CH1')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedChannel === 'CH1' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              CH1
            </button>
            <button
              onClick={() => setSelectedChannel('CH2')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedChannel === 'CH2' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              CH2
            </button>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 overflow-hidden">
        {renderVideoGrid()}
      </div>
    </div>
  );
}

