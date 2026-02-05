import { Request } from 'express';

/**
 * FIELD SELECTION
 */
export const DEFAULT_FIELDS = {
  TICKET_LIST: ['_id', 'subject', 'status', 'priority', 'department', 'createdAt', 'assignedToName'],
  TICKET_DETAIL: ['_id', 'subject', 'description', 'status', 'priority', 'department', 'createdAt', 'updatedAt', 'assignedTo', 'assignedToName', 'comments', 'attachments'],
  USER_PUBLIC: ['_id', 'name', 'email', 'department', 'isHead'],
  USER_DETAIL: ['_id', 'name', 'email', 'department', 'isHead', 'createdAt', 'role'],
};

const EXCLUDED_FIELDS = new Set(['password', '__v', 'refreshToken', 'sessions']);

export function parseFieldSelection(req: Request, allowedFields?: string[]): string | null {
  const fieldsParam = req.query.fields as string | undefined;
  if (!fieldsParam) return null;

  let requestedFields = fieldsParam.split(',').map(f => f.trim()).filter(f => f.length > 0);
  requestedFields = requestedFields.filter(f => !EXCLUDED_FIELDS.has(f));

  if (allowedFields?.length) {
    requestedFields = requestedFields.filter(f => allowedFields.includes(f));
  }

  if (!requestedFields.includes('_id') && !requestedFields.includes('-_id')) {
    requestedFields.unshift('_id');
  }

  return requestedFields.join(' ');
}

/**
 * PAGINATION
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  count: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function parsePaginationParams(req: Request, defaults: any = {}): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || defaults.page || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || defaults.limit || 20), 100);
  
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: (req.query.sort as string) || defaults.sort || 'createdAt',
    order: ((req.query.order as string) || defaults.order || 'desc') as 'asc' | 'desc',
  };
}

export function buildPaginationMeta(total: number, params: PaginationParams, count: number): PaginationMeta {
  const pages = Math.ceil(total / params.limit);
  return {
    total,
    page: params.page,
    limit: params.limit,
    pages,
    count,
    hasNext: params.page < pages,
    hasPrev: params.page > 1,
  };
}
