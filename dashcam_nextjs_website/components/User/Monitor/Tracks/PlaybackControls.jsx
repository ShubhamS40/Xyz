'use client';

import React from 'react';
import { Pause, Play, Gauge } from 'lucide-react';

export default function PlaybackControls({
  isPlaying,
  speed,
  onTogglePlay,
  onSpeedChange,
  onStop,
}) {
  return (
    <div className="absolute left-1/2 top-3 -translate-x-1/2 z-[1200] bg-white/95 backdrop-blur border border-gray-200 shadow rounded-xl px-3 py-2 flex items-center gap-3">
      <button
        type="button"
        onClick={onTogglePlay}
        className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-[1px]" />}
      </button>

      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Gauge size={18} className="text-gray-500" />
        <select
          className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
          value={String(speed)}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        >
          {[0.25, 0.5, 1, 2, 4, 8].map((s) => (
            <option key={s} value={String(s)}>{s}x</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
      >
        Reset
      </button>
    </div>
  );
}

