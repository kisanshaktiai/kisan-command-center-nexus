
export class TenantValidation {
  static validateSlug(slug: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!slug || slug.trim() === '') {
      errors.push('Slug is required');
    }

    if (slug.length < 3) {
      errors.push('Slug must be at least 3 characters long');
    }

    if (slug.length > 50) {
      errors.push('Slug must be no more than 50 characters long');
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      errors.push('Slug cannot start or end with a hyphen');
    }

    if (slug.includes('--')) {
      errors.push('Slug cannot contain consecutive hyphens');
    }

    const reservedSlugs = [
      'api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 
      'localhost', 'support', 'help', 'docs', 'blog', 'status', 
      'dev', 'staging', 'test', 'demo'
    ];

    if (reservedSlugs.includes(slug)) {
      errors.push('This slug is reserved and cannot be used');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateEmail(email: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!email || email.trim() === '') {
      errors.push('Email is required');
    } else if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateTenantName(name: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!name || name.trim() === '') {
      errors.push('Tenant name is required');
    }

    if (name.length < 2) {
      errors.push('Tenant name must be at least 2 characters long');
    }

    if (name.length > 100) {
      errors.push('Tenant name must be no more than 100 characters long');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateCreateTenantRequest(data: {
    name: string;
    slug: string;
    owner_email: string;
    type?: string;
  }): { valid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};

    const nameValidation = this.validateTenantName(data.name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.errors;
    }

    const slugValidation = this.validateSlug(data.slug);
    if (!slugValidation.valid) {
      errors.slug = slugValidation.errors;
    }

    const emailValidation = this.validateEmail(data.owner_email);
    if (!emailValidation.valid) {
      errors.owner_email = emailValidation.errors;
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}
