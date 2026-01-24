import { Request } from 'express';

/**
 * Field Selection Utility
 * Allows clients to specify which fields they need in the response
 * Reduces payload size and improves performance
 */

/**
 * Default fields for common models
 */
export const DEFAULT_FIELDS = {
  TICKET_LIST: ['_id', 'subject', 'status', 'priority', 'department', 'createdAt', 'assignedToName'],
  TICKET_DETAIL: ['_id', 'subject', 'description', 'status', 'priority', 'department', 'createdAt', 'updatedAt', 'assignedTo', 'assignedToName', 'comments', 'attachments'],
  USER_PUBLIC: ['_id', 'name', 'email', 'department', 'isHead'],
  USER_DETAIL: ['_id', 'name', 'email', 'department', 'isHead', 'createdAt', 'role'],
};

/**
 * Sensitive fields that should never be returned
 */
const EXCLUDED_FIELDS = new Set([
  'password',
  '__v',
  'verificationOTP',
  'otpExpiry',
  'resetPasswordToken',
  'resetPasswordExpiry',
  'refreshToken',
  'sessions',
]);

/**
 * Parse fields parameter from request query
 * @param req - Express request object
 * @param allowedFields - Optional list of allowed fields
 * @returns MongoDB projection string or object
 */
export function parseFieldSelection(
  req: Request,
  allowedFields?: string[]
): string | null {
  const fieldsParam = req.query.fields as string | undefined;
  
  if (!fieldsParam) {
    return null; // Return all fields (except excluded)
  }

  // Parse comma-separated fields
  let requestedFields = fieldsParam
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  // Filter out excluded (sensitive) fields
  requestedFields = requestedFields.filter(f => !EXCLUDED_FIELDS.has(f));

  // If allowedFields provided, only allow those
  if (allowedFields && allowedFields.length > 0) {
    requestedFields = requestedFields.filter(f => allowedFields.includes(f));
  }

  // Always include _id unless explicitly excluded
  if (!requestedFields.includes('_id') && !requestedFields.includes('-_id')) {
    requestedFields.unshift('_id');
  }

  // Return as MongoDB projection string
  return requestedFields.join(' ');
}

/**
 * Parse fields parameter and return as MongoDB projection object
 */
export function parseFieldSelectionObject(
  req: Request,
  allowedFields?: string[]
): Record<string, 1> | null {
  const fieldsString = parseFieldSelection(req, allowedFields);
  
  if (!fieldsString) {
    return null;
  }

  const projection: Record<string, 1> = {};
  fieldsString.split(' ').forEach(field => {
    if (!field.startsWith('-')) {
      projection[field] = 1;
    }
  });

  return projection;
}

/**
 * Build a safe select string that excludes sensitive fields
 */
export function buildSafeSelect(
  baseSelect?: string,
  additionalExcludes?: string[]
): string {
  const excludes = [...EXCLUDED_FIELDS];
  
  if (additionalExcludes) {
    excludes.push(...additionalExcludes);
  }

  const excludeString = excludes.map(f => `-${f}`).join(' ');
  
  if (baseSelect) {
    return `${baseSelect} ${excludeString}`;
  }
  
  return excludeString;
}

/**
 * Filter object to only include specified fields
 * Useful for in-memory filtering after database fetch
 */
export function pickFields<T extends Record<string, any>>(
  obj: T,
  fields: string[]
): Partial<T> {
  const result: Partial<T> = {};
  
  fields.forEach(field => {
    if (field in obj && !EXCLUDED_FIELDS.has(field)) {
      (result as any)[field] = obj[field];
    }
  });
  
  return result;
}

/**
 * Filter array of objects to only include specified fields
 */
export function pickFieldsArray<T extends Record<string, any>>(
  arr: T[],
  fields: string[]
): Partial<T>[] {
  return arr.map(obj => pickFields(obj, fields));
}

/**
 * Omit specified fields from an object
 */
export function omitFields<T extends Record<string, any>>(
  obj: T,
  fieldsToOmit: string[]
): Partial<T> {
  const result: Partial<T> = { ...obj };
  
  // Always omit sensitive fields
  [...fieldsToOmit, ...EXCLUDED_FIELDS].forEach(field => {
    delete (result as any)[field];
  });
  
  return result;
}

/**
 * Omit fields from array of objects
 */
export function omitFieldsArray<T extends Record<string, any>>(
  arr: T[],
  fieldsToOmit: string[]
): Partial<T>[] {
  return arr.map(obj => omitFields(obj, fieldsToOmit));
}

/**
 * Middleware to attach field selection to request
 */
export function fieldSelectionMiddleware(allowedFields?: string[]) {
  return (req: Request, res: any, next: any) => {
    (req as any).fieldSelection = parseFieldSelection(req, allowedFields);
    next();
  };
}

/**
 * Validate that requested fields are a subset of allowed fields
 */
export function validateFieldSelection(
  requestedFields: string[],
  allowedFields: string[]
): { valid: boolean; invalid: string[] } {
  const invalid = requestedFields.filter(
    f => !allowedFields.includes(f) && !EXCLUDED_FIELDS.has(f)
  );
  
  return {
    valid: invalid.length === 0,
    invalid,
  };
}

export default {
  parseFieldSelection,
  parseFieldSelectionObject,
  buildSafeSelect,
  pickFields,
  pickFieldsArray,
  omitFields,
  omitFieldsArray,
  fieldSelectionMiddleware,
  validateFieldSelection,
  DEFAULT_FIELDS,
};
