import { supabase } from '@/integrations/supabase/client';
import { BaseService, ServiceResult } from './BaseService';
import type { EmailTemplate } from '@/types/email';

export class EmailTemplateService extends BaseService {
  private static instance: EmailTemplateService;

  static getInstance(): EmailTemplateService {
    if (!this.instance) {
      this.instance = new EmailTemplateService();
    }
    return this.instance;
  }

  /**
   * Get all email templates with optional filtering
   */
  async getTemplates(filters?: {
    tenantId?: string;
    category?: string;
    isActive?: boolean;
    templateType?: string;
  }): Promise<ServiceResult<EmailTemplate[]>> {
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.tenantId) {
        query = query.or(`tenant_id.eq.${filters.tenantId},tenant_id.is.null`);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.templateType) {
        query = query.eq('template_type', filters.templateType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data as EmailTemplate[] };
    } catch (error) {
      console.error('Error fetching email templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      };
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<ServiceResult<EmailTemplate>> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Template not found');

      return { success: true, data: data as EmailTemplate };
    } catch (error) {
      console.error('Error fetching email template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template'
      };
    }
  }

  /**
   * Create new email template
   */
  async createTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<EmailTemplate>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('email_templates')
        .insert([{
          ...template,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: data as EmailTemplate };
    } catch (error) {
      console.error('Error creating email template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  /**
   * Update email template
   */
  async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<ServiceResult<EmailTemplate>> {
    try {
      // Increment version on update
      const currentVersion = updates.version || 1;
      
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          ...updates,
          version: currentVersion + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: data as EmailTemplate };
    } catch (error) {
      console.error('Error updating email template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template'
      };
    }
  }

  /**
   * Delete email template
   */
  async deleteTemplate(id: string): Promise<ServiceResult<boolean>> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: true };
    } catch (error) {
      console.error('Error deleting email template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template'
      };
    }
  }

  /**
   * Duplicate a template (create a copy)
   */
  async duplicateTemplate(id: string, tenantId?: string): Promise<ServiceResult<EmailTemplate>> {
    try {
      // Get original template
      const result = await this.getTemplateById(id);
      if (!result.success || !result.data) {
        throw new Error('Template not found');
      }

      const original = result.data;

      // Create copy
      return this.createTemplate({
        tenant_id: tenantId || original.tenant_id,
        template_type: original.template_type,
        template_name: `${original.template_name} (Copy)`,
        subject_template: original.subject_template,
        html_template: original.html_template,
        text_template: original.text_template,
        variables: original.variables,
        is_active: false, // Set copy as inactive by default
        is_default: false,
        category: original.category,
        preview_text: original.preview_text,
        parent_template_id: id
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate template'
      };
    }
  }

  /**
   * Get template categories
   */
  async getCategories(): Promise<ServiceResult<Array<{ id: string; name: string; description?: string; icon?: string }>>> {
    try {
      const { data, error } = await supabase
        .from('email_template_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      };
    }
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      // Support both {{key}} and {key} syntax
      const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const regex2 = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex1, value);
      result = result.replace(regex2, value);
    });

    return result;
  }
}

export const emailTemplateService = EmailTemplateService.getInstance();
