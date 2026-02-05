import mongoose, { ClientSession } from 'mongoose';
import logger from './logger';
import config from '../config/appConfig';

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
  maxRetries: config.transaction.maxRetries,
  retryDelay: config.transaction.retryDelay,
};

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const session = await mongoose.startSession();
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
      
      logger.debug('Transaction committed', { duration: `${Date.now() - startTime}ms`, retries });
      return result;
    } catch (error: any) {
      await session.abortTransaction();
      
      const isRetryable = error.hasErrorLabel?.('TransientTransactionError') || 
                        error.hasErrorLabel?.('UnknownTransactionCommitResult') || 
                        error.code === 112;

      if (isRetryable && retries < (opts.maxRetries || 3) - 1) {
        retries++;
        logger.warn('Transaction retry', { error: error.message, retry: retries });
        await new Promise(r => setTimeout(r, opts.retryDelay! * retries));
        continue;
      }

      logger.error('Transaction failed', { error: error.message, retries });
      throw error;
    } finally {
      session.endSession();
    }
  }
  throw new Error('Transaction failed after max retries');
}

export async function executeAtomic(operations: Array<(session: ClientSession) => Promise<any>>): Promise<void> {
  await withTransaction(async (session) => {
    for (const op of operations) await op(session);
  });
}

export async function bulkWriteWithTransaction(
  Model: mongoose.Model<any>,
  operations: mongoose.AnyBulkWriteOperation<any>[]
): Promise<mongoose.mongo.BulkWriteResult> {
  return withTransaction(async (session) => Model.bulkWrite(operations, { session }));
}

export async function createManyAtomic<T>(Model: mongoose.Model<any>, documents: any[]): Promise<T[]> {
  return withTransaction(async (session) => Model.create(documents, { session }) as unknown as Promise<T[]>);
}

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
  if (!result) throw new Error('Concurrent modification detected. Please refresh.');
  return result;
}

export class TransactionManager {
  private session: ClientSession | null = null;

  async start(): Promise<ClientSession> {
    this.session = await mongoose.startSession();
    this.session.startTransaction(DEFAULT_OPTIONS as any);
    return this.session;
  }

  async commit(): Promise<void> {
    if (!this.session) throw new Error('No active transaction');
    await this.session.commitTransaction();
    this.session.endSession();
    this.session = null;
  }

  async abort(): Promise<void> {
    if (!this.session) return;
    await this.session.abortTransaction();
    this.session.endSession();
    this.session = null;
  }

  getSession() { return this.session; }
}

export async function isReplicaSetAvailable(): Promise<boolean> {
  try {
    const db = mongoose.connection.db;
    if (!db) return false;
    const admin = db.admin();
    const info = await admin.replSetGetStatus();
    return info?.ok === 1;
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
