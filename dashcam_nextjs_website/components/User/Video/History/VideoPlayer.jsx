import React from 'react';
import EasyPlayer from '../Live/EasyPlayer';

export default function VideoPlayer({ url }) {
  return (
    <div className="w-full max-w-6xl mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-2xl h-[600px]">
      {url ? (
        <EasyPlayer 
          videoUrl={url}
          isLive={false}
          autoplay={true}
          muted={false}
        />
      ) : (
        <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center opacity-60 mx-auto mb-4">
              <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 text-lg">Select a video to play</p>
          </div>
        </div>
      )}
    </div>
  );
}
