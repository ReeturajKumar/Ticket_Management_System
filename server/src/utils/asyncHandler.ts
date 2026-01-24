import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Handler Wrapper
 * Eliminates the need for try-catch in every controller
 * Automatically passes errors to the global error handler
 */

/**
 * Type definition for async request handler
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wrap an async route handler to automatically catch errors
 * and pass them to Express error handling middleware
 * 
 * @param fn - Async route handler function
 * @returns Express middleware that catches errors
 * 
 * @example
 * // Before (with try-catch)
 * router.get('/', async (req, res, next) => {
 *   try {
 *     const data = await fetchData();
 *     res.json(data);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 * 
 * // After (with asyncHandler)
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Higher-order function to wrap controller methods
 * Useful for class-based controllers
 * 
 * @example
 * class TicketController {
 *   @catchAsync
 *   async getTickets(req: Request, res: Response) {
 *     const tickets = await Ticket.find();
 *     res.json(tickets);
 *   }
 * }
 */
export function catchAsync(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const [req, res, next] = args;
    Promise.resolve(originalMethod.apply(this, args)).catch(next);
  };
  
  return descriptor;
}

/**
 * Wrap multiple handlers at once
 * Useful for applying to an array of route handlers
 */
export function wrapHandlers(handlers: AsyncRequestHandler[]): RequestHandler[] {
  return handlers.map(handler => asyncHandler(handler));
}

/**
 * Create a controller with all methods wrapped
 * 
 * @example
 * const ticketController = createController({
 *   getTickets: async (req, res) => { ... },
 *   createTicket: async (req, res) => { ... },
 * });
 */
export function createController<T extends Record<string, AsyncRequestHandler>>(
  handlers: T
): { [K in keyof T]: RequestHandler } {
  const wrapped: Partial<{ [K in keyof T]: RequestHandler }> = {};
  
  for (const key in handlers) {
    wrapped[key] = asyncHandler(handlers[key]);
  }
  
  return wrapped as { [K in keyof T]: RequestHandler };
}

export default asyncHandler;
