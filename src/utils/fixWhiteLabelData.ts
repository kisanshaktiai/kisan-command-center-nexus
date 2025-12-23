/**
 * Utility to fix white-label data mismatches
 * Run this once to sync all existing tenants with white_label_configs
 */

import { whiteLabelSyncService } from '@/services/WhiteLabelSyncService';

export async function fixWhiteLabelDataMismatches() {
  console.log('🔄 Starting white-label data fix...');
  
  const result = await whiteLabelSyncService.fixAllTenantsData();
  
  if (result.success && result.data) {
    console.log(`✅ Fixed ${result.data.fixed} tenants`);
    
    if (result.data.errors.length > 0) {
      console.warn('⚠️  Errors encountered:');
      result.data.errors.forEach(err => console.warn(`  - ${err}`));
    }
    
    return result.data;
  } else {
    console.error('❌ Failed to fix white-label data:', result.error);
    throw new Error(result.error);
  }
}

// Export for use in console or admin tools
if (typeof window !== 'undefined') {
  (window as any).fixWhiteLabelData = fixWhiteLabelDataMismatches;
}
