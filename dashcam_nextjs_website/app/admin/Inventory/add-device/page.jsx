'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

export default function AddInventoryDevicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceModel: '',
    imei: '',
    status: 'unassigned',
    vendor: '',
    category: 'dashcam',
    unitPrice: '',
    cameraChannels: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { deviceModel, imei, status, vendor, category, unitPrice, cameraChannels } = formData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!imei || !deviceModel || !category) {
      setError('IMEI, Device Model, and Category are required');
      return;
    }

    try {
      setLoading(true);
      await apiService.addDeviceInventory({
        deviceModel: formData.deviceModel,
        imei: formData.imei,
        status: formData.status,
        vendor: formData.vendor || null,
        category: formData.category,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        cameraChannels: category === 'dashcam' && formData.cameraChannels ? parseInt(formData.cameraChannels) : null,
      });
      router.push('/admin/Inventory');
    } catch (err) {
      setError(err.message || 'Failed to add device to inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Add Device to Inventory">
      <div className="max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Add Device to Inventory
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Add a new device to inventory. Each device must have a unique IMEI number.
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
                Device Model
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) =>
                  setFormData({ ...formData, deviceModel: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="e.g., JC261"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                IMEI Number
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                type="text"
                value={imei}
                onChange={(e) =>
                  setFormData({ ...formData, imei: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="15 digit IMEI"
                required
                maxLength={15}
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Note: Each IMEI must be unique. To add multiple devices of the same model, add them one by one with different IMEIs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Category
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value, cameraChannels: e.target.value !== 'dashcam' ? '' : formData.cameraChannels })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  required
                >
                  <option value="dashcam">Dashcam</option>
                  <option value="obd_tracker">OBD Tracker</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                </select>
              </div>
            </div>

            {category === 'dashcam' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Camera Channels
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={cameraChannels}
                  onChange={(e) =>
                    setFormData({ ...formData, cameraChannels: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Enter number of camera channels (1-4)"
                  required={category === 'dashcam'}
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Number of camera channels available (e.g., 1, 2, 3, 4)
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Vendor
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Unit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin/Inventory')}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!imei || !deviceModel || !category || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding…' : 'Add Device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
