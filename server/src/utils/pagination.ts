import { Request } from 'express';

/**
 * Pagination Utility
 * Provides comprehensive pagination metadata and helpers
 */

/**
 * Pagination parameters from request
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  cursor?: string;
  sort: string;
  order: 'asc' | 'desc';
}

/**
 * Comprehensive pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  count: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
  // Cursor-based pagination
  cursor?: string | null;
  nextCursor?: string | null;
  hasMore?: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse pagination parameters from request query
 * @param req - Express request object
 * @param defaults - Default values
 */
export function parsePaginationParams(
  req: Request,
  defaults: {
    page?: number;
    limit?: number;
    maxLimit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}
): PaginationParams {
  const {
    page = 1,
    limit = 20,
    maxLimit = 100,
    sort = 'createdAt',
    order = 'desc',
  } = defaults;

  const queryPage = parseInt(req.query.page as string) || page;
  const queryLimit = Math.min(
    parseInt(req.query.limit as string) || limit,
    maxLimit
  );
  const queryCursor = req.query.cursor as string | undefined;
  const querySort = (req.query.sort as string) || sort;
  const queryOrder = ((req.query.order as string) || order) as 'asc' | 'desc';

  return {
    page: Math.max(1, queryPage),
    limit: Math.max(1, queryLimit),
    skip: (Math.max(1, queryPage) - 1) * queryLimit,
    cursor: queryCursor,
    sort: querySort,
    order: queryOrder,
  };
}

/**
 * Build comprehensive pagination metadata
 * @param total - Total number of items
 * @param params - Pagination parameters
 * @param count - Number of items in current page
 * @param nextCursor - Next cursor for cursor-based pagination
 */
export function buildPaginationMeta(
  total: number,
  params: PaginationParams,
  count: number,
  nextCursor?: string | null
): PaginationMeta {
  const pages = Math.ceil(total / params.limit);
  const hasNext = params.page < pages;
  const hasPrev = params.page > 1;

  return {
    total,
    page: params.page,
    limit: params.limit,
    pages,
    count,
    hasNext,
    hasPrev,
    nextPage: hasNext ? params.page + 1 : null,
    prevPage: hasPrev ? params.page - 1 : null,
    // Cursor-based pagination fields
    cursor: params.cursor || null,
    nextCursor: nextCursor || null,
    hasMore: nextCursor !== null,
  };
}

/**
 * Build pagination metadata for cursor-based pagination (without total count)
 * More efficient for large datasets as it doesn't require counting all documents
 */
export function buildCursorPaginationMeta(
  count: number,
  limit: number,
  nextCursor: string | null,
  cursor?: string
): Omit<PaginationMeta, 'total' | 'page' | 'pages' | 'nextPage' | 'prevPage'> {
  return {
    limit,
    count,
    hasNext: nextCursor !== null,
    hasPrev: !!cursor,
    cursor: cursor || null,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): PaginatedResponse<T> {
  return {
    data,
    pagination,
  };
}

/**
 * Helper to get pagination links (for HATEOAS)
 */
export function getPaginationLinks(
  baseUrl: string,
  pagination: PaginationMeta
): {
  self: string;
  first: string;
  last: string;
  next: string | null;
  prev: string | null;
} {
  const buildUrl = (page: number) => `${baseUrl}?page=${page}&limit=${pagination.limit}`;
  
  return {
    self: buildUrl(pagination.page),
    first: buildUrl(1),
    last: buildUrl(pagination.pages),
    next: pagination.nextPage ? buildUrl(pagination.nextPage) : null,
    prev: pagination.prevPage ? buildUrl(pagination.prevPage) : null,
  };
}

/**
 * Cursor-based pagination helper
 * Fetches one extra item to determine if there are more pages
 */
export async function fetchWithCursor<T>(
  fetchFn: (limit: number) => Promise<T[]>,
  limit: number
): Promise<{ items: T[]; hasMore: boolean }> {
  const items = await fetchFn(limit + 1);
  const hasMore = items.length > limit;
  
  return {
    items: hasMore ? items.slice(0, -1) : items,
    hasMore,
  };
}

export default {
  parsePaginationParams,
  buildPaginationMeta,
  buildCursorPaginationMeta,
  createPaginatedResponse,
  getPaginationLinks,
  fetchWithCursor,
};
