import prisma from '../../../../config/database.js';

export const editDeviceInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deviceModel,
      imei,
      status,
      vendor,
      category,
      unitPrice,
      companyName,
      assignedToType,
      assignedToId,
      assignedToName,
      activationDate
    } = req.body;

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

    // Build update data object
    const updateData = {};
    
    if (deviceModel !== undefined) updateData.deviceModel = deviceModel;
    if (imei !== undefined) updateData.imei = imei;
    if (status !== undefined) updateData.status = status;
    if (vendor !== undefined) updateData.vendor = vendor || null;
    if (category !== undefined) updateData.category = category;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice || null;
    if (companyName !== undefined) updateData.companyName = companyName || null;
    if (assignedToType !== undefined) updateData.assignedToType = assignedToType || null;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName || null;
    if (activationDate !== undefined) updateData.activationDate = activationDate ? new Date(activationDate) : null;

    // Update device inventory
    const updatedItem = await prisma.deviceInventory.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Device inventory updated successfully',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error updating device inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update device inventory',
      error: error.message
    });
  }
};
