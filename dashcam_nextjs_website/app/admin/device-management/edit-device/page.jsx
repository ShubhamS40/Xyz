'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

export default function EditDevicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imei = searchParams.get('imei');
  const mode = searchParams.get('mode');
  const isViewMode = mode === 'view';

  const [formData, setFormData] = useState({
    deviceName: '',
    imei: '',
    deviceModel: '',
    status: 'inactive',
    ipAddress: '',
    serverIp: '',
    serverPort: '',
    lastSeen: '',
    companyName: '',
    assignedToType: '',
    assignedToId: '',
    assignedToName: '',
    activationDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!imei) {
      setError('Missing IMEI in URL');
      setLoading(false);
      return;
    }

    const loadDevice = async () => {
      try {
        setLoading(true);
        const response = await apiService.getDeviceByIMEI(imei);
        const device = response?.data || response;

        setFormData({
          deviceName: device.deviceName || '',
          imei: device.imei || '',
          deviceModel: device.deviceModel || '',
          status: device.status || 'inactive',
          ipAddress: device.ipAddress || '',
          serverIp: device.serverIp || '',
          serverPort: device.serverPort || '',
          lastSeen: device.lastSeen ? new Date(device.lastSeen).toISOString().slice(0, 16) : '',
          companyName: device.companyName || '',
          assignedToType: device.assignedToType || '',
          assignedToId: device.assignedToId || '',
          assignedToName: device.assignedToName || '',
          activationDate: device.activationDate ? new Date(device.activationDate).toISOString().slice(0, 10) : '',
        });
      } catch (err) {
        setError(err.message || 'Failed to load device');
      } finally {
        setLoading(false);
      }
    };

    loadDevice();
  }, [imei]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.imei) return;

    try {
      setSaving(true);
      setError('');

      // Find device ID first
      const deviceResponse = await apiService.getDeviceByIMEI(formData.imei);
      const device = deviceResponse?.data || deviceResponse;
      
      if (!device || !device.id) {
        throw new Error('Device not found');
      }

      // Update device with all fields
      await apiService.updateDevice(device.id, {
        deviceName: formData.deviceName || null,
        deviceModel: formData.deviceModel || 'JC261',
        status: formData.status,
        ipAddress: formData.ipAddress || null,
        serverIp: formData.serverIp || null,
        serverPort: formData.serverPort ? parseInt(formData.serverPort) : null,
        lastSeen: formData.lastSeen ? new Date(formData.lastSeen).toISOString() : null,
      });

      // Also update inventory if inventory fields are present
      try {
        // Get inventory by IMEI - fetch all inventory and find by IMEI
        const inventoryResponse = await apiService.getDeviceInventory({ search: formData.imei });
        if (inventoryResponse.success && inventoryResponse.data) {
          const inventoryItem = inventoryResponse.data.find(item => item.imei === formData.imei);
          if (inventoryItem && inventoryItem.id) {
            await apiService.updateDeviceInventory(inventoryItem.id, {
              companyName: formData.companyName || null,
              assignedToType: formData.assignedToType || null,
              assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : null,
              assignedToName: formData.assignedToName || null,
              activationDate: formData.activationDate ? new Date(formData.activationDate).toISOString() : null,
            });
          }
        }
      } catch (inventoryErr) {
        // If inventory update fails, log but don't fail the whole operation
        console.warn('Failed to update inventory:', inventoryErr);
      }

      router.push('/admin/device-management');
    } catch (err) {
      setError(err.message || 'Failed to update device');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={isViewMode ? 'View device' : 'Edit device'}>
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {isViewMode ? 'View device' : 'Edit device'}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {isViewMode
                ? 'Review all information for this device.'
                : 'Update all information for this device.'}
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-gray-500">
              Loading device details…
            </div>
          ) : error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Device name
                </label>
                <input
                  type="text"
                  value={formData.deviceName}
                  onChange={
                    isViewMode
                      ? undefined
                      : (e) =>
                          setFormData({
                            ...formData,
                            deviceName: e.target.value,
                          })
                  }
                  disabled={isViewMode}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  IMEI number
                </label>
                <input
                  type="text"
                  value={formData.imei}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
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
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              deviceModel: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              status: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
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
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              ipAddress: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    placeholder="e.g., 192.168.1.100"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Server IP
                  </label>
                  <input
                    type="text"
                    value={formData.serverIp}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              serverIp: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    placeholder="e.g., 192.168.1.1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
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
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              serverPort: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    placeholder="e.g., 8080"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Last Seen
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.lastSeen}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              lastSeen: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={
                    isViewMode
                      ? undefined
                      : (e) =>
                          setFormData({
                            ...formData,
                            companyName: e.target.value,
                          })
                  }
                  disabled={isViewMode}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Assigned To Type
                  </label>
                  <select
                    value={formData.assignedToType}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              assignedToType: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">None</option>
                    <option value="fleet">Fleet</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Assigned To ID
                  </label>
                  <input
                    type="number"
                    value={formData.assignedToId}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              assignedToId: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Assigned To Name
                  </label>
                  <input
                    type="text"
                    value={formData.assignedToName}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              assignedToName: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Activation Date
                  </label>
                  <input
                    type="date"
                    value={formData.activationDate}
                    onChange={
                      isViewMode
                        ? undefined
                        : (e) =>
                            setFormData({
                              ...formData,
                              activationDate: e.target.value,
                            })
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/device-management')}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
                {!isViewMode && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
