
import React, { useEffect, useRef, useState } from 'react';

const EasyPlayer = ({ 
  videoUrl, 
  isLive = true, 
  autoplay = true, 
  muted = true, 
  aspect = '16:9',
  onMessage,
  className
}) => {
  const containerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    const scriptUrl = 'https://cdn.jsdelivr.net/npm/@easydarwin/easyplayer@5.1.1/dist/element/EasyPlayer-element.min.js';
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      console.log('EasyPlayer script loaded');
      setScriptLoaded(true);
    };
    script.onerror = (e) => {
      console.error('Failed to load EasyPlayer script', e);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed? Usually not for global scripts
    };
  }, []);

  if (!scriptLoaded) {
    return (
      <div className={`flex items-center justify-center bg-black text-white ${className}`}>
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black ${className}`} ref={containerRef}>
      {/* 
        easy-player Web Component 
        Attributes:
        - video-url: Stream URL
        - live: true/false
        - autoplay: true/false
        - mute: true/false
        - stretch: true (fill container)
        - aspect: 16:9 etc
      */}
      <easy-player
        video-url={videoUrl}
        live={isLive}
        autoplay={autoplay}
        mute={muted}
        stretch={true}
        aspect={aspect}
        style={{ width: '100%', height: '100%', display: 'block' }}
      ></easy-player>
    </div>
  );
};

export default EasyPlayer;
