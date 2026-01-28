'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar({ sidebarOpen, setSidebarOpen, theme, setTheme }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState(null);
  const isDark = theme === 'dark';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin/dashboard',
      description: 'Overview & Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'inventory-management',
      label: 'Inventory Management',
      path: '/admin/Inventory',
      description: 'Inventory & stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7l9-4 9 4-9 4-9-4zM3 17l9 4 9-4M3 12l9 4 9-4"
          />
        </svg>
      ),
    },
    {
      id: 'device-management',
      label: 'Device Management',
      path: '/admin/device-management',
      description: 'Manage all devices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => pathname === path;

  const activeBackgroundClass = isDark ? 'bg-[#FF6B35]' : 'bg-gray-900';
  const hoverBackgroundClass = isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100';
  const inactiveTextClasses = isDark ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-gray-900';
  const descriptionTextInactive = isDark ? 'text-gray-600' : 'text-gray-400';

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72
        transform transition-all duration-500 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col min-h-screen border-r
        ${isDark ? 'bg-[#0d0d0d] border-[#1a1a1a] shadow-2xl' : 'bg-white border-gray-200 shadow-md'}
      `}
      >
        <div
          className={`px-6 py-6 flex-shrink-0 border-b ${
            isDark ? 'border-[#1a1a1a]' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-10 w-10 bg-[#FF6B35] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B35]/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span
                className={`font-bold text-lg tracking-tight ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                OkDriver
              </span>
              <p className={isDark ? 'text-gray-500 text-xs font-medium' : 'text-gray-500 text-xs font-medium'}>
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const hovered = hoveredItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.path);
                  setSidebarOpen(false);
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  w-full group relative overflow-hidden rounded-xl transition-all duration-300
                  ${active ? 'scale-100' : 'scale-100 hover:scale-[1.02]'}
                `}
              >
                <div
                  className={`
                  absolute inset-0 transition-all duration-300
                  ${
                    active
                      ? activeBackgroundClass
                      : hovered
                      ? hoverBackgroundClass
                      : 'bg-transparent'
                  }
                `}
                ></div>

                <div
                  className={`
                  relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300
                  ${active ? 'text-white' : inactiveTextClasses}
                `}
                >
                  <div
                    className={`
                    flex-shrink-0 transition-transform duration-300
                    ${hovered ? 'scale-110' : 'scale-100'}
                  `}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-sm">{item.label}</div>
                    <div
                      className={`text-xs transition-all duration-300 ${
                        active
                          ? isDark
                            ? 'text-white/70 opacity-100'
                            : 'text-gray-100 opacity-100'
                          : `${descriptionTextInactive} opacity-0 group-hover:opacity-100`
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>

                  {active && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        <div
          className={`px-4 py-4 border-t ${
            isDark ? 'border-[#1a1a1a]' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className={isDark ? 'text-xs text-gray-500' : 'text-xs text-gray-500'}>
              Theme
            </span>
            <div
              className={`flex items-center rounded-full p-1 text-xs font-medium ${
                isDark ? 'bg-[#111827] border border-[#1f2937]' : 'bg-gray-100 border border-gray-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setTheme && setTheme('light')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  theme === 'light'
                    ? isDark
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-white text-gray-900 shadow-sm'
                    : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme && setTheme('dark')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-900 text-gray-100 shadow-sm'
                    : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
          <div
            className={`rounded-xl p-4 border ${
              isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <div className="flex-1">
                <p className={isDark ? 'text-white text-sm font-semibold' : 'text-gray-900 text-sm font-semibold'}>
                  Admin User
                </p>
                <p className={isDark ? 'text-gray-500 text-xs' : 'text-gray-500 text-xs'}>
                  admin@okdriver.com
                </p>
              </div>
            </div>
            <button
              className={`w-full mt-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-[#2a2a2a] hover:bg-[#333333] text-gray-400 hover:text-white'
                  : 'bg-gray-900 hover:bg-black text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
