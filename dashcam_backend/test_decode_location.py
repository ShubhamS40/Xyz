#!/usr/bin/env python3
"""
Test script to decode JT808 location packets using the reference implementation
"""
import struct
import binascii
import sys

def decode_jt808_location(hex_data):
    """Decode JT808 GPS location packet - Exact copy from reference"""
    try:
        # Remove whitespace and convert to bytes
        if isinstance(hex_data, str):
            data = binascii.unhexlify(hex_data.strip())
        else:
            data = hex_data

        # Check start and end markers
        if not (data[0:2] == b'\x78\x78' and data[-2:] == b'\x0d\x0a'):
            print(f"❌ Invalid start/end markers")
            return None

        # Get message type
        msg_type = data[3]
        print(f"📦 Protocol: 0x{msg_type:02x}")
        print(f"📦 Packet length byte: {data[2]}")
        print(f"📦 Total buffer length: {len(data)}")

        if msg_type == 0x22:  # Location packet
            if len(data) < 28:
                print(f"⚠️ Packet too short: {len(data)} bytes (need at least 28)")
                return None

            # Parse timestamp (YY MM DD HH MM SS)
            year = 2000 + data[4]
            month = data[5]
            day = data[6]
            hour = data[7]
            minute = data[8]
            second = data[9]

            timestamp = f"{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}"

            # Parse GPS info byte
            gps_info = data[10]
            satellites = (gps_info >> 4) & 0x0F  # Upper 4 bits

            # Parse latitude (4 bytes, bytes 11-14)
            lat_raw = struct.unpack('>I', data[11:15])[0]
            latitude = lat_raw / 1800000.0  # Convert to degrees

            # Parse longitude (4 bytes, bytes 15-18)
            lon_raw = struct.unpack('>I', data[15:19])[0]
            longitude = lon_raw / 1800000.0  # Convert to degrees

            # Parse speed (1 byte in km/h, byte 19)
            speed = data[19]

            # Parse course/status (2 bytes, bytes 20-21)
            course_status = struct.unpack('>H', data[20:22])[0]
            course = course_status & 0x03FF  # Lower 10 bits
            accStatus = 1 if (course_status & 0x0400) else 0  # Bit 10

            return {
                'timestamp': timestamp,
                'latitude': latitude,
                'longitude': longitude,
                'speed': speed,
                'course': course,
                'satellites': satellites,
                'accStatus': accStatus
            }
        else:
            print(f"❌ Not a location packet (expected 0x22, got 0x{msg_type:02x})")
            return None
    except Exception as e:
        print(f"❌ Error decoding: {e}")
        import traceback
        traceback.print_exc()
        return None

# Test with a sample packet from gps_data.log
test_packet = "787826221a010a07061dc503139e33084eadd10014e301940b0000429733010e000000000001252a060d0a"

print("=" * 70)
print("GPS DATA DECODER - JT808 Protocol Test")
print("=" * 70)
print(f"\nTest packet: {test_packet}")
print(f"Packet length: {len(test_packet) // 2} bytes (hex)")

result = decode_jt808_location(test_packet)

if result:
    print(f"\n✅ Decoded successfully!")
    print(f"Timestamp:  {result['timestamp']}")
    print(f"Latitude:   {result['latitude']:.6f}°")
    print(f"Longitude:  {result['longitude']:.6f}°")
    print(f"Speed:      {result['speed']} km/h")
    print(f"Course:     {result['course']}°")
    print(f"Satellites: {result['satellites']}")
    print(f"ACC Status: {result['accStatus']}")
    print(f"Google Maps: https://www.google.com/maps?q={result['latitude']},{result['longitude']}")
else:
    print("\n❌ Failed to decode packet")

print("\n" + "=" * 70)

