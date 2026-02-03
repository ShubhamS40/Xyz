import express from 'express';
import VL502Controller from '../../controller/device/vl502Controller.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// 📍 LOCATION ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get latest location
router.get('/location/:imei/latest', VL502Controller.getLatestLocation);

// Get location history
router.get('/location/:imei/history', VL502Controller.getLocationHistory);

// Get live tracking data
router.get('/location/:imei/live', VL502Controller.getLiveTracking);

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 OBD DATA ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get latest OBD data
router.get('/obd/:imei/latest', VL502Controller.getLatestOBD);

// Get OBD history
router.get('/obd/:imei/history', VL502Controller.getOBDHistory);

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ALARM ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get active alarms
router.get('/alarms/:imei/active', VL502Controller.getActiveAlarms);

// Get alarm history
router.get('/alarms/:imei/history', VL502Controller.getAlarmHistory);

// Acknowledge alarm
router.patch('/alarms/:alarmId/acknowledge', VL502Controller.acknowledgeAlarm);

// Resolve alarm
router.patch('/alarms/:alarmId/resolve', VL502Controller.resolveAlarm);

// ═══════════════════════════════════════════════════════════════════════════
// 🚗 TRIP ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get current active trip
router.get('/trips/:imei/current', VL502Controller.getCurrentTrip);

// Get trip history
router.get('/trips/:imei/history', VL502Controller.getTripHistory);

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 DTC (TROUBLE CODES) ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get active DTCs
router.get('/dtc/:imei/active', VL502Controller.getActiveDTCs);

// Clear specific DTC
router.delete('/dtc/:dtcId', VL502Controller.clearDTC);

// Clear all DTCs
router.delete('/dtc/:imei/all', VL502Controller.clearAllDTCs);

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 EMERGENCY EVENTS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get emergency events
router.get('/emergency/:imei', VL502Controller.getEmergencyEvents);

// ═══════════════════════════════════════════════════════════════════════════
// 🚗 VEHICLE STATUS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get latest vehicle status
router.get('/vehicle-status/:imei', VL502Controller.getVehicleStatus);

// ═══════════════════════════════════════════════════════════════════════════
// 📊 PARAMETERS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get all parameters
router.get('/parameters/:imei', VL502Controller.getParameters);

// ═══════════════════════════════════════════════════════════════════════════
// 🎛️ DEVICE COMMAND ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Set parameter
router.post('/commands/:imei/set-parameter', VL502Controller.setParameter);

// Control device
router.post('/commands/:imei/control', VL502Controller.controlDevice);

// Get command history
router.get('/commands/:imei/history', VL502Controller.getCommandHistory);

// ═══════════════════════════════════════════════════════════════════════════
// 📊 STATISTICS & DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Get device statistics
router.get('/stats/:imei', VL502Controller.getDeviceStats);

// Get complete dashboard data
router.get('/dashboard/:imei', VL502Controller.getDashboard);

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TEST ROUTE
// ═══════════════════════════════════════════════════════════════════════════

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'VL502 routes are working!',
    endpoints: {
      location: {
        latest: 'GET /api/vl502/location/:imei/latest',
        history: 'GET /api/vl502/location/:imei/history',
        live: 'GET /api/vl502/location/:imei/live'
      },
      obd: {
        latest: 'GET /api/vl502/obd/:imei/latest',
        history: 'GET /api/vl502/obd/:imei/history'
      },
      alarms: {
        active: 'GET /api/vl502/alarms/:imei/active',
        history: 'GET /api/vl502/alarms/:imei/history',
        acknowledge: 'PATCH /api/vl502/alarms/:alarmId/acknowledge',
        resolve: 'PATCH /api/vl502/alarms/:alarmId/resolve'
      },
      trips: {
        current: 'GET /api/vl502/trips/:imei/current',
        history: 'GET /api/vl502/trips/:imei/history'
      },
      dtc: {
        active: 'GET /api/vl502/dtc/:imei/active',
        clear: 'DELETE /api/vl502/dtc/:dtcId',
        clearAll: 'DELETE /api/vl502/dtc/:imei/all'
      },
      emergency: {
        list: 'GET /api/vl502/emergency/:imei'
      },
      vehicleStatus: {
        latest: 'GET /api/vl502/vehicle-status/:imei'
      },
      parameters: {
        list: 'GET /api/vl502/parameters/:imei'
      },
      commands: {
        setParameter: 'POST /api/vl502/commands/:imei/set-parameter',
        control: 'POST /api/vl502/commands/:imei/control',
        history: 'GET /api/vl502/commands/:imei/history'
      },
      stats: {
        stats: 'GET /api/vl502/stats/:imei',
        dashboard: 'GET /api/vl502/dashboard/:imei'
      }
    }
  });
});

export default router;