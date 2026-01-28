// ==================== Device Controllers (devices table) ====================
import * as allDeviceController from './controllers/allDevice.Controller.js';
import * as addDeviceController from './controllers/addDevice.Controller.js';
import * as getDeviceByIdController from './controllers/getDeviceByID.Controller.js';
import * as editDeviceController from './controllers/editDevcie.Controller.js';
import * as deleteDeviceController from './controllers/deleteDevice.Controller.js';
import * as getDeviceByIMEIController from './controllers/getDeviceByIMEI.Controller.js';

// ==================== Device Inventory Controllers (device_inventory table) ====================
import * as allDeviceInventoryController from './controllers/allDeviceInventory.Controller.js';
import * as addDeviceInventoryController from './controllers/addDeviceInventory.Controller.js';
import * as getDeviceInventoryByIdController from './controllers/getDeviceInventoryByID.Controller.js';
import * as editDeviceInventoryController from './controllers/editDeviceInventory.Controller.js';
import * as deleteDeviceInventoryController from './controllers/deleteDeviceInventory.Controller.js';

// Export all controllers
export {
  // Device Controllers
  allDeviceController,
  addDeviceController,
  getDeviceByIdController,
  editDeviceController,
  deleteDeviceController,
  getDeviceByIMEIController,
  
  // Device Inventory Controllers
  allDeviceInventoryController,
  addDeviceInventoryController,
  getDeviceInventoryByIdController,
  editDeviceInventoryController,
  deleteDeviceInventoryController,
};
