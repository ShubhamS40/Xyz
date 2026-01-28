'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import Sidebar from '@/components/User/DashboardComponent/Sidebar/Sidebar';
import apiService from '@/services/api';
import { MapPin, MoreHorizontal, Edit3 } from 'lucide-react';

export default function UserViewAllDevicePage() {
  const [activeTab, setActiveTab] = useState('Device');
  const [activeSidebarItem, setActiveSidebarItem] = useState('view-all');
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiService.getUserDevices({ limit: 100 });
        if (response.success && response.data) {
          setDevices(response.data);
        } else {
          setDevices([]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load devices');
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

  const formatActivationTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  const toggleMenu = (imei) => {
    setOpenMenuFor((current) => (current === imei ? null : imei));
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
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-6xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  All Devices
                </h1>
                <p className="text-sm text-gray-500">
                  View all devices with model, IMEI, and activation time.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Device Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        IMEI Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Activation Time
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-gray-500 text-sm"
                        >
                          Loading devices…
                        </td>
                      </tr>
                    ) : devices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-gray-500 text-sm"
                        >
                          No devices found.
                        </td>
                      </tr>
                    ) : (
                      devices.map((device) => {
                        const deviceName = device.deviceName || 
                          (device.deviceModel ? `${device.deviceModel}-${device.imei?.slice(-4) || ''}` : device.imei || 'Unknown');

                        const getStatusColor = (status) => {
                          switch (status) {
                            case 'online':
                              return 'bg-green-100 text-green-800';
                            case 'offline':
                              return 'bg-gray-100 text-gray-800';
                            case 'inactive':
                              return 'bg-red-100 text-red-800';
                            default:
                              return 'bg-gray-100 text-gray-800';
                          }
                        };

                        return (
                          <tr key={device.id || device.imei}>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-sm">
                              {deviceName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                              {device.deviceModel || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                              {device.imei || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                                {device.status || 'inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                              {formatActivationTime(device.activationDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-black"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black"
                                >
                                  <MapPin className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => toggleMenu(device.imei)}
                                    className="p-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {openMenuFor === device.imei && (
                                    <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                                      <button
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        View details
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        Track location
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

