import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export default function EventInformationCard() {
  const [selectedModel, setSelectedModel] = useState('All models');
  const [selectedDevice, setSelectedDevice] = useState('All devices');
  const [selectedPictures, setSelectedPictures] = useState('Event pictures/videos');
  const [selectedEvents, setSelectedEvents] = useState('All events');
  const [startDate, setStartDate] = useState('2026-01-19 16:36:02');
  const [endDate, setEndDate] = useState('2026-01-26 16:36:02');
  const [activeTimeFilter, setActiveTimeFilter] = useState('last7');

  return (
    <div className="w-full bg-white">
      {/* Information Section */}
      <div className="mb-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-4">Information</h2>
        
        {/* All models dropdown */}
        <div className="mb-3">
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer"
            >
              <option>All models</option>
              <option>Model A</option>
              <option>Model B</option>
              <option>Model C</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* All devices dropdown */}
        <div>
          <div className="relative">
            <select 
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer"
            >
              <option>All devices</option>
              <option>Device 1</option>
              <option>Device 2</option>
              <option>Device 3</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Event Information Section */}
      <div className="mb-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-4">Event Information</h2>
        
        {/* Event pictures/videos dropdown */}
        <div className="mb-3">
          <div className="relative">
            <select 
              value={selectedPictures}
              onChange={(e) => setSelectedPictures(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer"
            >
              <option>Event pictures/videos</option>
              <option>Pictures only</option>
              <option>Videos only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* All events dropdown */}
        <div className="mb-3">
          <div className="relative">
            <select 
              value={selectedEvents}
              onChange={(e) => setSelectedEvents(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500 text-gray-700 cursor-pointer"
            >
              <option>All events</option>
              <option>Motion detection</option>
              <option>Person detection</option>
              <option>Vehicle detection</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700 text-sm"
              />
            </div>
            <span className="text-gray-500">-</span>
            <div className="relative flex-1">
              <input 
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700 text-sm"
              />
            </div>
            <button className="p-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Calendar className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTimeFilter('last7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTimeFilter === 'last7' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-blue-500 border border-blue-500 hover:bg-blue-50'
            }`}
          >
            Last 7 days
          </button>
          <button 
            onClick={() => setActiveTimeFilter('last30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTimeFilter === 'last30' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 30 days
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition shadow-sm">
          Search
        </button>
        <button className="px-6 py-3 bg-white text-blue-500 rounded-lg font-medium hover:bg-gray-50 transition border border-gray-300">
          Reset
        </button>
      </div>
    </div>
  );
}