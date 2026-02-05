import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;
const connectedUsers = new Map<string, string>();
const departmentRooms = new Map<string, Set<string>>();

export const SOCKET_EVENTS = {
  JOIN_DEPARTMENT: 'join:department',
  LEAVE_DEPARTMENT: 'leave:department',
  AUTHENTICATE: 'authenticate',
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
  TICKET_ASSIGNED: 'ticket:assigned',
  TICKET_STATUS_CHANGED: 'ticket:status-changed',
  TICKET_PRIORITY_CHANGED: 'ticket:priority-changed',
  TICKET_COMMENT_ADDED: 'ticket:comment-added',
  NOTIFICATION: 'notification',
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  BULK_OPERATION_STARTED: 'bulk:started',
  BULK_OPERATION_PROGRESS: 'bulk:progress',
  BULK_OPERATION_COMPLETED: 'bulk:completed',
  CONNECTED: 'connected',
  ERROR: 'error',
};

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  senderId?: string;
  data?: any;
  timestamp: Date;
}

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
    console.log('🔌 New socket connection:', socket.id);
    
    socket.on(SOCKET_EVENTS.AUTHENTICATE, (data: { userId: string; department?: string }) => {
      console.log('🔐 Socket authentication attempt:', data);
      if (data.userId) {
        connectedUsers.set(data.userId, socket.id);
        socket.data.userId = data.userId;
        socket.data.department = data.department;
        
        console.log(`✅ User ${data.userId} authenticated with socket ${socket.id}`);
        console.log('👥 Connected users:', Array.from(connectedUsers.keys()));
        
        socket.emit('authenticated', {
          message: 'Successfully connected to real-time updates',
          socketId: socket.id,
        });
      }
    });

    socket.on(SOCKET_EVENTS.JOIN_DEPARTMENT, (department: string) => {
      if (department) {
        const roomName = `department:${department}`;
        socket.join(roomName);
        socket.data.department = department;
        
        if (!departmentRooms.has(department)) {
          departmentRooms.set(department, new Set());
        }
        departmentRooms.get(department)!.add(socket.id);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_DEPARTMENT, (department: string) => {
      if (department) {
        const roomName = `department:${department}`;
        socket.leave(roomName);
        departmentRooms.get(department)?.delete(socket.id);
      }
    });

    socket.on('disconnect', () => {
      for (const [odId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(odId);
          break;
        }
      }
      for (const sockets of departmentRooms.values()) {
        sockets.delete(socket.id);
      }
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

export const emitToUser = (userId: string, event: string, data: any): void => {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

export const emitToDepartment = (department: string, event: string, data: any): void => {
  if (io) {
    const roomName = `department:${department}`;
    io.to(roomName).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};

export const notifyUser = (
  userId: string,
  notification: Omit<NotificationPayload, 'timestamp'>
): void => {
  emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, {
    ...notification,
    timestamp: new Date(),
  });
};

export const notifyDepartment = (
  department: string,
  notification: Omit<NotificationPayload, 'timestamp'>
): void => {
  emitToDepartment(department, SOCKET_EVENTS.NOTIFICATION, {
    ...notification,
    timestamp: new Date(),
  });
};

export const emitToAdmins = async (event: string, data: any): Promise<void> => {
  try {
    // Import User model dynamically to avoid circular dependencies
    const User = (await import('../models/User')).default;
    const { UserRole } = await import('../constants');
    
    // Find all admin users
    const adminUsers = await User.find({ role: UserRole.ADMIN }).select('_id');
    
    // Emit event to each admin
    adminUsers.forEach(admin => {
      emitToUser(admin._id.toString(), event, data);
    });
  } catch (error) {
    console.error('Failed to emit to admins:', error);
  }
};

export const notifyAdmins = async (
  notification: Omit<NotificationPayload, 'timestamp'>
): Promise<void> => {
  try {
    // Import User model dynamically to avoid circular dependencies
    const User = (await import('../models/User')).default;
    const { UserRole } = await import('../constants');
    
    // Find all admin users
    const adminUsers = await User.find({ role: UserRole.ADMIN }).select('_id');
    
    // Send notification to each admin
    adminUsers.forEach(admin => {
      emitToUser(admin._id.toString(), SOCKET_EVENTS.NOTIFICATION, {
        ...notification,
        timestamp: new Date(),
      });
    });
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};

export const emitTicketCreated = (department: string, ticket: any): void => {
  const payload = {
    ticketId: ticket._id?.toString() || ticket.id,
    subject: ticket.subject,
    department: department,
    priority: ticket.priority,
    status: ticket.status,
    createdBy: ticket.createdByName || ticket.contactName || 'Guest',
    authorId: ticket.createdBy?.toString(),
    createdAt: ticket.createdAt?.toISOString?.() || ticket.createdAt,
  };

  emitToDepartment(department, SOCKET_EVENTS.TICKET_CREATED, payload);
  
  if (ticket.createdBy) {
    emitToUser(ticket.createdBy.toString(), SOCKET_EVENTS.TICKET_CREATED, payload);
  }

  // Emit to all admin users for real-time dashboard updates
  emitToAdmins(SOCKET_EVENTS.TICKET_CREATED, payload);
  
  notifyDepartment(department, {
    type: NotificationType.INFO,
    title: 'New Ticket Created',
    message: ticket.subject,
    senderId: ticket.createdBy?.toString(),
    data: { 
      ticketId: ticket._id?.toString() || ticket.id,
      priority: ticket.priority
    }
  });

  // Notify admins about new tickets, especially critical ones
  const notificationTitle = ticket.priority === 'CRITICAL' 
    ? '🚨 Critical Ticket Created' 
    : 'New Ticket Created';
  
  notifyAdmins({
    type: ticket.priority === 'CRITICAL' ? NotificationType.WARNING : NotificationType.INFO,
    title: notificationTitle,
    message: `${ticket.subject} (${department})`,
    senderId: ticket.createdBy?.toString(),
    data: { 
      ticketId: ticket._id?.toString() || ticket.id,
      priority: ticket.priority,
      department: department
    }
  });
};

export const emitTicketAssigned = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  assignedToUserId: string,
  assignedToName: string,
  assignedByName: string,
  senderId?: string
): void => {
  const payload = {
    ticketId,
    subject: ticketSubject,
    assigneeId: assignedToUserId,
    assigneeName: assignedToName,
    assignedBy: assignedByName,
    department: department,
  };

  emitToDepartment(department, SOCKET_EVENTS.TICKET_ASSIGNED, payload);

  // Emit to admins for real-time dashboard updates
  emitToAdmins(SOCKET_EVENTS.TICKET_ASSIGNED, payload);
  
  notifyUser(assignedToUserId, {
    type: NotificationType.INFO,
    title: 'Ticket Assigned',
    message: `You have been assigned: ${ticketSubject}`,
    senderId,
    data: { ticketId },
  });
};

export const emitTicketStatusChanged = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  oldStatus: string,
  newStatus: string,
  changedByName: string,
  recipientUserId?: string,
  senderId?: string
): void => {
  const payload = {
    ticketId,
    subject: ticketSubject,
    previousStatus: oldStatus,
    newStatus: newStatus,
    changedBy: changedByName,
    department: department,
    senderId,
  };

  emitToDepartment(department, SOCKET_EVENTS.TICKET_STATUS_CHANGED, payload);

  // Emit to admins for real-time dashboard updates
  emitToAdmins(SOCKET_EVENTS.TICKET_STATUS_CHANGED, payload);

  if (recipientUserId) {
    emitToUser(recipientUserId, SOCKET_EVENTS.TICKET_STATUS_CHANGED, payload);
    
    notifyUser(recipientUserId, {
      type: NotificationType.SUCCESS,
      title: 'Ticket Status Updated',
      message: `Your ticket "${ticketSubject}" is now ${newStatus}`,
      senderId: senderId || '',
      data: { ticketId }
    });
  }
};

export const emitTicketPriorityChanged = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  oldPriority: string,
  newPriority: string,
  changedByName: string,
  recipientUserId?: string,
  senderId?: string
): void => {
  const payload = {
    ticketId,
    subject: ticketSubject,
    previousPriority: oldPriority,
    newPriority: newPriority,
    changedBy: changedByName,
    department: department,
    senderId,
  };

  emitToDepartment(department, SOCKET_EVENTS.TICKET_PRIORITY_CHANGED, payload);

  if (recipientUserId) {
    emitToUser(recipientUserId, SOCKET_EVENTS.TICKET_PRIORITY_CHANGED, payload);
    
    notifyUser(recipientUserId, {
      type: NotificationType.INFO,
      title: 'Ticket Priority Updated',
      message: `Priority for "${ticketSubject}" changed to ${newPriority}`,
      senderId: senderId || '',
      data: { ticketId }
    });
  }
};

export const emitCommentAdded = (
  department: string,
  ticketId: string,
  ticketSubject: string,
  commenterName: string,
  commenterId: string,
  content: string,
  isInternal: boolean,
  recipientUserId?: string
): void => {
  const payload = {
    ticketId,
    ticketSubject,
    department,
    authorName: commenterName,
    authorId: commenterId,
    recipientId: recipientUserId,
    content,
    isInternal,
    timestamp: new Date(),
  };

  emitToDepartment(department, SOCKET_EVENTS.TICKET_COMMENT_ADDED, payload);

  if (!isInternal && recipientUserId) {
    emitToUser(recipientUserId, SOCKET_EVENTS.TICKET_COMMENT_ADDED, payload);

    notifyUser(recipientUserId, {
      type: NotificationType.INFO,
      title: 'New Reply Received',
      message: `${commenterName} replied to your ticket: ${ticketSubject}`,
      senderId: commenterId,
      data: { 
        ticketId,
        commenter: commenterName
      }
    });
  }
};

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
  
  notifyUser(userId, {
    type: result.success ? NotificationType.SUCCESS : NotificationType.ERROR,
    title: 'Bulk Operation Complete',
    message: result.message,
    data: { operationId },
  });
};

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
  emitToAdmins,
  notifyUser,
  notifyDepartment,
  notifyAdmins,
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
