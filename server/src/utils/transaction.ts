import mongoose, { ClientSession } from 'mongoose';
import logger from './logger';

/**
 * MongoDB Transaction Utilities
 * Provides atomic operations for multi-document updates
 */

/**
 * Transaction options
 */
export interface TransactionOptions {
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  readConcern?: { level: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot' };
  writeConcern?: { w: number | 'majority'; j?: boolean; wtimeout?: number };
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: TransactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'majority' },
  writeConcern: { w: 'majority' },
  maxRetries: 3,
  retryDelay: 100,
};

/**
 * Execute a function within a MongoDB transaction
 * Automatically handles session creation, commit, abort, and retries
 * 
 * @param fn - Async function to execute within the transaction
 * @param options - Transaction options
 * @returns Result of the function
 * 
 * @example
 * const result = await withTransaction(async (session) => {
 *   await Ticket.updateMany({...}, {...}, { session });
 *   await User.updateOne({...}, {...}, { session });
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const session = await mongoose.startSession();
  
  let lastError: Error | null = null;
  let retries = 0;

  while (retries < (opts.maxRetries || 3)) {
    try {
      session.startTransaction({
        readPreference: opts.readPreference,
        readConcern: opts.readConcern,
        writeConcern: opts.writeConcern,
      });

      const startTime = Date.now();
      const result = await fn(session);
      
      await session.commitTransaction();
      
      const duration = Date.now() - startTime;
      logger.debug('Transaction committed successfully', {
        duration: `${duration}ms`,
        retries,
      });

      return result;
    } catch (error: any) {
      await session.abortTransaction();
      lastError = error;

      // Check if error is retryable
      const isRetryable = 
        error.hasErrorLabel?.('TransientTransactionError') ||
        error.hasErrorLabel?.('UnknownTransactionCommitResult') ||
        error.code === 112; // WriteConflict

      if (isRetryable && retries < (opts.maxRetries || 3) - 1) {
        retries++;
        logger.warn('Transaction failed, retrying', {
          error: error.message,
          retry: retries,
          maxRetries: opts.maxRetries,
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay! * retries));
        continue;
      }

      logger.error('Transaction failed permanently', {
        error: error.message,
        retries,
      });
      
      throw error;
    } finally {
      session.endSession();
    }
  }

  throw lastError || new Error('Transaction failed after max retries');
}

/**
 * Execute multiple operations atomically
 * Simpler API for common use cases
 * 
 * @example
 * await executeAtomic([
 *   () => Ticket.updateOne({ _id: id1 }, { status: 'CLOSED' }),
 *   () => Ticket.updateOne({ _id: id2 }, { status: 'CLOSED' }),
 * ]);
 */
export async function executeAtomic(
  operations: Array<(session: ClientSession) => Promise<any>>
): Promise<void> {
  await withTransaction(async (session) => {
    for (const operation of operations) {
      await operation(session);
    }
  });
}

/**
 * Bulk write with transaction
 * Wraps MongoDB bulkWrite in a transaction
 */
export async function bulkWriteWithTransaction(
  Model: mongoose.Model<any>,
  operations: mongoose.AnyBulkWriteOperation<any>[]
): Promise<mongoose.mongo.BulkWriteResult> {
  return withTransaction(async (session) => {
    return Model.bulkWrite(operations, { session });
  });
}

/**
 * Create multiple documents atomically
 */
export async function createManyAtomic<T>(
  Model: mongoose.Model<any>,
  documents: any[]
): Promise<T[]> {
  return withTransaction(async (session) => {
    return Model.create(documents, { session }) as unknown as T[];
  });
}

/**
 * Update with optimistic locking
 * Uses version field to detect concurrent modifications
 */
export async function updateWithOptimisticLock<T extends { __v?: number }>(
  Model: mongoose.Model<T>,
  id: string,
  currentVersion: number,
  update: Partial<T>
): Promise<T | null> {
  const result = await Model.findOneAndUpdate(
    { _id: id, __v: currentVersion } as any,
    { ...update, $inc: { __v: 1 } },
    { new: true }
  );

  if (!result) {
    throw new Error('Document was modified by another process. Please refresh and try again.');
  }

  return result;
}

/**
 * Session wrapper for manual transaction control
 * Useful when you need more control over the transaction
 */
export class TransactionManager {
  private session: ClientSession | null = null;

  async start(): Promise<ClientSession> {
    this.session = await mongoose.startSession();
    this.session.startTransaction({
      readPreference: 'primary',
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority' },
    });
    return this.session;
  }

  async commit(): Promise<void> {
    if (!this.session) {
      throw new Error('No active transaction');
    }
    await this.session.commitTransaction();
    this.session.endSession();
    this.session = null;
  }

  async abort(): Promise<void> {
    if (!this.session) {
      return;
    }
    await this.session.abortTransaction();
    this.session.endSession();
    this.session = null;
  }

  getSession(): ClientSession | null {
    return this.session;
  }
}

/**
 * Check if MongoDB replica set is available (required for transactions)
 */
export async function isReplicaSetAvailable(): Promise<boolean> {
  try {
    const db = mongoose.connection.db;
    if (!db) return false;
    const admin = db.admin();
    const info = await admin.replSetGetStatus();
    return info && info.ok === 1;
  } catch {
    return false;
  }
}

export default {
  withTransaction,
  executeAtomic,
  bulkWriteWithTransaction,
  createManyAtomic,
  updateWithOptimisticLock,
  TransactionManager,
  isReplicaSetAvailable,
};
