'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './SideBar';
import MainContent from './MainContent';

export default function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const storedTheme = window.localStorage.getItem('adminTheme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('adminTheme', theme);
  }, [theme]);

  return (
    <div
      className={`min-h-screen flex ${
        theme === 'dark'
          ? 'bg-[#050505] text-gray-100'
          : 'bg-[#f5f5f7] text-gray-900'
      }`}
    >
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={theme}
        setTheme={setTheme}
      />
      <MainContent title={title} setSidebarOpen={setSidebarOpen} theme={theme}>
        {children}
      </MainContent>
    </div>
  );
}
