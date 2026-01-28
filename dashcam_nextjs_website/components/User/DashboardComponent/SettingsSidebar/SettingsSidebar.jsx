'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function SettingsSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { id: 'my-profile', label: 'My Profile', path: '/setting/my-profile' },
    { id: 'model-name-alias', label: 'Model Name Alias', path: '/setting/model-name-alias' }
  ];

  const handleItemClick = (path) => {
    router.push(path);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-black">Global Settings</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="space-y-1">
          <div className="bg-black text-white px-3 py-2 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Settings</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>
          <div className="pl-3 pt-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.path)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.path
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
