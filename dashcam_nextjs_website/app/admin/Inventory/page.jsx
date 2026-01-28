'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

function DeviceInventoryTable() {
  const router = useRouter();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });

  const loadInventory = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      // Fetch only unassigned devices from inventory (status='unassigned' by default)
      // Assigned devices are in device management, not inventory
      const allInventoryResponse = await apiService.getDeviceInventory({ status: 'unassigned', limit: 1000 });
      const paginatedResponse = await apiService.getDeviceInventory({ status: 'unassigned', page, limit: 10 });
      
      if (paginatedResponse.success && paginatedResponse.data) {
        // Calculate quantity for each model from all unassigned inventory
        const modelQuantityMap = {};
        if (allInventoryResponse.success && allInventoryResponse.data) {
          allInventoryResponse.data.forEach(item => {
            const model = item.deviceModel || '';
            modelQuantityMap[model] = (modelQuantityMap[model] || 0) + 1;
          });
        }
        
        // Add quantity to each item
        const inventoryWithQuantity = paginatedResponse.data.map(item => ({
          ...item,
          quantity: modelQuantityMap[item.deviceModel || ''] || 1
        }));
        
        setInventory(inventoryWithQuantity);
        if (paginatedResponse.pagination) {
          setPagination(paginatedResponse.pagination);
        }
      } else {
        setInventory([]);
      }
    } catch (error) {
      console.error('Error fetching device inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Calculate quantity by grouping devices by model
  const getQuantityByModel = (model) => {
    return inventory.filter(item => item.deviceModel === model).length;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return '—';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/60 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-medium text-white">Device Inventory</h2>
          <p className="text-[11px] text-neutral-500">
            Manage dashcams, OBD trackers and other hardware. Each device has a unique IMEI.
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/Inventory/add-device')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold shadow-sm hover:bg-neutral-200 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Device
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-left border-t border-neutral-800">
          <thead className="bg-black/80 text-neutral-400 uppercase tracking-[0.16em]">
            <tr>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">IMEI</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-gray-500 text-sm"
                >
                  <div className="inline-flex items-center gap-3">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                    <span>Loading inventory…</span>
                  </div>
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-gray-500 text-sm"
                >
                  No inventory items found.
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-white/80 font-medium">{item.deviceModel || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/40 text-xs font-semibold">
                      {item.quantity || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{item.imei || '—'}</td>
                  <td className="px-4 py-3 text-neutral-300">{item.category || '—'}</td>
                  <td className="px-4 py-3 text-neutral-300">{item.vendor || '—'}</td>
              <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full border text-[10px] uppercase tracking-[0.16em] ${
                        item.status === 'assigned'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/40'
                          : item.status === 'unassigned'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-700 text-neutral-300 border-neutral-600'
                      }`}
                    >
                      {item.status || 'unassigned'}
                </span>
              </td>
                  <td className="px-4 py-3 text-neutral-300">{formatCurrency(item.unitPrice)}</td>
            </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadInventory(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage || loading}
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-neutral-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => loadInventory(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <AdminLayout title="Inventory Management">
      <DeviceInventoryTable />
    </AdminLayout>
  );
}
