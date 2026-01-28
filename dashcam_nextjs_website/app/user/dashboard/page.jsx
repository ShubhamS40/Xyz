'use client';

import { useState } from 'react';
import Navbar from '../../../components/User/DashboardComponent/Navbar/Navbar';
import Sidebar from '../../../components/User/DashboardComponent/Sidebar/Sidebar';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Monitor');
  const [activeSidebarItem, setActiveSidebarItem] = useState('objects');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Device') {
      setActiveSidebarItem('view-all');
    } else {
      setActiveSidebarItem('objects');
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
      </div>
    </div>
  );
}

