import prisma from '../../../../config/database.js';

export const deleteDeviceInventory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if device inventory exists
    const existingItem = await prisma.deviceInventory.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Device inventory item not found'
      });
    }

    // Delete device inventory
    await prisma.deviceInventory.delete({
      where: { id: parseInt(id) }
    });

    return res.status(200).json({
      success: true,
      message: 'Device inventory deleted successfully',
      data: {
        deletedItem: {
          id: existingItem.id,
          imei: existingItem.imei,
          deviceModel: existingItem.deviceModel
        }
      }
    });

  } catch (error) {
    console.error('Error deleting device inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete device inventory',
      error: error.message
    });
  }
};
