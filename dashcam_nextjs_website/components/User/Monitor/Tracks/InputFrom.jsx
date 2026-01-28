'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import apiService from '@/services/api';
import DateRangePickerModal from './DateRangePickerModal';
import { addDays, formatDateTimeLikeTracksolid, startOfDay, endOfDay } from './dateUtils';

const PositionFilter = ({ onTrackDataChange }) => {
  const [selectedDevice, setSelectedDevice] = useState('');
  const [positionType, setPositionType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickSelect, setQuickSelect] = useState('Last 3 days');
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [showQuickSelectDropdown, setShowQuickSelectDropdown] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [trackSummary, setTrackSummary] = useState(null);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackPoints, setTrackPoints] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const positionTypes = ['All', 'WiFi', 'GPS', 'Bluetooth'];
  const quickSelectOptions = [
    'Customize',
    'Today',
    'Yesterday',
    'Last 3 days',
    'This week',
    'Last Week',
    'This month',
    'Last Month'
  ];

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const res = await apiService.getUserDevices({ limit: 100 });
        setDevices(res?.data || []);
      } catch {
        setDevices([]);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
    
    // Set default date range (Last 3 days)
    const now = new Date();
    const start = addDays(now, -2);
    setStartDate(formatDateTimeLikeTracksolid(startOfDay(start), '00:00:00'));
    setEndDate(formatDateTimeLikeTracksolid(endOfDay(now), '23:59:59'));
  }, []);

  const buildIsoRange = () => {
    // Expect user to input `YYYY-MM-DD HH:mm:ss` (same as Tracksolid)
    const normalize = (value, fallbackStart) => {
      if (!value) return fallbackStart;
      // Replace space with 'T' to make it ISO-like
      const isoLike = value.replace(' ', 'T');
      const d = new Date(isoLike);
      if (Number.isNaN(d.getTime())) return fallbackStart;
      return d.toISOString();
    };

    const now = new Date();
    const defaultEnd = now.toISOString();
    const defaultStart = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();

    return {
      startIso: normalize(startDate, defaultStart),
      endIso: normalize(endDate, defaultEnd),
    };
  };

  const applyQuickSelect = (option) => {
    const now = new Date();
    let start = null;
    let end = null;

    if (option === 'Today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (option === 'Yesterday') {
      const y = addDays(now, -1);
      start = startOfDay(y);
      end = endOfDay(y);
    } else if (option === 'Last 3 days') {
      const s = addDays(now, -2);
      start = startOfDay(s);
      end = endOfDay(now);
    } else if (option === 'Customize') {
      // do nothing; user will open calendar
      setCalendarOpen(true);
      return;
    } else {
      // fallback: last 3 days
      const s = addDays(now, -2);
      start = startOfDay(s);
      end = endOfDay(now);
    }

    setStartDate(formatDateTimeLikeTracksolid(start, '00:00:00'));
    setEndDate(formatDateTimeLikeTracksolid(end, '23:59:59'));
  };

  const handleSearch = async () => {
    try {
      setTrackError('');
      setTrackSummary(null);

      if (!selectedDevice) {
        setTrackError('Please select a device');
        return;
      }

      const { startIso, endIso } = buildIsoRange();

      setLoadingTrack(true);
      const response = await apiService.getUserTrack({
        imei: selectedDevice,
        startTime: startIso,
        endTime: endIso,
        // Only send positionType if it's not "All"
        ...(positionType && positionType !== 'All' ? { positionType } : {}),
      });

      if (response && response.success && response.data) {
        setTrackSummary(response.data.summary);
        const points = response.data.points || [];
        setTrackPoints(points);
        // Pass track data to parent component
        if (onTrackDataChange) {
          onTrackDataChange({
            points,
            summary: response.data.summary,
            device: response.data.device,
          });
        }
      } else {
        setTrackSummary(null);
        setTrackPoints([]);
        setTrackError('No track data available for this range');
        // Clear track data in parent
        if (onTrackDataChange) {
          onTrackDataChange({ points: [], summary: null, device: null });
        }
      }
    } catch (err) {
      setTrackSummary(null);
      setTrackPoints([]);
      setTrackError(err.message || 'Failed to load track data');
      // Clear track data in parent on error
      if (onTrackDataChange) {
        onTrackDataChange({ points: [], summary: null, device: null });
      }
    } finally {
      setLoadingTrack(false);
    }
  };

  const handleReset = () => {
    setSelectedDevice('');
    setPositionType('All');
    setStartDate('');
    setEndDate('');
    setQuickSelect('Last 3 days');
    setTrackSummary(null);
    setTrackError('');
    setTrackPoints([]);
    // Clear track data in parent
    if (onTrackDataChange) {
      onTrackDataChange({ points: [], summary: null, device: null });
    }
  };

  return (
    <div className="h-full w-full bg-white overflow-x-hidden flex flex-col">

      {/* Header */}
      <div className="px-4 py-4 border-b">
        <h2 className="text-lg font-semibold text-black">Information</h2>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto">

        {/* Select Device */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Select Device
          </label>
          <div className="relative">
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={loadingDevices}
              className="
                w-full px-3 py-2 border rounded-md text-sm
                text-black placeholder-gray-500
                disabled:text-gray-500 disabled:placeholder-gray-400
                bg-white appearance-none
                focus:outline-none focus:ring-1 focus:ring-black
              "
            >
              <option value="">
                Select device
              </option>
              {devices.map((d) => (
                <option key={d.imei} value={d.imei}>
                  {d.deviceName || d.imei}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          </div>
        </div>

        {/* Position Type */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Position Type
          </label>
          <div className="relative">
            <button
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              className="
                w-full px-3 py-2 border rounded-md text-sm
                text-black bg-white flex justify-between items-center
                focus:outline-none focus:ring-1 focus:ring-black
              "
            >
              {positionType}
              <ChevronDown size={18} className="text-gray-500" />
            </button>

            {showPositionDropdown && (
              <div className="absolute z-20 w-full bg-white border rounded-md shadow mt-1">
                {positionTypes.map((t) => (
                  <div
                    key={t}
                    onClick={() => {
                      setPositionType(t);
                      setShowPositionDropdown(false);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      t === positionType
                        ? 'bg-black text-white'
                        : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Position Time */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Position Time
          </label>

          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="w-full px-3 py-2 border rounded-md text-sm text-black bg-white flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <span className="truncate">
              {startDate && endDate ? `${startDate}  -  ${endDate}` : 'Select date range'}
            </span>
            <Calendar size={18} className="text-gray-600" />
          </button>

          {/* Quick Select */}
          <div className="relative mt-3">
            <button
              onClick={() => setShowQuickSelectDropdown(!showQuickSelectDropdown)}
              className="
                w-full px-3 py-2 border rounded-md text-sm
                text-gray-700 bg-white flex justify-between items-center
                focus:outline-none focus:ring-1 focus:ring-black
              "
            >
              {quickSelect}
              <ChevronDown size={18} className="text-gray-500" />
            </button>

            {showQuickSelectDropdown && (
              <div className="absolute z-20 w-full bg-white border rounded-md shadow mt-1 max-h-56 overflow-y-auto">
                {quickSelectOptions.map((o) => (
                  <div
                    key={o}
                    onClick={() => {
                      setQuickSelect(o);
                      setShowQuickSelectDropdown(false);
                      applyQuickSelect(o);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      o === quickSelect
                        ? 'bg-black text-white'
                        : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    {o}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary / Actions */}
      <div className="px-4 py-4 border-t space-y-3">
        {trackSummary && (
          <div className="text-xs text-black bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1">
            <div className="flex justify-between">
              <span>Total Distance</span>
              <span className="font-semibold">
                {trackSummary.totalDistanceKm.toFixed(2)} km
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Speed</span>
              <span className="font-semibold">
                {trackSummary.avgSpeedKmh.toFixed(2)} km/h
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max Speed</span>
              <span className="font-semibold">
                {trackSummary.maxSpeedKmh.toFixed(2)} km/h
              </span>
            </div>
            <div className="flex justify-between">
              <span>Points</span>
              <span className="font-semibold">
                {trackSummary.pointCount}
              </span>
            </div>
          </div>
        )}

        {trackError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {trackError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loadingTrack}
            className="flex-1 bg-black text-white py-2 rounded-md disabled:bg-gray-500"
          >
            {loadingTrack ? 'Loading...' : 'Search'}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 border py-2 rounded-md text-gray-700"
          >
            Reset
          </button>
        </div>
      </div>

      <DateRangePickerModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        initialStart={startDate ? new Date(startDate.replace(' ', 'T')) : null}
        initialEnd={endDate ? new Date(endDate.replace(' ', 'T')) : null}
        onConfirm={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
          setQuickSelect('Customize');
          setCalendarOpen(false);
        }}
      />
    </div>
  );
};

export default PositionFilter;
