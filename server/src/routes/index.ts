import { Router } from 'express';
import mongoose from 'mongoose';
import { 
  baseDeptRouter, 
  deptAuthRouter, 
  deptDashboardRouter, 
  deptTicketRouter, 
  deptTeamRouter, 
  deptReportsRouter, 
  deptStaffRouter 
} from './departmentRoutes';
import publicRoutes from './publicRoutes';
import { adminAuthRouter, adminActionRouter } from './adminRoutes';
import { authRouter, managementRouter, actionRouter } from './employeeRoutes';
import { getConnectionStats } from '../config/db';
import { getSocketStats, SOCKET_EVENTS } from '../utils/socket';

const router = Router();

router.use('/departments', baseDeptRouter);
router.use('/department-auth', deptAuthRouter);
router.use('/admin-auth', adminAuthRouter);
router.use('/public', publicRoutes);
router.use('/admin', adminActionRouter);
router.use('/department/dashboard', deptDashboardRouter);
router.use('/department/tickets', deptTicketRouter);
router.use('/department/team', deptTeamRouter);
router.use('/department/reports', deptReportsRouter);
router.use('/department/staff', deptStaffRouter);
router.use('/employees', managementRouter);
router.use('/employee-auth', authRouter);
router.use('/employee', actionRouter);

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  res.json({
    success: dbState === 1,
    status: dbState === 1 ? 'healthy' : 'degraded',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

router.get('/health/detailed', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const dbInfo = getConnectionStats();
  const socketStats = getSocketStats();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: dbState === 1,
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    services: {
      database: {
        status: dbStatus,
        healthy: dbState === 1,
        host: dbInfo.host,
        name: dbInfo.name,
      },
      websocket: {
        status: 'running',
        healthy: true,
        totalConnections: socketStats.totalConnections,
        departmentRooms: socketStats.departmentRooms.length,
      },
    },
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    },
    node: {
      version: process.version,
    },
  });
});

router.get('/ws/stats', (req, res) => {
  const socketStats = getSocketStats();
  res.json({
    success: true,
    data: {
      ...socketStats,
      availableEvents: Object.keys(SOCKET_EVENTS),
    },
  });
});

export default router;
