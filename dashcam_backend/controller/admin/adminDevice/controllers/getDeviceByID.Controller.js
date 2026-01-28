import prisma from '../../../../config/database.js';


export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id: parseInt(id) },
      include: {
        data: {
          take: 50,
          orderBy: {
            receivedAt: 'desc'
          }
        },
        logs: {
          take: 20,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device fetched successfully',
      data: device
    });

  } catch (error) {
    console.error('Error fetching device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch device',
      error: error.message
    });
  }
};