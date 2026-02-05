import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function catchAsync(
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const next = args[2];
    Promise.resolve(originalMethod.apply(this, args)).catch(next);
  };
  return descriptor;
}

export function wrapHandlers(handlers: AsyncRequestHandler[]): RequestHandler[] {
  return handlers.map(asyncHandler);
}

export function createController<T extends Record<string, AsyncRequestHandler>>(
  handlers: T
): { [K in keyof T]: RequestHandler } {
  return Object.entries(handlers).reduce((acc, [key, handler]) => {
    acc[key as keyof T] = asyncHandler(handler);
    return acc;
  }, {} as any);
}

export default asyncHandler;
