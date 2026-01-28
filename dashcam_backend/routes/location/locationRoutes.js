import express from 'express';
import locationController from '../../controller/location/locationController.js';

const router = express.Router();

// GET all devices with locations
router.get('/', locationController.getAllDevicesLocations);

// GET latest location for a specific device
router.get('/:imei', locationController.getDeviceLocation);

// GET location history for a device
router.get('/:imei/history', locationController.getDeviceLocationHistory);

// GET live location (latest from database)
router.get('/:imei/live', locationController.getLiveLocation);

// POST location data endpoint (kept for backward compatibility, but tcpServer handles it directly)
// Note: tcpServer.js now handles location data saving directly to database
router.post('/location-data', locationController.saveLocationData);

export default router;

