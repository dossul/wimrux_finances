/**
 * Business Logic: Auto-update timestamps
 * Port of PostgreSQL trigger: set_updated_at()
 */

/**
 * Add timestamps to data before insert/update
 * - Sets created_at on insert (if not present)
 * - Always sets updated_at on insert and update
 */
export function withTimestamps<T extends Record<string, unknown>>(
  data: T,
  isInsert = false
): T & { created_at?: string; updated_at: string } {
  const now = new Date().toISOString();
  
  const result: T & { created_at?: string; updated_at: string } = {
    ...data,
    updated_at: now,
  };
  
  // Only set created_at on insert if not already present
  if (isInsert && !data.created_at) {
    result.created_at = now;
  }
  
  return result;
}

/**
 * Hook for insert operations - adds both created_at and updated_at
 */
export function withInsertTimestamps<T extends Record<string, unknown>>(data: T): T & { created_at: string; updated_at: string } {
  const now = new Date().toISOString();
  return {
    ...data,
    created_at: (data.created_at as string) || now,
    updated_at: now,
  };
}

/**
 * Hook for update operations - only updates updated_at
 */
export function withUpdateTimestamps<T extends Record<string, unknown>>(data: T): T & { updated_at: string } {
  return {
    ...data,
    updated_at: new Date().toISOString(),
  };
}
