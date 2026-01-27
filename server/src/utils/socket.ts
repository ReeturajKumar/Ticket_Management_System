import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

/**
 * Socket.IO Real-Time Communication Service
 * 
 * Provides real-time notifications for:
 * - New ticket creation
 * - Ticket status updates
 * - Ticket assignment
 * - New comments
 * - Team notifications
 */

let io: Server | null = null;

// Connected users map: { odId: socketId }
const connectedUsers = new Map<string, string>();

// Department rooms map for broadcasting to department members
const departmentRooms = new Map<string, Set<string>>();

/**
 * Socket event types
 */
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_DEPARTMENT: 'join:department',
  LEAVE_DEPARTMENT: 'leave:department',
  AUTHENTICATE: 'authenticate',
  
  // Server -> Client
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
  TICKET_ASSIGNED: 'ticket:assigned',
  TICKET_STATUS_CHANGED: 'ticket:status-changed',
  TICKET_PRIORITY_CHANGED: 'ticket:priority-changed',
  TICKET_COMMENT_ADDED: 'ticket:comment-added',
  
  // Notifications
  NOTIFICATION: 'notification',
  
  // User events (for admin)
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  
  // Bulk operations
  BULK_OPERATION_STARTED: 'bulk:started',
  BULK_OPERATION_PROGRESS: 'bulk:progress',
  BULK_OPERATION_COMPLETED: 'bulk:completed',
  
  // Connection
  CONNECTED: 'connected',
  ERROR: 'error',
};

/**
 * Notification types
 */
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Notification payload interface
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        process.env.CLIENT_URL || 'https://ticket-management-system-nine.vercel.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle authentication
    socket.on(SOCKET_EVENTS.AUTHENTICATE, (data: { userId: string; department?: string }) => {
      if (data.userId) {
        connectedUsers.set(data.userId, socket.id);
        socket.data.userId = data.userId;
        socket.data.department = data.department;
        
        console.log(`User authenticated: ${data.userId}`);
        
        socket.emit(SOCKET_EVENTS.CONNECTED, {
          message: 'Successfully connected to real-time updates',
          socketId: socket.id,
        });
      }
    });

    // Handle joining department room
    socket.on(SOCKET_EVENTS.JOIN_DEPARTMENT, (department: string) => {
      if (department) {
        const roomName = `department:${department}`;
        socket.join(roomName);
        socket.data.department = department;
        
        // Track department membership
        if (!departmentRooms.has(department)) {
          departmentRooms.set(department, new Set());
        }
        departmentRooms.get(department)!.add(socket.id);
        
        console.log(`Socket ${socket.id} joined department: ${department}`);
      }
    });

    // Handle leaving department room
    socket.on(SOCKET_EVENTS.LEAVE_DEPARTMENT, (department: string) => {
      if (department) {
        const roomName = `department:${department}`;
        socket.leave(roomName);
        
        // Remove from tracking
        departmentRooms.get(department)?.delete(socket.id);
        
        console.log(`Socket ${socket.id} left department: ${department}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove from connected users
      for (const [odId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(odId);
          break;
        }
      }
      
      // Remove from department rooms
      for (const [dept, sockets] of departmentRooms.entries()) {
        sockets.delete(socket.id);
      }
      
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): Server | null => io;

/**
 * Emit event to specific user
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

/**
 * Emit event to all users in a department
 */
export const emitToDepartment = (department: string, event: string, data: any): void => {
  if (io) {
    const roomName = `department:${department}`;
    io.to(roomName).emit(event, data);
  }
};

/**
 * Emit event to all connected clients
 */
export const emitToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Send notification to user
 */
export const notifyUser = (
  userId: string,
  notification: Omit<NotificationPayload, 'timestamp'>
): void => {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, {
    ...notification,
    timestamp: new Date(),
  });
};

/**
 * Send notification to department
 */
export const notifyDepartment = (
  department: string,
  notification: Omit<NotificationPayload, 'timestamp'>
): void => {
  emitToDepartment(department, SOCKET_EVENTS.NOTIFICATION, {
    ...notification,
    timestamp: new Date(),
  });
};

// ============================================================================
// TICKET EVENT EMITTERS
// ============================================================================

/**
 * Emit new ticket created event
 */
export const emitTicketCreated = (department: string, ticket: any): void => {
  // Emit in format expected by client
  // The client's useNotificationSocket hook will handle adding this to the notification store
  emitToDepartment(department, SOCKET_EVENTS.TICKET_CREATED, {
    ticketId: ticket._id?.toString() || ticket.id,
    subject: ticket.subject,
    department: department,
    priority: ticket.priority,
    status: ticket.status,
    createdBy: ticket.createdByName || ticket.contactName || 'Guest',
    createdAt: ticket.createdAt?.toISOString?.() || ticket.createdAt,
  });
  
  console.log(`[Socket] Emitted ticket:created to department ${department}:`, ticket.subject);
  
  // Note: Removed redundant notifyDepartment call to prevent duplicate notifications
  // The client's useNotificationSocket hook handles ticket:created events and adds notifications
};

/**
 * Emit ticket assigned event
 */
export const emitTicketAssigned = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  assignedToUserId: string,
  assignedToName: string,
  assignedByName: string
): void => {
  // Notify department - format matches client's TicketAssignedEvent interface
  emitToDepartment(department, SOCKET_EVENTS.TICKET_ASSIGNED, {
    ticketId,
    subject: ticketSubject,
    assigneeId: assignedToUserId,
    assigneeName: assignedToName,
    assignedBy: assignedByName,
    department: department,
  });
  
  console.log(`[Socket] Emitted ticket:assigned to department ${department}: ${ticketSubject} -> ${assignedToName}`);
  
  // Notify assigned user specifically
  notifyUser(assignedToUserId, {
    type: NotificationType.INFO,
    title: 'Ticket Assigned',
    message: `You have been assigned: ${ticketSubject}`,
    data: { ticketId },
  });
};

/**
 * Emit ticket status changed event
 */
export const emitTicketStatusChanged = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  oldStatus: string,
  newStatus: string,
  changedByName: string
): void => {
  // Format matches client's TicketStatusChangedEvent interface
  emitToDepartment(department, SOCKET_EVENTS.TICKET_STATUS_CHANGED, {
    ticketId,
    subject: ticketSubject,
    previousStatus: oldStatus,
    newStatus: newStatus,
    changedBy: changedByName,
    department: department,
  });
};

/**
 * Emit ticket priority changed event
 */
export const emitTicketPriorityChanged = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  oldPriority: string,
  newPriority: string,
  changedByName: string
): void => {
  // Format matches client's TicketPriorityChangedEvent interface
  emitToDepartment(department, SOCKET_EVENTS.TICKET_PRIORITY_CHANGED, {
    ticketId,
    subject: ticketSubject,
    previousPriority: oldPriority,
    newPriority: newPriority,
    changedBy: changedByName,
    department: department,
  });
};

/**
 * Emit comment added event
 */
export const emitCommentAdded = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  commenterName: string,
  isInternal: boolean
): void => {
  emitToDepartment(department, SOCKET_EVENTS.TICKET_COMMENT_ADDED, {
    ticketId,
    ticketSubject,
    commenter: commenterName,
    isInternal,
    timestamp: new Date(),
  });
};

// ============================================================================
// USER EVENT EMITTERS (for admin dashboard)
// ============================================================================

/**
 * Emit user created event (broadcast to all admins)
 */
export const emitUserCreated = (user: any): void => {
  emitToAll(SOCKET_EVENTS.USER_CREATED, {
    userId: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    isHead: user.isHead,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
  });
};

/**
 * Emit user updated event (broadcast to all admins)
 */
export const emitUserUpdated = (user: any): void => {
  emitToAll(SOCKET_EVENTS.USER_UPDATED, {
    userId: user._id?.toString() || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    isHead: user.isHead,
    approvalStatus: user.approvalStatus,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
  });
};

// ============================================================================
// BULK OPERATION EVENT EMITTERS
// ============================================================================

/**
 * Emit bulk operation started
 */
export const emitBulkOperationStarted = (
  userId: string,
  operationId: string,
  operationType: string,
  totalItems: number
): void => {
  emitToUser(userId, SOCKET_EVENTS.BULK_OPERATION_STARTED, {
    operationId,
    operationType,
    totalItems,
    timestamp: new Date(),
  });
};

/**
 * Emit bulk operation progress
 */
export const emitBulkOperationProgress = (
  userId: string,
  operationId: string,
  processed: number,
  total: number
): void => {
  emitToUser(userId, SOCKET_EVENTS.BULK_OPERATION_PROGRESS, {
    operationId,
    processed,
    total,
    percentage: Math.round((processed / total) * 100),
    timestamp: new Date(),
  });
};

/**
 * Emit bulk operation completed
 */
export const emitBulkOperationCompleted = (
  userId: string,
  operationId: string,
  result: {
    success: boolean;
    processed: number;
    failed: number;
    message: string;
  }
): void => {
  emitToUser(userId, SOCKET_EVENTS.BULK_OPERATION_COMPLETED, {
    operationId,
    ...result,
    timestamp: new Date(),
  });
  
  // Also send notification
  notifyUser(userId, {
    type: result.success ? NotificationType.SUCCESS : NotificationType.ERROR,
    title: 'Bulk Operation Complete',
    message: result.message,
    data: { operationId },
  });
};

/**
 * Get connection statistics
 */
export const getSocketStats = () => ({
  totalConnections: connectedUsers.size,
  departmentRooms: Array.from(departmentRooms.entries()).map(([dept, sockets]) => ({
    department: dept,
    connections: sockets.size,
  })),
});

export default {
  initialize: initializeSocket,
  getIO,
  emitToUser,
  emitToDepartment,
  emitToAll,
  notifyUser,
  notifyDepartment,
  emitTicketCreated,
  emitTicketAssigned,
  emitTicketStatusChanged,
  emitTicketPriorityChanged,
  emitCommentAdded,
  emitUserCreated,
  emitUserUpdated,
  emitBulkOperationStarted,
  emitBulkOperationProgress,
  emitBulkOperationCompleted,
  getStats: getSocketStats,
  EVENTS: SOCKET_EVENTS,
};
