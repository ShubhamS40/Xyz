import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, MoreVertical } from 'lucide-react';

export default function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(86400); // 24 hours in seconds
  const [selectionPeriod, setSelectionPeriod] = useState('24h');

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeMarkers = Array.from({ length: 13 }, (_, i) => i * 2);

  return (
    <div className="w-full max-w-6xl mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      {/* Video Display Area */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        {/* Video Icon Placeholder */}
        <div className="relative">
          <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center opacity-60">
            <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-400 ml-1" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-600 rounded opacity-60"></div>
        </div>

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 bg-black bg-opacity-50 rounded hover:bg-opacity-70 transition">
            <Settings className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 bg-black bg-opacity-50 rounded hover:bg-opacity-70 transition">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
        {/* Selection Period and Task Center */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">selection period:</span>
            <select 
              value={selectionPeriod}
              onChange={(e) => setSelectionPeriod(e.target.value)}
              className="bg-gray-700 text-white text-sm px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="12h">12h</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
            </select>
          </div>
          
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Task center
          </button>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline markers */}
          <div className="flex justify-between items-center mb-2">
            <button className="p-1 text-gray-500 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex-1 flex justify-between px-4">
              {timeMarkers.map((hour) => (
                <div key={hour} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-gray-600 mb-1"></div>
                  <span className="text-xs text-gray-500">{hour.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            <button className="p-1 text-gray-500 hover:text-white transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1 bg-gray-700 rounded-full cursor-pointer group mx-12">
            <div 
              className="absolute h-full bg-blue-500 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            ></div>
            <div 
              className="absolute w-3 h-3 bg-white rounded-full shadow-lg transform -translate-y-1/3 opacity-0 group-hover:opacity-100 transition"
              style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -33%)' }}
            ></div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
            
            <span className="text-gray-300 text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-gray-700 rounded transition"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            <button className="p-2 hover:bg-gray-700 rounded transition">
              <Maximize className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}