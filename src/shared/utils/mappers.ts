
export const mapTenantTypeToDisplay = (type?: string): string => {
  if (!type) return 'Unknown';
  
  // Handle undefined/null safely
  const safeType = String(type);
  
  switch (safeType.toLowerCase()) {
    case 'agri_company':
      return 'Agriculture Company';
    case 'cooperative':
      return 'Cooperative';
    case 'government':
      return 'Government';
    case 'ngo':
      return 'NGO';
    case 'research':
      return 'Research Institute';
    default:
      // Safe string replacement - convert underscores to spaces and capitalize
      return safeType
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

export const mapTenantStatusToDisplay = (status?: string): string => {
  if (!status) return 'Unknown';
  
  // Handle undefined/null safely
  const safeStatus = String(status);
  
  switch (safeStatus.toLowerCase()) {
    case 'active':
      return 'Active';
    case 'trial':
      return 'Trial';
    case 'suspended':
      return 'Suspended';
    case 'cancelled':
      return 'Cancelled';
    case 'archived':
      return 'Archived';
    case 'pending_approval':
      return 'Pending Approval';
    default:
      // Safe string replacement
      return safeStatus
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

export const mapSubscriptionPlanToDisplay = (plan?: string): string => {
  if (!plan) return 'Unknown Plan';
  
  // Handle undefined/null safely
  const safePlan = String(plan);
  
  switch (safePlan) {
    case 'Kisan_Basic':
      return 'Kisan Basic';
    case 'Shakti_Growth':
      return 'Shakti Growth';
    case 'AI_Enterprise':
      return 'AI Enterprise';
    case 'Custom_Enterprise':
      return 'Custom Enterprise';
    default:
      // Safe string replacement
      return safePlan
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};
