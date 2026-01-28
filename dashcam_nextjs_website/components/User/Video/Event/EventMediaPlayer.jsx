import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function EventMediaPlayer() {
  const [activeTab, setActiveTab] = useState('all');
  const [hasEvents, setHasEvents] = useState(false);

  return (
    <div className="w-full bg-white">
      {/* Header with Filter Tabs */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-b border-gray-200">
        <button className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Clean unread
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'unread' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
          <button 
            onClick={() => setActiveTab('read')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'read' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!hasEvents && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          {/* Illustration */}
          <div className="relative mb-6">
            {/* Clouds */}
            <svg className="absolute -top-12 -left-16 w-16 h-10 text-blue-100" viewBox="0 0 64 40" fill="currentColor">
              <ellipse cx="32" cy="20" rx="32" ry="20" opacity="0.6"/>
            </svg>
            <svg className="absolute -top-8 right-16 w-20 h-12 text-blue-100" viewBox="0 0 80 48" fill="currentColor">
              <ellipse cx="40" cy="24" rx="40" ry="24" opacity="0.4"/>
            </svg>

            {/* Main illustration container */}
            <div className="relative">
              {/* Person sitting hugging knees */}
              <svg className="w-32 h-32 relative z-10" viewBox="0 0 128 128" fill="none">
                {/* Head */}
                <circle cx="40" cy="30" r="12" fill="#2D3748"/>
                <circle cx="40" cy="33" r="14" fill="#FED7D7"/>
                
                {/* Body - shirt (green) */}
                <ellipse cx="40" cy="55" rx="14" ry="18" fill="#48BB78"/>
                
                {/* Arms hugging knees */}
                <rect x="26" y="50" width="8" height="20" rx="4" fill="#48BB78"/>
                <rect x="44" y="50" width="8" height="20" rx="4" fill="#48BB78"/>
                
                {/* Legs bent (hugging position) */}
                <rect x="32" y="65" width="7" height="18" rx="3" fill="#3182CE" transform="rotate(-20 35.5 74)"/>
                <rect x="41" y="65" width="7" height="18" rx="3" fill="#2C5282" transform="rotate(20 44.5 74)"/>
                
                {/* Knees */}
                <circle cx="35" cy="75" r="6" fill="#3182CE"/>
                <circle cx="45" cy="75" r="6" fill="#2C5282"/>
                
                {/* Thinking bubble with confused line */}
                <circle cx="28" cy="20" r="3" fill="#BEE3F8" opacity="0.6"/>
                <circle cx="24" cy="17" r="2" fill="#BEE3F8" opacity="0.4"/>
                <path d="M 20 10 Q 18 7 20 5 Q 24 3 28 5 Q 30 7 28 10 Z" fill="#BEE3F8" opacity="0.6"/>
                <path d="M 22 8 Q 24 6 26 8 Q 24 10 22 8" stroke="#3182CE" strokeWidth="1.5" opacity="0.6" fill="none"/>
              </svg>

              {/* Large video file icon */}
              <div className="absolute top-0 left-20 w-48 h-48">
                <svg viewBox="0 0 200 200" fill="none">
                  {/* File background */}
                  <path d="M40 20 L130 20 L160 50 L160 180 L40 180 Z" fill="#BFDBFE"/>
                  <path d="M130 20 L130 50 L160 50" fill="#93C5FD"/>
                  
                  {/* Video player icon */}
                  <rect x="70" y="70" width="60" height="45" rx="2" fill="white"/>
                  <path d="M 70 75 L 130 75 L 125 70 L 75 70 Z" fill="#E5E7EB"/>
                  <path d="M 90 85 L 110 97 L 90 109 Z" fill="#93C5FD"/>
                </svg>
              </div>

              {/* Film reel */}
              <div className="absolute bottom-0 right-0 w-24 h-24">
                <svg viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="40" fill="#DBEAFE" opacity="0.6"/>
                  <circle cx="50" cy="50" r="30" fill="#BFDBFE" opacity="0.8"/>
                  <circle cx="50" cy="30" r="6" fill="white"/>
                  <circle cx="65" cy="42" r="6" fill="white"/>
                  <circle cx="65" cy="58" r="6" fill="white"/>
                  <circle cx="50" cy="70" r="6" fill="white"/>
                  <circle cx="35" cy="58" r="6" fill="white"/>
                  <circle cx="35" cy="42" r="6" fill="white"/>
                </svg>
              </div>

              {/* Small plant */}
              <div className="absolute bottom-8 right-4">
                <svg className="w-8 h-10" viewBox="0 0 32 40" fill="none">
                  <rect x="12" y="24" width="8" height="16" rx="1" fill="#D97706"/>
                  <ellipse cx="16" cy="24" rx="10" ry="4" fill="#F59E0B"/>
                  <path d="M 16 24 Q 12 20 14 16 Q 16 14 18 16 Q 20 20 16 24" fill="#86EFAC"/>
                  <path d="M 16 24 Q 20 20 18 16 Q 16 14 14 16 Q 12 20 16 24" fill="#4ADE80"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Text */}
          <p className="text-gray-400 text-base">Event file/data not found</p>
        </div>
      )}

      {/* If events exist, show grid here */}
      {hasEvents && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {/* Event cards would go here */}
        </div>
      )}
    </div>
  );
}