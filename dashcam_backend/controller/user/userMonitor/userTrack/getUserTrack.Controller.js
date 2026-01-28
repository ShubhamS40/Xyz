import prisma from '../../../../config/database.js';

/**
 * Haversine distance between two lat/lng pairs in kilometers.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat2 === null ||
    lon1 === null || lon2 === null ||
    lat1 === undefined || lat2 === undefined ||
    lon1 === undefined || lon2 === undefined
  ) {
    return 0;
  }

  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build Tracksolid-like track data for a device and time range.
 * Uses raw points from `device_data` and returns:
 * - summary (distance, average speed, max speed, point count)
 * - points array with pointType for map rendering.
 *
 * NOTE: Auth requirement has been removed for easier testing. We simply
 *       look up the device by IMEI.
 */
export async function getUserTrack(req, res) {
  try {
    const { imei, startTime, endTime, positionType } = req.query;

    if (!imei || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'imei, startTime and endTime are required',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startTime or endTime',
      });
    }

    // Ensure start <= end
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startTime must be before endTime',
      });
    }

    // Find device by IMEI (no user restriction for track queries)
    // Also support deviceId as fallback if imei is actually a numeric ID
    let device = null;
    
    // Try to find by IMEI first
    device = await prisma.device.findUnique({
      where: { imei },
    });

    // If not found and imei looks like a number, try finding by ID
    if (!device && !isNaN(imei)) {
      const deviceId = parseInt(imei, 10);
      device = await prisma.device.findUnique({
        where: { id: deviceId },
      });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device not found for IMEI/ID: ${imei}`,
      });
    }

    // Build where clause - check both receivedAt and positionTime for date range
    // Include points where:
    // 1. receivedAt is in range, OR
    // 2. positionTime is in range (when not null)
    const whereClause = {
      deviceId: device.id,
      AND: [
        {
          OR: [
            // receivedAt is in range (primary filter)
            {
              receivedAt: {
                gte: start,
                lte: end,
              },
            },
            // positionTime is in range (when positionTime exists)
            {
              AND: [
                {
                  positionTime: {
                    not: null,
                  },
                },
                {
                  positionTime: {
                    gte: start,
                    lte: end,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    // ✅ Add positionType filter if provided and not "All"
    if (positionType && positionType !== 'All' && positionType !== 'all') {
      whereClause.AND.push({
        positionType: positionType,
      });
    }

    // Fetch raw points from device_data
    console.log('Querying device_data with:', JSON.stringify(whereClause, null, 2));
    const rawPoints = await prisma.deviceData.findMany({
      where: whereClause,
      orderBy: {
        receivedAt: 'asc',
      },
    });
    console.log(`Found ${rawPoints.length} points for device ID ${device.id} (IMEI: ${imei})`);

    if (!rawPoints.length) {
      return res.json({
        success: true,
        data: {
          device: {
            imei: device.imei,
            deviceName: device.deviceName,
            deviceModel: device.deviceModel,
            simNumber: device.simNumber,
            phoneNumber: device.phoneNumber,
            driverName: device.driverName,
            numberPlate: device.numberPlate,
          },
          summary: {
            totalDistanceKm: 0,
            avgSpeedKmh: 0,
            maxSpeedKmh: 0,
            pointCount: 0,
          },
          points: [],
        },
      });
    }

    let totalDistanceKm = 0;
    let maxSpeedKmh = 0;

    const points = [];

    for (let i = 0; i < rawPoints.length; i++) {
      const p = rawPoints[i];
      const prev = i > 0 ? rawPoints[i - 1] : null;

      // Distance from previous point
      if (prev) {
        const dKm = haversineKm(
          prev.latitude,
          prev.longitude,
          p.latitude,
          p.longitude,
        );
        totalDistanceKm += dKm;
      }

      const speed = p.speed || 0;
      if (speed > maxSpeedKmh) {
        maxSpeedKmh = speed;
      }

      // Determine point type for map markers
      let pointType = 'normal';
      if (i === 0) {
        pointType = 'start';
      } else if (i === rawPoints.length - 1) {
        pointType = 'end';
      } else if (!p.speed || p.speed <= 1) {
        pointType = 'stop';
      }

      // ✅ Include all new fields from schema
      points.push({
        latitude: p.latitude,
        longitude: p.longitude,
        speedKmh: speed,
        accStatus: p.accStatus,
        gnssType: p.gnssType,
        satellites: p.satellites,
        signalStrength: p.signalStrength,
        receivedAt: p.receivedAt,
        pointType, // start, end, stop, normal
        
        // ✅ NEW FIELDS
        ignition: p.ignition,
        positionTime: p.positionTime,
        azimuth: p.azimuth,
        positionType: p.positionType,
        dataType: p.dataType,
        coordinates: p.coordinates,
        address: p.address,
      });
    }

    const firstTime = rawPoints[0].receivedAt;
    const lastTime = rawPoints[rawPoints.length - 1].receivedAt;
    const durationHours =
      (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60) || 0;

    const avgSpeedKmh =
      durationHours > 0 ? totalDistanceKm / durationHours : 0;

    // Optionally cache into TrackHistory (best-effort, non-blocking)
    try {
      await prisma.trackHistory.create({
        data: {
          deviceId: device.id,
          imei: device.imei,
          startTime: firstTime,
          endTime: lastTime,
          totalDistance: Number(totalDistanceKm.toFixed(3)),
          avgSpeed: Number(avgSpeedKmh.toFixed(3)),
          maxSpeed: Number(maxSpeedKmh.toFixed(3)),
        },
      });
    } catch (cacheError) {
      // Do not fail main response if caching fails
      console.error('Failed to cache track history:', cacheError.message);
    }

    return res.json({
      success: true,
      data: {
        device: {
          imei: device.imei,
          deviceName: device.deviceName,
          deviceModel: device.deviceModel,
          // ✅ NEW DEVICE FIELDS
          simNumber: device.simNumber,
          phoneNumber: device.phoneNumber,
          driverName: device.driverName,
          numberPlate: device.numberPlate,
        },
        summary: {
          totalDistanceKm: Number(totalDistanceKm.toFixed(3)),
          avgSpeedKmh: Number(avgSpeedKmh.toFixed(3)),
          maxSpeedKmh: Number(maxSpeedKmh.toFixed(3)),
          pointCount: points.length,
        },
        points,
      },
    });
  } catch (error) {
    console.error('Error building user track:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to build track data',
    });
  }
}