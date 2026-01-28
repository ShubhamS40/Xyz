import prisma from '../../../../config/database.js';

export const getAllDeviceInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      deviceModel,
      category,
      vendor,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause for Prisma
    // By default, only show unassigned devices in inventory
    // Inventory should only contain devices that are available for assignment
    const where = {
      status: status || 'unassigned' // Default to unassigned, allow override via query param
    };
    
    if (deviceModel) {
      where.deviceModel = { contains: deviceModel };
    }
    
    if (category) {
      where.category = category;
    }
    
    if (vendor) {
      where.vendor = { contains: vendor };
    }
    
    if (search) {
      // When searching, combine search OR with existing filters using AND
      const searchConditions = {
        OR: [
          { imei: { contains: search } },
          { deviceModel: { contains: search } },
          { vendor: { contains: search } },
          { companyName: { contains: search } },
          { assignedToName: { contains: search } }
        ]
      };
      
      // Build AND array with status and search, plus other filters if they exist
      const andConditions = [
        { status: status || 'unassigned' },
        searchConditions
      ];
      
      if (deviceModel) {
        andConditions.push({ deviceModel: { contains: deviceModel } });
    }
      if (category) {
        andConditions.push({ category: category });
      }
      if (vendor) {
        andConditions.push({ vendor: { contains: vendor } });
      }
      
      where.AND = andConditions;
      
      // Remove fields from top level that are now in AND
      delete where.status;
      delete where.deviceModel;
      delete where.category;
      delete where.vendor;
    }

    // Map sortBy to Prisma field names
    const sortFieldMap = {
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
      'deviceModel': 'deviceModel',
      'activationDate': 'activationDate'
    };
    const orderBy = { [sortFieldMap[sortBy] || 'createdAt']: sortOrder === 'asc' ? 'asc' : 'desc' };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Fetch device inventory with pagination using Prisma
    const [inventoryItems, totalCount] = await Promise.all([
      prisma.deviceInventory.findMany({
        where,
        orderBy,
        skip,
        take
      }),
      prisma.deviceInventory.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / take);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      message: 'Device inventory fetched successfully',
      data: inventoryItems,
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
    console.error('Error fetching device inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch device inventory',
      error: error.message
    });
  }
};
