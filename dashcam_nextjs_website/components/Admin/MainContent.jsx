'use client';

import React from 'react';

export default function MainContent({ title, children, setSidebarOpen, theme }) {
  const isDark = theme === 'dark';

  return (
    <main
      className={`flex-1 flex flex-col overflow-hidden ${
        isDark ? 'bg-[#050505]' : 'bg-[#f5f5f7]'
      }`}
    >
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="md:hidden fixed top-6 left-4 z-50 p-3 bg-[#FF6B35] hover:bg-[#ff7d4d] rounded-xl transition-all duration-300 active:scale-95 shadow-2xl shadow-[#FF6B35]/30 group"
      >
        <svg
          className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1
                  className={`text-xl md:text-2xl font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {title}
                </h1>
                <p
                  className={`mt-1 text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Central place to manage your devices and dashboards.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`hidden md:flex items-center rounded-full px-3 py-2 text-xs ${
                    isDark
                      ? 'bg-[#111827] border border-[#1f2937] text-gray-300'
                      : 'bg-white border border-gray-200 text-gray-500'
                  }`}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                  </svg>
                  <span>Search devices, users, settings</span>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    isDark
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  <span>New action</span>
                </button>
              </div>
            </div>

            <div>{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
