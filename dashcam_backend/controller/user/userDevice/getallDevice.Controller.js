import prisma from '../../../config/database.js';
import { authenticateUser } from '../../../middleware/authMiddleware.js';

// Get all devices assigned to user
export const getAllDevices = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const {
      page = 1,
      limit = 100,
      status,
      search,
      category
    } = req.query;

    // Build where clause - only devices assigned to this user
    const where = {
      assignedToType: 'user',
      assignedToId: userId
    };
    
    if (status) {
      where.status = status;
    }
    
    // Handle category filter (case-insensitive)
    if (category) {
      const categoryLower = category.toLowerCase();
      where.category = {
        in: [categoryLower, categoryLower.charAt(0).toUpperCase() + categoryLower.slice(1)]
      };
    }
    
    // Handle search filter
    if (search) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { imei: { contains: search } },
          { deviceName: { contains: search } },
          { deviceModel: { contains: search } }
        ]
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Fetch devices assigned to user
    const [devices, totalCount] = await Promise.all([
      prisma.device.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take,
        include: {
          data: {
            take: 1,
            orderBy: {
              receivedAt: 'desc'
            }
          },
          logs: {
            take: 5,
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      }),
      prisma.device.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / take);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Determine online/offline status based on lastSeen or latest data receivedAt
    const formattedDevices = devices.map(device => {
      // If status is inactive, keep it as inactive
      if (device.status === 'inactive') {
        return {
          ...device,
          status: 'inactive'
        };
      }
      
      // Check latest location data timestamp (receivedAt) or lastSeen
      const latestDataTime = device.data && device.data.length > 0 
        ? device.data[0].receivedAt 
        : device.lastSeen;
      
      if (!latestDataTime) {
        return {
          ...device,
          status: 'offline'
        };
      }
      
      const lastDataTime = new Date(latestDataTime).getTime();
      const now = Date.now();
      const diffMinutes = (now - lastDataTime) / (1000 * 60);
      
      // Device is online if data received within last 4 minutes
      // Otherwise it's offline
      const status = diffMinutes <= 4 ? 'online' : 'offline';

      return {
        ...device,
        status
      };
    });

    return res.status(200).json({
      success: true,
      message: 'User devices fetched successfully',
      data: formattedDevices,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: take,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('Error fetching user devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error.message
    });
  }
};
