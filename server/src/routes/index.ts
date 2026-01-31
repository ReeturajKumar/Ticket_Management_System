import { Router } from 'express';
import mongoose from 'mongoose';
import departmentRoutes from './departmentRoutes';
import publicRoutes from './publicRoutes';
import departmentAuthRoutes from './departmentAuthRoutes';
import adminAuthRoutes from './adminAuthRoutes';
import adminRoutes from './adminRoutes';
import departmentDashboardRoutes from './departmentDashboardRoutes';
import departmentTicketRoutes from './departmentTicketRoutes';
import departmentTeamRoutes from './departmentTeamRoutes';
import departmentReportsRoutes from './departmentReportsRoutes';
import departmentStaffRoutes from './departmentStaffRoutes';
import employeeRoutes from './employeeRoutes';
import employeeAuthRoutes from './employeeAuthRoutes';
import employeeActionRoutes from './employeeActionRoutes';
import { getCacheStats, cacheCleanup } from '../utils/cache';
import { getConnectionStats } from '../config/db';
import { getSocketStats, SOCKET_EVENTS } from '../utils/socket';
import { verifySMTPConnection } from '../utils/email';

const router = Router();

// Mount route modules
// Note: User authentication and ticket routes have been removed
// A new public ticket submission endpoint will be added

router.use('/departments', departmentRoutes);
router.use('/department-auth', departmentAuthRoutes);
router.use('/admin-auth', adminAuthRoutes);
router.use('/public', publicRoutes);
router.use('/admin', adminRoutes);
router.use('/department/dashboard', departmentDashboardRoutes);
router.use('/department/tickets', departmentTicketRoutes);
router.use('/department/team', departmentTeamRoutes);
router.use('/department/reports', departmentReportsRoutes);
router.use('/department/staff', departmentStaffRoutes);
router.use('/employees', employeeRoutes);
router.use('/employee-auth', employeeAuthRoutes);
router.use('/employee', employeeActionRoutes);

// Basic health check route
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

// Detailed health check with metrics (for monitoring systems)
router.get('/health/detailed', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  // Get cache statistics
  const cacheStats = getCacheStats();
  
  // Get database connection info
  const dbInfo = getConnectionStats();
  
  // Check SMTP connection (async)
  const smtpStatus = await verifySMTPConnection();
  
  // Get WebSocket stats
  const socketStats = getSocketStats();
  
  // Memory usage
  const memoryUsage = process.memoryUsage();
  
  // Determine overall health status
  const isHealthy = dbState === 1;
  const hasDegradedServices = !smtpStatus.connected;
  
  res.json({
    success: isHealthy,
    status: !isHealthy ? 'unhealthy' : hasDegradedServices ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    
    services: {
      database: {
        status: dbStatus,
        healthy: dbState === 1,
        host: dbInfo.host,
        name: dbInfo.name,
      },
      
      email: {
        status: smtpStatus.connected ? 'connected' : 'disconnected',
        healthy: smtpStatus.connected,
        error: smtpStatus.error || null,
      },
      
      websocket: {
        status: 'running',
        healthy: true,
        totalConnections: socketStats.totalConnections,
        departmentRooms: socketStats.departmentRooms.length,
      },
    },
    
    cache: {
      entries: cacheStats.activeEntries,
      hitRate: cacheStats.hitRate,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
    },
    
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    },
    
    node: {
      version: process.version,
      platform: process.platform,
    },
  });
});

// Cache management endpoint (for admin use)
router.post('/cache/cleanup', (req, res) => {
  const cleaned = cacheCleanup();
  res.json({
    success: true,
    message: `Cleaned ${cleaned} expired cache entries`,
    stats: getCacheStats(),
  });
});

// WebSocket statistics endpoint
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
