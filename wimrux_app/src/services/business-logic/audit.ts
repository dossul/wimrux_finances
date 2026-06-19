/**
 * Business Logic: Audit Trail
 * Port of PostgreSQL trigger: log_audit_changes()
 */
import { databases } from 'src/boot/appwrite';
import { ID } from 'appwrite';

const DATABASE_ID = 'wimrux_finances';
const AUDIT_LOG_COLLECTION = 'audit_log';

export interface AuditEntry {
  user_id: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  data_before?: Record<string, unknown> | undefined;
  data_after?: Record<string, unknown> | undefined;
  company_id?: string | undefined;
  ip_address?: string | undefined;
}

/**
 * Log an audit entry for any data change
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      AUDIT_LOG_COLLECTION,
      ID.unique(),
      {
        user_id: entry.user_id,
        timestamp: new Date().toISOString(),
        action_type: entry.action_type,
        table_name: entry.table_name,
        record_id: entry.record_id,
        data_before: entry.data_before ? JSON.stringify(entry.data_before) : null,
        data_after: entry.data_after ? JSON.stringify(entry.data_after) : null,
        company_id: entry.company_id,
        ip_address: entry.ip_address,
      }
    );
  } catch (err) {
    console.error('[Audit] Failed to log audit entry:', err);
    // Don't throw - audit failure shouldn't block the main operation
  }
}

/**
 * Wrapper for audited database operations
 */
export async function withAudit<T>(
  operation: () => Promise<T>,
  context: {
    userId: string;
    tableName: string;
    recordId: string;
    companyId?: string;
    actionType: 'INSERT' | 'UPDATE' | 'DELETE';
    dataBefore?: Record<string, unknown>;
    getDataAfter?: (result: T) => Record<string, unknown>;
  }
): Promise<T> {
  const result = await operation();
  
  // Log audit entry asynchronously (don't await)
  logAudit({
    user_id: context.userId,
    action_type: context.actionType,
    table_name: context.tableName,
    record_id: context.recordId,
    data_before: context.dataBefore,
    data_after: context.getDataAfter ? context.getDataAfter(result) : undefined,
    company_id: context.companyId,
  });
  
  return result;
}
