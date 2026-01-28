import React, { useState, useEffect, useRef } from 'react';
import { Info, Grid3x3, LayoutGrid, Maximize2, Settings } from 'lucide-react';

const LiveViewPlayer = ({ streams = [] }) => {
  const [compatibility, setCompatibility] = useState(true);
  const [broadcastDuration, setBroadcastDuration] = useState('not limited');
  const [viewMode, setViewMode] = useState('2x2');
  const videoRefs = useRef({});
  const hlsInstancesRef = useRef({});
  const hlsUrlsRef = useRef({});
  const playPromisesRef = useRef({});
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [streamStatus, setStreamStatus] = useState({});

  const activeStreams = streams.length > 0 ? streams : [];

  const getGridClass = () => {
    switch(viewMode) {
      case '1x1': return 'grid-cols-1';
      case '2x2': return 'grid-cols-2';
      case '3x3': return 'grid-cols-3';
      case '4x4': return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const getVisiblePlayers = () => {
    switch(viewMode) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      default: return 4;
    }
  };

  // Load HLS.js
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.Hls) {
        console.log('✅ HLS.js already loaded');
        setHlsLoaded(true);
        return;
      }

      const checkInterval = setInterval(() => {
        if (window.Hls) {
          console.log('✅ HLS.js loaded by Next.js Script');
          setHlsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      setTimeout(() => {
        if (!window.Hls) {
          console.log('⚠️ HLS.js not loaded by Script, loading manually...');
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          script.async = false;
          script.onload = () => {
            if (window.Hls) {
              console.log('✅ HLS.js loaded successfully (manual)');
              setHlsLoaded(true);
            }
          };
          script.onerror = () => {
            console.error('❌ Failed to load HLS.js');
          };
          document.head.appendChild(script);
        }
        clearInterval(checkInterval);
      }, 2000);

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, []);

  // Initialize HLS.js for video streams
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const needsHlsJs = !(isSafari || isIOS);

    if (needsHlsJs && !window.Hls) {
      console.log('⏳ Waiting for HLS.js to load...');
      return;
    }

    activeStreams.forEach((stream) => {
      const videoId = `video-${stream.device.imei}-${stream.channel}`;
      const videoElement = videoRefs.current[videoId];

      if (!videoElement || !stream.hlsUrl) {
        return;
      }

      if (hlsInstancesRef.current[videoId] && hlsUrlsRef.current[videoId] === stream.hlsUrl) {
        console.log(`⏭️ Skipping re-initialization for ${videoId} (already attached with same URL)`);
        return;
      }

      if (hlsInstancesRef.current[videoId]) {
        console.log(`🔄 Cleaning up existing HLS instance for ${videoId}`);
        try {
          hlsInstancesRef.current[videoId].destroy();
        } catch (e) {
          console.warn(`⚠️ Error destroying HLS instance:`, e);
        }
        delete hlsInstancesRef.current[videoId];
      }

      if (playPromisesRef.current[videoId]) {
        playPromisesRef.current[videoId].catch(() => {});
        delete playPromisesRef.current[videoId];
      }

      if (videoElement.src) {
        videoElement.src = '';
        videoElement.removeAttribute('src');
        videoElement.load();
      }

      console.log(`🎥 Initializing video player for ${videoId}`);
      console.log(`📺 HLS URL: ${stream.hlsUrl}`);

      hlsUrlsRef.current[videoId] = stream.hlsUrl;

      if (!stream.hlsUrl || !stream.hlsUrl.startsWith('http')) {
        console.error(`❌ Invalid HLS URL for ${videoId}: ${stream.hlsUrl}`);
        return;
      }

      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const shouldUseNativeHLS = (isSafari || isIOS) && videoElement.canPlayType('application/vnd.apple.mpegurl');

      console.log(`🌐 Browser detection: Safari=${isSafari}, iOS=${isIOS}, UseNativeHLS=${shouldUseNativeHLS}`);
      console.log(`📦 HLS.js available: ${!!window.Hls}, Supported: ${window.Hls ? window.Hls.isSupported() : false}`);

      if (window.Hls && window.Hls.isSupported() && !shouldUseNativeHLS) {
        console.log('🔧 Using HLS.js for playback');
        
        setStreamStatus(prev => ({ ...prev, [videoId]: 'loading' }));

        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLoadingTimeOut: 20,
          fragLoadingTimeOut: 20,
          manifestLoadingTimeOut: 10,
          debug: false
        });

        // Recommended order: attach media first, then load source after MEDIA_ATTACHED
        hls.attachMedia(videoElement);
        hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
          try {
            hls.loadSource(stream.hlsUrl);
          } catch (e) {
            console.error(`❌ Failed to load HLS source for ${videoId}:`, e);
            setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
          }
        });

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          console.log(`✅ Manifest parsed for ${videoId}`);
          
          setTimeout(() => {
            if (hlsInstancesRef.current[videoId] !== hls) {
              console.log(`⏭️ Skipping play for ${videoId} (instance changed)`);
              return;
            }

            if (hlsUrlsRef.current[videoId] !== stream.hlsUrl) {
              console.log(`⏭️ Skipping play for ${videoId} (URL changed)`);
              return;
            }

            const tryPlay = () => {
              if (videoElement.readyState >= 2) {
                const playPromise = videoElement.play().then(() => {
                  console.log(`▶️ Video playing for ${videoId}`);
                  setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
                  if (playPromisesRef.current[videoId] === playPromise) {
                    delete playPromisesRef.current[videoId];
                  }
                }).catch(err => {
                  if (err.name !== 'AbortError') {
                    console.error('❌ Error playing video after manifest parsed:', err);
                    setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
                  } else {
                    console.log(`⏭️ Play aborted for ${videoId} (expected during re-initialization)`);
                  }
                  if (playPromisesRef.current[videoId] === playPromise) {
                    delete playPromisesRef.current[videoId];
                  }
                });
                playPromisesRef.current[videoId] = playPromise;
              } else {
                videoElement.addEventListener('loadeddata', tryPlay, { once: true });
                setTimeout(() => {
                  if (videoElement.readyState >= 2) {
                    tryPlay();
                  }
                }, 200);
              }
            };

            tryPlay();
          }, 100);
        });

        // Mark "playing" when at least one fragment is buffered
        hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
          if (hlsInstancesRef.current[videoId] === hls) {
            setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
          }
        });

        // Fallback: if currentTime starts moving, consider it playing
        const timeUpdateHandler = () => {
          if (videoElement.currentTime > 0 && !videoElement.paused) {
            setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
          }
        };
        videoElement.addEventListener('timeupdate', timeUpdateHandler);

        const playingHandler = () => {
          console.log(`▶️ Video started playing for ${videoId}`);
          setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
        };
        videoElement.addEventListener('playing', playingHandler);

        const loadedDataHandler = () => {
          console.log(`📹 Video data loaded for ${videoId}, readyState: ${videoElement.readyState}`);
          if (hlsInstancesRef.current[videoId] === hls && videoElement.readyState >= 2) {
            setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
          }
        };
        videoElement.addEventListener('loadeddata', loadedDataHandler);

        const canPlayHandler = () => {
          console.log(`▶️ Video can play for ${videoId}`);
          if (hlsInstancesRef.current[videoId] === hls) {
            setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
          }
        };
        videoElement.addEventListener('canplay', canPlayHandler);

        if (!hls.handlers) hls.handlers = {};
        hls.handlers[videoId] = {
          playing: playingHandler,
          loadeddata: loadedDataHandler,
          canplay: canPlayHandler,
          timeupdate: timeUpdateHandler
        };

        hls.on(window.Hls.Events.ERROR, (event, data) => {
          console.error(`❌ HLS error for ${videoId}:`, data);
          console.error(`  Error type: ${data.type}, Fatal: ${data.fatal}`);
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                console.log(`🔄 Network error for ${videoId}, trying to recover...`);
                try {
                  hls.startLoad();
                } catch (e) {
                  console.error(`❌ Failed to recover from network error:`, e);
                  setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
                }
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`🔄 Media error for ${videoId}, trying to recover...`);
                try {
                  hls.recoverMediaError();
                } catch (e) {
                  console.error(`❌ Failed to recover from media error:`, e);
                  setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
                  hls.destroy();
                }
                break;
              default:
                console.error(`❌ Fatal HLS error for ${videoId}, cannot recover`);
                setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
                hls.destroy();
                break;
            }
          }
        });

        hlsInstancesRef.current[videoId] = hls;
      } else if (shouldUseNativeHLS) {
        console.log('📱 Using native HLS support (Safari/iOS)');
        setStreamStatus(prev => ({ ...prev, [videoId]: 'loading' }));
        videoElement.src = stream.hlsUrl;
        videoElement.addEventListener('error', (e) => {
          console.error(`❌ Video element error (native HLS) for ${videoId}:`, e);
          setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
        });
        videoElement.addEventListener('loadedmetadata', () => {
          setStreamStatus(prev => ({ ...prev, [videoId]: 'playing' }));
        });
        videoElement.play().catch(err => {
          console.error('❌ Error playing video (native HLS):', err);
          setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
        });
      } else {
        console.error('❌ HLS is not supported in this browser');
        setStreamStatus(prev => ({ ...prev, [videoId]: 'error' }));
      }
    });

    return () => {
      const activeVideoIds = activeStreams.map(s => `video-${s.device.imei}-${s.channel}`);
      Object.keys(hlsInstancesRef.current).forEach(videoId => {
        if (!activeVideoIds.includes(videoId)) {
          console.log(`🧹 Cleaning up HLS instance for ${videoId}`);
          const hls = hlsInstancesRef.current[videoId];
          const videoElement = videoRefs.current[videoId];

          if (hls && hls.handlers && hls.handlers[videoId] && videoElement) {
            const handlers = hls.handlers[videoId];
            videoElement.removeEventListener('playing', handlers.playing);
            videoElement.removeEventListener('loadeddata', handlers.loadeddata);
            videoElement.removeEventListener('canplay', handlers.canplay);
            if (handlers.timeupdate) {
              videoElement.removeEventListener('timeupdate', handlers.timeupdate);
            }
          }

          try {
            if (hls && hls.destroy) {
              hls.destroy();
            }
          } catch (e) {
            console.warn(`⚠️ Error cleaning up HLS instance:`, e);
          }
          delete hlsInstancesRef.current[videoId];
          delete hlsUrlsRef.current[videoId];
          if (playPromisesRef.current[videoId]) {
            playPromisesRef.current[videoId].catch(() => {});
            delete playPromisesRef.current[videoId];
          }
        }
      });
    };
  }, [activeStreams, hlsLoaded]);

  const displayStreams = activeStreams.slice(0, getVisiblePlayers());

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header Controls */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700 flex items-center gap-2">
            <span>Default live broadcast duration:</span>
            <select
              value={broadcastDuration}
              onChange={(e) => setBroadcastDuration(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="not limited">not limited</option>
              <option value="30 min">30 min</option>
              <option value="1 hour">1 hour</option>
              <option value="2 hours">2 hours</option>
            </select>
          </label>

          <label className="text-sm text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Compatibility mode:</span>
            <button
              onClick={() => setCompatibility(!compatibility)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                compatibility ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  compatibility ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('1x1')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '1x1' ? 'bg-gray-200' : ''}`}
            title="1x1 View"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('2x2')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '2x2' ? 'bg-gray-200' : ''}`}
            title="2x2 View"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('3x3')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '3x3' ? 'bg-gray-200' : ''}`}
            title="3x3 View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('4x4')}
            className={`p-2 rounded hover:bg-gray-100 ${viewMode === '4x4' ? 'bg-gray-200' : ''}`}
            title="4x4 View"
          >
            <LayoutGrid className="w-6 h-6" />
          </button>
          <button className="p-2 rounded hover:bg-gray-100" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Players Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={`grid ${getGridClass()} gap-4 h-full`}>
          {displayStreams.length > 0 ? (
            displayStreams.map((stream, index) => {
              const videoId = `video-${stream.device.imei}-${stream.channel}`;
              const deviceName = stream.device.deviceName || stream.device.deviceModel || `Device-${stream.device.imei?.slice(-4)}`;

              return (
                <div
                  key={videoId}
                  className="relative bg-black rounded-lg overflow-hidden shadow-lg group aspect-video"
                >
                  {/* Video Element - FIXED: Always visible, no conditional z-index */}
                  <video
                    ref={(el) => {
                      if (el) {
                        if (videoRefs.current[videoId] !== el) {
                          if (el.src) {
                            el.src = '';
                            el.removeAttribute('src');
                          }
                          videoRefs.current[videoId] = el;
                        }
                      } else {
                        if (videoRefs.current[videoId]) {
                          delete videoRefs.current[videoId];
                        }
                      }
                    }}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    preload="auto"
                  >
                    Your browser does not support the video tag.
                  </video>

                  {/* Loading/No Signal Overlay - FIXED: Only show when NOT playing */}
                  {streamStatus[videoId] !== 'playing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90">
                      {streamStatus[videoId] === 'loading' ? (
                        <>
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-white text-sm">Connecting to stream...</p>
                          </div>
                        </>
                      ) : streamStatus[videoId] === 'error' ? (
                        <>
                          <div className="text-center text-red-400">
                            <div className="text-4xl mb-2">⚠️</div>
                            <p className="text-sm">Stream error</p>
                            <p className="text-xs mt-1 opacity-75">Check MediaMTX server</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center text-gray-400">
                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="inline-block px-2 py-1 bg-gray-700 rounded text-xs mb-2">
                              HD
                            </div>
                            <p className="text-sm">No stream</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hover Controls */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {/* Player Info Overlay */}
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                      <div className="flex items-center justify-between text-white text-sm">
                        <div>
                          <div className="font-medium">{deviceName} - CH{stream.channel}</div>
                          <div className="text-xs opacity-75">
                            {streamStatus[videoId] === 'playing' ? 'Live' : 
                             streamStatus[videoId] === 'loading' ? 'Connecting...' :
                             streamStatus[videoId] === 'error' ? 'Error' :
                             stream.hlsUrl ? 'Starting...' : 'No stream'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            Array.from({ length: getVisiblePlayers() }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg aspect-video flex items-center justify-center"
              >
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="inline-block px-2 py-1 bg-gray-700 rounded text-xs mb-2">
                    HD
                  </div>
                  <p className="text-sm">No stream selected</p>
                  <p className="text-xs mt-1 opacity-75">Select a camera channel to view</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveViewPlayer;