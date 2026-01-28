'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import SettingsSidebar from '@/components/User/DashboardComponent/SettingsSidebar/SettingsSidebar';
import apiService from '@/services/api';

export default function MyProfilePage() {
  const [userInfo, setUserInfo] = useState({
    email: '',
    companyName: '',
    companyType: '',
    cellPhone: '',
    timezone: 'GMT+05:30',
    language: 'English',
    country: 'India | 91'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          window.location.href = '/user/auth/login';
          return;
        }

        const response = await apiService.getUserProfile(token);
        if (response.success && response.data) {
          setUserInfo({
            email: response.data.email || '',
            companyName: response.data.companyName || '',
            companyType: response.data.companyType || '',
            cellPhone: '',
            timezone: 'GMT+05:30',
            language: 'English',
            country: 'India | 91'
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // TODO: Implement update profile API call
    setTimeout(() => {
      setSuccess('Profile updated successfully');
      setSaving(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Navbar activeTab="Settings" onTabChange={() => {}} />
        <div className="flex flex-1 overflow-hidden">
          <SettingsSidebar />
          <div className="flex-1 overflow-auto flex items-center justify-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar activeTab="Settings" onTabChange={() => {}} />
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login Account <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userInfo.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userInfo.companyName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contacts
                </label>
                <input
                  type="text"
                  value={userInfo.companyName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cell Phone
                </label>
                <input
                  type="tel"
                  value={userInfo.cellPhone}
                  onChange={(e) => setUserInfo({ ...userInfo, cellPhone: e.target.value })}
                  placeholder="Enter Telephone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone <span className="text-red-500">*</span>
                </label>
                <select
                  value={userInfo.timezone}
                  onChange={(e) => setUserInfo({ ...userInfo, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="GMT+05:30">GMT+05:30</option>
                  <option value="GMT+00:00">GMT+00:00</option>
                  <option value="GMT-05:00">GMT-05:00</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language <span className="text-red-500">*</span>
                </label>
                <select
                  value={userInfo.language}
                  onChange={(e) => setUserInfo({ ...userInfo, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country / Region
                </label>
                <input
                  type="text"
                  value={userInfo.country}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
