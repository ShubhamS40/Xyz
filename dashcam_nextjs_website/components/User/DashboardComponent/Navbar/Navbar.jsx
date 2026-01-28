'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '@/services/api';

export default function Navbar({ activeTab, onTabChange }) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: 'okDriver', email: 'admin@okdriver.com' });

  const notificationRef = useRef(null);
  const userRef = useRef(null);

  // Fetch user info on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('userToken');
        const email = localStorage.getItem('userEmail');
        
        if (token) {
          const response = await apiService.getUserProfile(token);
          if (response.success && response.data) {
            setUserInfo({
              name: response.data.companyName || response.data.email?.split('@')[0] || 'User',
              email: response.data.email || email || 'admin@okdriver.com'
            });
          } else if (email) {
            setUserInfo({
              name: email.split('@')[0] || 'User',
              email: email
            });
          }
        } else if (email) {
          setUserInfo({
            name: email.split('@')[0] || 'User',
            email: email
          });
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        const email = localStorage.getItem('userEmail');
        if (email) {
          setUserInfo({
            name: email.split('@')[0] || 'User',
            email: email
          });
        }
      }
    };

    fetchUserInfo();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  const handleSettings = () => {
    router.push('/setting');
    setShowUserMenu(false);
  };

  const navItems = ['Monitor', 'Report', 'Device', 'Account', 'Video', 'Fleet'];
  
  const notifications = [
    { id: 1, title: 'Device Alert', message: 'JC261-001 requires attention', time: '5m ago', unread: true },
    { id: 2, title: 'System Update', message: 'New features available', time: '1h ago', unread: true },
    { id: 3, title: 'Fleet Status', message: 'All vehicles online', time: '2h ago', unread: false },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-gray-800 shadow-lg">
      <div className="max-w-full mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <span className="text-xl font-bold text-white">
              okDriver
            </span>
            
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange(item);
                    }
                    if (item === 'Monitor') {
                      router.push('/user/monitor');
                    }
                    if (item === 'Device') {
                      router.push('/user/device/view_all_device');
                    }
                    if (item === 'Video') {
                      router.push('/user/video');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === item
                      ? 'text-black bg-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 hover:bg-gray-800 rounded-lg transition-all duration-300 text-gray-300 hover:text-white relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      <span className="text-xs px-2 py-1 bg-red-500 text-white rounded-full">
                        {notifications.filter(n => n.unread).length}
                      </span>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer ${
                          notification.unread ? 'bg-gray-800/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-700 bg-gray-800">
                    <button className="w-full text-xs text-center text-gray-300 hover:text-white font-medium transition-colors">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-700 transition-all duration-300 flex items-center space-x-2"
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black text-xs font-bold">
                  {userInfo.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline">{userInfo.name}</span>
                <svg className={`w-4 h-4 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                  <div className="p-4 border-b border-gray-700 bg-gray-800">
                    <p className="text-sm font-semibold text-white">{userInfo.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{userInfo.email}</p>
                  </div>
                  <div className="py-2">
                    <button 
                      onClick={handleSettings}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Help & Support
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-700">
                    <button 
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors flex items-center gap-3 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2.5 hover:bg-gray-800 rounded-lg transition-all duration-300 text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="lg:hidden pb-4 border-t border-gray-800 animate-fadeIn">
            <div className="space-y-1 mt-4">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange(item);
                    }
                    if (item === 'Monitor') {
                      router.push('/user/monitor');
                    }
                    if (item === 'Device') {
                      router.push('/user/device/view_all_device');
                    }
                    if (item === 'Video') {
                      router.push('/user/video');
                    }
                    setShowMobileMenu(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === item
                      ? 'text-black bg-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </nav>
  );
}
