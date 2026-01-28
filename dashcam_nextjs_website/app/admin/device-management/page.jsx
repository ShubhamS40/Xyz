'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

const loadDevices = async (setDevices, setUseMockData, setLoading) => {
  try {
    setLoading(true);
    const response = await apiService.getDevices();
    if (response.success && response.data && response.data.length > 0) {
      setDevices(response.data);
      setUseMockData(false);
    } else {
      setDevices([]);
      setUseMockData(false);
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    setDevices([]);
    setUseMockData(false);
  } finally {
    setLoading(false);
  }
};

export default function DeviceManagementPage() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const fetchDevices = useCallback(() => {
    loadDevices(setDevices, setUseMockData, setLoading);
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.status === 'active').length,
    inactive: devices.filter((d) => d.status === 'inactive').length,
  };

  return (
    <AdminLayout title="Device Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatMiniCard label="Total" value={stats.total} />
          <StatMiniCard label="Active" value={stats.active} tone="success" />
          <StatMiniCard label="Inactive" value={stats.inactive} tone="danger" />
        </div>

        <div className="rounded-2xl border border-[#282424] bg-[#111111] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#050505] border-b border-[#282424]">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Device Name
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    IMEI
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Server IP
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Server Port
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Assigned To Type
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Assigned To ID
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Assigned To Name
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Activation Date
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-300 uppercase tracking-[0.14em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-[#111827]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-6 py-12 text-center text-gray-500 text-sm"
                    >
                      <div className="inline-flex items-center gap-3">
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                        <span>Loading devices…</span>
                      </div>
                    </td>
                  </tr>
                ) : devices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-6 py-12 text-center text-gray-500 text-sm"
                    >
                      No devices found.
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => {
                    const formatDate = (date) => {
                      if (!date) return '—';
                      try {
                        return new Date(date).toLocaleString();
                      } catch {
                        return '—';
                      }
                    };

                    const formatActivationDate = (date) => {
                      if (!date) return '—';
                      try {
                        return new Date(date).toLocaleDateString();
                      } catch {
                        return '—';
                      }
                    };

                    return (
                      <tr
                        key={device.id || device.imei}
                        className="hover:bg-[#050816] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {device.deviceName || `Device-${device.imei?.slice(-4) || ''}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                          {device.imei}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-200 font-medium">
                          {device.deviceModel || 'JC261'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                              device.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                                : 'bg-gray-800 text-gray-300 border-gray-700'
                            }`}
                          >
                            {device.status || 'inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.ipAddress || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.serverIp || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.serverPort || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {formatDate(device.lastSeen)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.companyName || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.assignedToType || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.assignedToId || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {device.assignedToName || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-xs">
                          {formatActivationDate(device.activationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                          <button
                            className="text-xs font-semibold text-gray-300 hover:text-white hover:underline"
                            onClick={() =>
                              router.push(
                                `/admin/device-management/edit-device?imei=${encodeURIComponent(
                                  device.imei,
                                )}`,
                              )
                            }
                          >
                            Edit
                          </button>
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
    </AdminLayout>
  );
}

function StatMiniCard({ label, value, tone }) {
  const toneClasses =
    tone === 'success'
      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40'
      : tone === 'danger'
      ? 'text-red-300 bg-red-500/10 border-red-500/40'
      : tone === 'primary'
      ? 'text-blue-300 bg-blue-500/10 border-blue-500/40'
      : tone === 'warning'
      ? 'text-amber-300 bg-amber-500/10 border-amber-500/40'
      : 'text-gray-200 bg-gray-800 border-gray-700';

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#070b12] px-4 py-3 shadow-sm">
      <p className="text-[11px] text-gray-400 mb-1 uppercase tracking-[0.14em]">
        {label}
      </p>
      <div
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${toneClasses}`}
      >
        {value}
      </div>
    </div>
  );
}
