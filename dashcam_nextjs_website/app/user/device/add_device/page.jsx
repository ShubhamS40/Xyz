'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import Sidebar from '@/components/User/DashboardComponent/Sidebar/Sidebar';
import apiService from '@/services/api';

export default function UserAddDevicePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Device');
  const [activeSidebarItem, setActiveSidebarItem] = useState('add-device');
  const [formData, setFormData] = useState({
    deviceName: '',
    deviceModel: '',
    imei: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.imei) {
      setError('IMEI is required');
      return;
    }

    try {
      setLoading(true);
      await apiService.addUserDevice({
        imei: formData.imei,
        deviceName:
          formData.deviceName || `Device-${formData.imei.slice(-4)}`,
      });
      setSuccess('Device added successfully and removed from inventory');
      setFormData({
        deviceName: '',
        deviceModel: '',
        imei: '',
      });
      setTimeout(() => {
      router.push('/user/device/view_all_device');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to add device');
    } finally {
      setLoading(false);
    }
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
          <div className="max-w-xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Add Device
            </h1>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device Name
                </label>
                <input
                  type="text"
                  value={formData.deviceName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deviceName: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Optional friendly name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device Model
                </label>
                <input
                  type="text"
                  value={formData.deviceModel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deviceModel: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="e.g. JC261"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  IMEI Number
                </label>
                <input
                  type="text"
                  value={formData.imei}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      imei: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Enter 15-digit IMEI"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/user/device/view_all_device')}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving…' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

