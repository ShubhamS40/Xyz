import express from 'express';
import {
  allDeviceController,
  addDeviceController,
  getDeviceByIdController,
  editDeviceController,
  deleteDeviceController,
  getDeviceByIMEIController,
  allDeviceInventoryController,
  addDeviceInventoryController,
  getDeviceInventoryByIdController,
  editDeviceInventoryController,
  deleteDeviceInventoryController,
} from '../../../controller/admin/adminDevice/index.js';

const router = express.Router();

// ==================== Device Routes (devices table) ====================

// GET all devices
router.get('/devices', allDeviceController.getAllDevices);

// GET device by IMEI (must come before /devices/:id to avoid route conflict)
router.get('/devices/imei/:imei', getDeviceByIMEIController.getDeviceByImei);

// GET device by ID
router.get('/devices/:id', getDeviceByIdController.getDeviceById);

// POST add device
router.post('/devices', addDeviceController.addDevice);

// PUT update device
router.put('/devices/:id', editDeviceController.editDevice);

// PATCH update device status
router.patch('/devices/:imei/status', getDeviceByIMEIController.updateDeviceStatus);

// DELETE device
router.delete('/devices/:id', deleteDeviceController.deleteDevice);

// ==================== Device Inventory Routes (device_inventory table) ====================

// GET all device inventory
router.get('/inventory', allDeviceInventoryController.getAllDeviceInventory);

// GET device inventory by ID
router.get('/inventory/:id', getDeviceInventoryByIdController.getDeviceInventoryById);

// POST add device inventory
router.post('/inventory', addDeviceInventoryController.addDeviceInventory);

// PUT update device inventory
router.put('/inventory/:id', editDeviceInventoryController.editDeviceInventory);

// DELETE device inventory
router.delete('/inventory/:id', deleteDeviceInventoryController.deleteDeviceInventory);

export default router;
