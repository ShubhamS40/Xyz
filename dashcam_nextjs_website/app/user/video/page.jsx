'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import Sidebar from '@/components/User/DashboardComponent/Sidebar/Sidebar';
import EventInformationCard from '@/components/User/Video/Event/EventInformationCard';
import EventMediaPlayer from '@/components/User/Video/Event/EventMediaPlayer';
import LiveViewPlayer from '@/components/User/Video/Live/LiveViewPlayer';
import DeviceList from '@/components/User/Video/Live/DeviceList';
import InputFormVideoRecording from '@/components/User/Video/History/InputFromVideoRecording';
import VideoPlayer from '@/components/User/Video/History/VideoPlayer';
import apiService from '@/services/api';

export default function VideoPage() {
  const [activeTab, setActiveTab] = useState('Video');
  const [activeSidebarItem, setActiveSidebarItem] = useState('event');
  const [dashcamDevices, setDashcamDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [broadcastDuration, setBroadcastDuration] = useState('not limited');
  const prevLiveRef = useRef(false);

  useEffect(() => {
    const loadDashcamDevices = async () => {
      try {
        setLoading(true);
        const response = await apiService.getUserDevices({ 
          category: 'dashcam',
          limit: 100 
        });
        if (response.success && response.data) {
          setDashcamDevices(response.data);
        } else {
          setDashcamDevices([]);
        }
      } catch (err) {
        console.error('Error loading dashcam devices:', err);
        setDashcamDevices([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashcamDevices();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const stopStreamsForDevices = async (imeis) => {
    const seen = new Set();
    for (const imei of imeis) {
      if (seen.has(imei)) continue;
      seen.add(imei);
      try {
        await apiService.stopVideoStream(imei);
      } catch (e) {
        console.warn('Error stopping stream for', imei, e);
      }
    }
  };

  useEffect(() => {
    const isLive = activeSidebarItem === 'live';
    if (prevLiveRef.current && !isLive && selectedStreams.length > 0) {
      const imeis = [...new Set(selectedStreams.map((s) => s.device.imei).filter(Boolean))];
      stopStreamsForDevices(imeis);
      setSelectedStreams([]);
    }
    prevLiveRef.current = isLive;
  }, [activeSidebarItem, selectedStreams]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (activeSidebarItem !== 'live' || selectedStreams.length === 0) return;
      const imeis = [...new Set(selectedStreams.map((s) => s.device.imei).filter(Boolean))];
      const base = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
      const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
      imeis.forEach((imei) => {
        fetch(`${base}/api/devices/${imei}/stop-rtmp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: '{}',
          keepalive: true
        }).catch(() => {});
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeSidebarItem, selectedStreams]);

  const handleChannelDeselect = (imei) => {
    setSelectedStreams((prev) => prev.filter((s) => s.device.imei !== imei));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeItem={activeSidebarItem}
          onItemChange={setActiveSidebarItem}
          activeTab={activeTab}
        />
        <div className="flex flex-1 overflow-hidden bg-white">
          {activeSidebarItem === 'event' && (
            <>
              <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-6">
                <EventInformationCard />
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-6">
                <EventMediaPlayer />
              </div>
            </>
          )}
          {activeSidebarItem === 'live' && (
            <>
              <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-6">
                <DeviceList 
                  devices={dashcamDevices} 
                  loading={loading}
                  broadcastDuration={broadcastDuration}
                  onChannelSelect={(streamInfo) => {
                    setSelectedStreams(prev => {
                      const filtered = prev.filter(s => 
                        !(s.device.imei === streamInfo.device.imei && s.channel === streamInfo.channel)
                      );
                      return [...filtered, streamInfo];
                    });
                  }}
                  onChannelDeselect={handleChannelDeselect}
                />
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-6">
                <LiveViewPlayer 
                  streams={selectedStreams} 
                  broadcastDuration={broadcastDuration}
                  onBroadcastDurationChange={setBroadcastDuration}
                />
              </div>
            </>
          )}
          {activeSidebarItem === 'history' && (
            <>
              <div className="w-80 border-r border-gray-200 overflow-y-auto bg-white p-6">
                <InputFormVideoRecording devices={dashcamDevices} loading={loading} />
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-6">
                <VideoPlayer />
              </div>
            </>
          )}
          {activeSidebarItem === 'setting' && (
            <div className="flex-1 overflow-y-auto bg-white p-6">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Video Settings</h2>
                <p className="text-gray-600">Settings page coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}