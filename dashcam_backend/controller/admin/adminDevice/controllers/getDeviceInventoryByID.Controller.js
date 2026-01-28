import prisma from '../../../../config/database.js';

export const getDeviceInventoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inventoryItem = await prisma.deviceInventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Device inventory item not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device inventory fetched successfully',
      data: inventoryItem
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
