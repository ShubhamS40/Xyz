'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Smartphone, Users, CheckCircle2, PowerOff, Package } from 'lucide-react';
import AdminLayout from '@/components/Admin/AdminLayout';
import apiService from '@/services/api';

const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const loadDashboardData = async (
  setStats,
  setRecentActivities,
  setUseMockData,
  setLoading,
) => {
  try {
    setLoading(true);
    // Fetch from device_inventory table (this is where devices are added)
    const inventoryResponse = await apiService.getDeviceInventory({ limit: 1000 });
    
    if (inventoryResponse.success && inventoryResponse.data && inventoryResponse.data.length > 0) {
      const inventory = inventoryResponse.data;
      const totalDevices = inventory.length;
      
      // Count unassigned devices (status === 'unassigned')
      const totalUnassignDevices = inventory.filter((d) => d.status === 'unassigned').length;
      const totalAssignDevices = inventory.filter((d) => d.status === 'assigned').length;
      
      // For active/inactive, we need to check devices table too
      // But for now, let's use inventory status
      const totalActiveDevices = inventory.filter((d) => d.status === 'assigned').length;
      const totalInactiveDevices = inventory.filter((d) => d.status === 'unassigned').length;

      const recent = inventory
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((item) => ({
          deviceName: `${item.deviceModel}-${item.imei?.slice(-4) || ''}`,
          imei: item.imei,
          model: item.deviceModel,
          time: formatTimeAgo(new Date(item.updatedAt || item.createdAt)),
          action: item.status === 'assigned' ? 'Assigned' : 'Added',
        }));

      setStats({
        totalDevices,
        totalUsers: 0,
        totalActiveDevices,
        totalInactiveDevices,
        totalUnassignDevices,
        totalAssignDevices,
      });
      setRecentActivities(recent);
      setUseMockData(false);
    } else {
      // No devices found - show empty state
      setStats({
        totalDevices: 0,
        totalUsers: 0,
        totalActiveDevices: 0,
        totalInactiveDevices: 0,
        totalUnassignDevices: 0,
        totalAssignDevices: 0,
      });
      setRecentActivities([]);
      setUseMockData(false);
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // On error, show empty state instead of mock data
    setStats({
      totalDevices: 0,
      totalUsers: 0,
      totalActiveDevices: 0,
      totalInactiveDevices: 0,
      totalUnassignDevices: 0,
      totalAssignDevices: 0,
    });
    setRecentActivities([]);
    setUseMockData(false);
  } finally {
    setLoading(false);
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalUsers: 0,
    totalActiveDevices: 0,
    totalInactiveDevices: 0,
    totalUnassignDevices: 0,
    totalAssignDevices: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const fetchDashboardData = useCallback(() => {
    loadDashboardData(setStats, setRecentActivities, setUseMockData, setLoading);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate pie chart data
  const pieChartData = [
    { label: 'Active Devices', value: stats.totalActiveDevices, color: '#10b981' },
    { label: 'Inactive Devices', value: stats.totalInactiveDevices, color: '#ef4444' },
    { label: 'Assigned Devices', value: stats.totalAssignDevices, color: '#3b82f6' },
    { label: 'Unassigned Devices', value: stats.totalUnassignDevices, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const total = pieChartData.reduce((sum, item) => sum + item.value, 0) || 1;
  
  // Calculate pie chart segments
  let currentAngle = -90;
  const segments = pieChartData.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    const endAngle = currentAngle;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = 100 + 80 * Math.cos(startAngleRad);
    const y1 = 100 + 80 * Math.sin(startAngleRad);
    const x2 = 100 + 80 * Math.cos(endAngleRad);
    const y2 = 100 + 80 * Math.sin(endAngleRad);
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M 100 100`,
      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A 80 80 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `Z`
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 text-sm">Loading dashboard…</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Devices" value={stats.totalDevices} icon={Smartphone} />
            <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
            <StatCard label="Active Devices" value={stats.totalActiveDevices} icon={Activity} />
            <StatCard label="Inactive Devices" value={stats.totalInactiveDevices} icon={PowerOff} />
            <StatCard label="Unassigned Devices" value={stats.totalUnassignDevices} icon={Package} />
            <StatCard label="Assigned Devices" value={stats.totalAssignDevices} icon={CheckCircle2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#282424] bg-[#111111] shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#282424]">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Device analytics
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Split of active, inactive and assignment status.
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-4 flex flex-col items-center">
                <div className="relative w-64 h-64 mb-6">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {segments.map((segment, index) => (
                      <path
                        key={index}
                        d={segment.pathData}
                        fill={segment.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {stats.totalDevices}
                      </div>
                      <div className="text-xs text-gray-400">Total devices</div>
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-1.5">
                  {pieChartData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#18181b] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></span>
                          <span className="text-xs font-medium text-gray-300">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">{item.percentage}%</span>
                        <span className="font-semibold text-white">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#282424] bg-[#111111] shadow-sm hover:shadow-lg transition-all flex flex-col">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#282424]">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Recent activity
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Last few updates from your device fleet.
                  </p>
                </div>
                <button
                  onClick={() =>
                    loadDashboardData(
                      setStats,
                      setRecentActivities,
                      setUseMockData,
                      setLoading,
                    )
                  }
                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-500 hover:bg-[#0b1220] transition-colors"
                  title="Refresh"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              <div className="px-6 pb-6 pt-4 space-y-3 flex-1">
                {recentActivities.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-8">
                    No recent activities yet.
                  </div>
                ) : (
                  recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-[#111827] rounded-xl hover:bg-[#0b1220] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {activity.deviceName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {activity.imei.slice(-8)} • {activity.time}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/40">
                        {activity.action}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#070b12] shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium tracking-[0.16em] text-gray-500 uppercase">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-white">
            {value}
          </p>
        </div>
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#111827] text-white text-xl">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
