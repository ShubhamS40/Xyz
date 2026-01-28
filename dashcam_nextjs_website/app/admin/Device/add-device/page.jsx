'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

export default function AddDevicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceName: '',
    imei: '',
    deviceModel: '',
    status: 'inactive',
    ipAddress: '',
    serverIp: '',
    serverPort: '',
    lastSeen: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.imei) {
      setError('IMEI is required');
      return;
    }

    try {
      setLoading(true);
      await apiService.addDevice({
        imei: formData.imei,
        deviceName: formData.deviceName || `Device-${formData.imei.slice(-4)}`,
        deviceModel: formData.deviceModel || 'JC261',
        status: formData.status,
        ipAddress: formData.ipAddress || null,
        serverIp: formData.serverIp || null,
        serverPort: formData.serverPort ? parseInt(formData.serverPort) : null,
        lastSeen: formData.lastSeen ? new Date(formData.lastSeen).toISOString() : null,
      });
      router.push('/admin/device-management');
    } catch (err) {
      setError(err.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Add device">
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Add new device
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Register a dashcam or tracker by IMEI. You can update status and
              assignment later.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Device name
              </label>
              <input
                type="text"
                value={formData.deviceName}
                onChange={(e) =>
                  setFormData({ ...formData, deviceName: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="Optional friendly name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                IMEI number
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) =>
                  setFormData({ ...formData, imei: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="15 digit IMEI"
                required
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device model
                </label>
                <input
                  type="text"
                  value={formData.deviceModel}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceModel: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g. JC261"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  IP Address
                </label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, ipAddress: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g., 192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Server IP
                </label>
                <input
                  type="text"
                  value={formData.serverIp}
                  onChange={(e) =>
                    setFormData({ ...formData, serverIp: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g., 192.168.1.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Server Port
                </label>
                <input
                  type="number"
                  value={formData.serverPort}
                  onChange={(e) =>
                    setFormData({ ...formData, serverPort: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g., 8080"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Last Seen
                </label>
                <input
                  type="datetime-local"
                  value={formData.lastSeen}
                  onChange={(e) =>
                    setFormData({ ...formData, lastSeen: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin/device-management')}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.imei || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : 'Add device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
