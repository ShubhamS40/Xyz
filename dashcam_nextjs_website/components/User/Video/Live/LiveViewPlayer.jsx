import React, { useState, useRef, useCallback } from 'react';
import { Info, Grid3x3, LayoutGrid, Maximize2, Settings } from 'lucide-react';
import EasyPlayer from './EasyPlayer';

const LiveViewPlayer = ({ streams = [], broadcastDuration = 'not limited', onBroadcastDurationChange }) => {
  const [compatibility, setCompatibility] = useState(true);
  const [viewMode, setViewMode] = useState('2x2');
  
  // EasyPlayer handles its own internal state mostly, but we can track active streams
  const activeStreams = streams.length > 0 ? streams : [];

  const getGridClass = () => {
    switch(viewMode) {
      case '1x1': return 'grid-cols-1';
      case '2x2': return 'grid-cols-2';
      case '3x3': return 'grid-cols-3';
      case '4x4': return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const getVisiblePlayers = () => {
    switch(viewMode) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      default: return 4;
    }
  };

  const displayStreams = activeStreams.slice(0, getVisiblePlayers());

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700 flex items-center gap-2">
            <span>Default live broadcast duration:</span>
            <select
              value={broadcastDuration}
              onChange={(e) => onBroadcastDurationChange?.(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="not limited">not limited</option>
              <option value="30 min">30 min</option>
              <option value="1 hour">1 hour</option>
              <option value="2 hours">2 hours</option>
            </select>
          </label>

          <label className="text-sm text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Compatibility mode:</span>
            <button
              onClick={() => setCompatibility(!compatibility)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                compatibility ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  compatibility ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('1x1')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '1x1' ? 'bg-gray-200' : ''}`}
            title="1x1 View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('2x2')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '2x2' ? 'bg-gray-200' : ''}`}
            title="2x2 View"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('3x3')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '3x3' ? 'bg-gray-200' : ''}`}
            title="3x3 View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('4x4')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '4x4' ? 'bg-gray-200' : ''}`}
            title="4x4 View"
          >
            <LayoutGrid className="w-6 h-6" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Players Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={`grid ${getGridClass()} gap-4 h-full`}>
          {displayStreams.length > 0 ? (
            displayStreams.map((stream, index) => {
              const videoId = `video-${stream.device.imei}-${stream.channel}`;
              const deviceName = stream.device.deviceName || stream.device.deviceModel || `Device-${stream.device.imei?.slice(-4)}`;

              return (
                <div
                  key={videoId}
                  className="relative bg-black rounded-lg overflow-hidden shadow-lg group aspect-video"
                >
                  {/* EasyPlayer Component */}
                  <EasyPlayer
                    videoUrl={stream.hlsUrl}
                    isLive={true}
                    autoplay={true}
                    muted={true}
                  />

                  {/* Hover Controls / Info */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                      <div className="flex items-center justify-between text-white text-sm">
                        <div>
                          <div className="font-medium">{deviceName} - CH{stream.channel}</div>
                          <div className="text-xs opacity-75">Live</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            Array.from({ length: getVisiblePlayers() }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg aspect-video flex items-center justify-center"
              >
                <div className="text-center text-gray-400">
                   <p className="text-sm">No stream selected</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveViewPlayer;
