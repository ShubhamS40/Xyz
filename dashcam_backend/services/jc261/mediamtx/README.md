# MediaMTX Server Setup

## Installation

1. Download MediaMTX from: https://github.com/bluenviron/mediamtx/releases

2. Extract and place the `mediamtx` executable in this directory

## Configuration

The `mediamtx.yml` file is already configured with:
- RTMP server on port 1935
- HLS server on port 8080
- WebRTC server on port 8889
- API on port 9997
- Recording enabled

## Running MediaMTX

### Linux/Mac:
```bash
cd C:\Users\Shiva\Desktop\ganesh\dashcam_backend\services\jc261\mediamtx
./mediamtx mediamtx.yml
```

### Windows:
```bash
cd C:\Users\Shiva\Desktop\ganesh\dashcam_backend\services\jc261\mediamtx
mediamtx.exe mediamtx.yml
```

### As a Service (Linux):
```bash
# Create systemd service
sudo nano /etc/systemd/system/mediamtx.service
```

Add:
```ini
[Unit]
Description=MediaMTX Streaming Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/dashcam_backend/services/jc261/mediamtx
ExecStart=/path/to/mediamtx/mediamtx mediamtx.yml
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable mediamtx
sudo systemctl start mediamtx
sudo systemctl status mediamtx
```

## Stream URLs

After starting MediaMTX and device streams:

- **RTMP Push URL**: `rtmp://YOUR_SERVER_IP:1935/live/{cameraIndex}/{imei}`
- **HLS Playback URL**: `http://YOUR_SERVER_IP:8888/live/{cameraIndex}/{imei}/index.m3u8`
- **WebRTC URL**: `webrtc://YOUR_SERVER_IP:8889/live/{cameraIndex}/{imei}`

Example:
- Camera CH1 (index 0) for IMEI 864993060968006:
  - RTMP: `rtmp://192.168.1.38:1935/live/0/864993060968006`
  - HLS: `http://192.168.1.38:8080/live/0/864993060968006/index.m3u8`

## Environment Variables

Set these in your backend `.env`:
```
RTMP_PORT=1935
MEDIAMTX_HLS_PORT=8888
MEDIAMTX_WEBRTC_PORT=8889
SERVER_IP=192.168.1.38  # Your server IP

# If device is outside network and you are using bore/pub tunnel for RTMP:
# example: rtmp://bore.pub:22797/live/0/<imei>
RTMP_PUBLIC_HOST=bore.pub
RTMP_PUBLIC_PORT=22797
```

