import prisma from '../../../../config/database.js';

export const getAllDevices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      deviceModel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (deviceModel) {
      where.deviceModel = deviceModel;
    }
    
    if (search) {
      where.OR = [
        { imei: { contains: search } },
        { deviceName: { contains: search } },
        { ipAddress: { contains: search } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Fetch devices with pagination
    const [devices, totalCount] = await Promise.all([
      prisma.device.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
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

    return res.status(200).json({
      success: true,
      message: 'Devices fetched successfully',
      data: devices,
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
    console.error('Error fetching devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error.message
    });
  }
};
