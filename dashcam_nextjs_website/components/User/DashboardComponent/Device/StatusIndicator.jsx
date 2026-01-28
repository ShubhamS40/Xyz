'use client';

export default function StatusIndicator({ status }) {
  const isActive = status === 'active';

  return (
    <div className="relative">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isActive ? 'bg-green-100' : 'bg-orange-100'
      }`}>
        <div className={`w-4 h-4 rounded-full ${
          isActive ? 'bg-green-500' : 'bg-orange-500'
        }`}>
          {isActive && (
            <div className="w-4 h-4 rounded-full bg-green-500 animate-ping absolute"></div>
          )}
        </div>
      </div>
    </div>
  );
}

