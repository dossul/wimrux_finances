/**
 * Business Logic: Auto-provision AI for new companies
 * Port of PostgreSQL trigger: auto_provision_ai_for_new_company()
 */
import { databases } from 'src/boot/appwrite';
import { ID } from 'appwrite';

const DATABASE_ID = 'wimrux_finances';
const AI_CREDITS_COLLECTION = 'company_ai_credits';
const AI_QUOTA_COLLECTION = 'company_ai_quota_usage';

export interface Company {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * Provision AI resources for a newly created company
 * Creates:
 * - company_ai_credits entry with 0 balance
 * - company_ai_quota_usage for current month
 */
export async function provisionAIForNewCompany(
  company: Company
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodMonth = `${year}-${month}-01`; // YYYY-MM-01
    
    // Create AI credits entry
    try {
      await databases.createDocument(
        DATABASE_ID,
        AI_CREDITS_COLLECTION,
        ID.unique(),
        {
          company_id: company.id,
          balance_usd: 0,
          total_purchased_usd: 0,
          total_consumed_usd: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );
    } catch (err) {
      // Ignore if already exists (conflict)
      if (!String(err).includes('already exists')) {
        throw err;
      }
    }
    
    // Create AI quota entry for current month
    try {
      await databases.createDocument(
        DATABASE_ID,
        AI_QUOTA_COLLECTION,
        ID.unique(),
        {
          company_id: company.id,
          period_month: periodMonth,
          quota_cap_usd: 1.0,  // Default $1 quota
          consumed_usd: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );
    } catch (err) {
      // Ignore if already exists (conflict)
      if (!String(err).includes('already exists')) {
        throw err;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`[AI Provisioning] Error provisioning for company ${company.id}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Hook to call after creating a company
 */
export async function afterCompanyCreate(company: Company): Promise<void> {
  await provisionAIForNewCompany(company);
}
