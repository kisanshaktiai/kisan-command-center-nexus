
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface GenericOperation {
  operation: 'create' | 'read' | 'update' | 'delete' | 'list' | 'validate' | 'audit'
  table: string
  data?: any
  id?: string
  filters?: Record<string, any>
  options?: {
    select?: string
    orderBy?: { column: string; ascending: boolean }
    limit?: number
    tenant_id?: string
    audit_action?: string
    validation_rules?: string[]
  }
}

interface SecurityContext {
  user_id: string
  tenant_id?: string
  role?: string
  permissions?: string[]
}

// Allowed tables for generic operations (whitelist approach)
const ALLOWED_TABLES = [
  'leads', 'lead_communications', 'lead_tags', 'lead_assignments',
  'farmers', 'dealers', 'products', 'analytics_reports',
  'custom_reports', 'data_export_logs', 'collaborative_notes',
  'dashboard_configs', 'api_logs'
]

// Tables that require tenant isolation
const TENANT_ISOLATED_TABLES = [
  'leads', 'farmers', 'dealers', 'products', 'analytics_reports',
  'custom_reports', 'collaborative_notes', 'api_logs'
]

// Read-only tables for certain operations
const READ_ONLY_TABLES = ['admin_audit_logs', 'activation_logs']

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { operation, table, data, id, filters, options }: GenericOperation = await req.json()
    
    console.log(`[GenericOps] ${operation.toUpperCase()} on ${table}`, { id, hasData: !!data })

    // Get user context from JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Authentication required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication')
    }

    const securityContext: SecurityContext = {
      user_id: userData.user.id,
      tenant_id: options?.tenant_id,
      role: userData.user.user_metadata?.role || 'user'
    }

    // Security validations
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error(`Table '${table}' is not allowed for generic operations`)
    }

    if (READ_ONLY_TABLES.includes(table) && ['create', 'update', 'delete'].includes(operation)) {
      throw new Error(`Table '${table}' is read-only`)
    }

    // Tenant isolation check
    if (TENANT_ISOLATED_TABLES.includes(table)) {
      if (!securityContext.tenant_id && !['super_admin', 'platform_admin'].includes(securityContext.role)) {
        throw new Error('Tenant context required for this operation')
      }
    }

    let result: any

    switch (operation) {
      case 'create':
        result = await handleCreate(table, data, securityContext)
        break
      case 'read':
        result = await handleRead(table, id!, securityContext, options)
        break
      case 'update':
        result = await handleUpdate(table, id!, data, securityContext)
        break
      case 'delete':
        result = await handleDelete(table, id!, securityContext)
        break
      case 'list':
        result = await handleList(table, filters, securityContext, options)
        break
      case 'validate':
        result = await handleValidate(table, data, options?.validation_rules || [])
        break
      case 'audit':
        result = await handleAudit(table, id!, securityContext)
        break
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }

    // Log the operation for audit purposes
    await logOperation(operation, table, securityContext, { id, success: true })

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        operation,
        table,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[GenericOps] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleCreate(table: string, data: any, context: SecurityContext) {
  let query = supabase.from(table)

  // Add tenant_id for tenant-isolated tables
  if (TENANT_ISOLATED_TABLES.includes(table) && context.tenant_id) {
    data.tenant_id = context.tenant_id
  }

  // Add created_by if the table has this field
  if (data && typeof data === 'object') {
    data.created_by = context.user_id
    data.created_at = new Date().toISOString()
  }

  const { data: result, error } = await query.insert(data).select().single()
  
  if (error) throw new Error(`Create failed: ${error.message}`)
  return result
}

async function handleRead(table: string, id: string, context: SecurityContext, options?: any) {
  let query = supabase.from(table).select(options?.select || '*').eq('id', id)

  // Apply tenant isolation
  if (TENANT_ISOLATED_TABLES.includes(table) && context.tenant_id) {
    query = query.eq('tenant_id', context.tenant_id)
  }

  const { data: result, error } = await query.single()
  
  if (error) throw new Error(`Read failed: ${error.message}`)
  return result
}

async function handleUpdate(table: string, id: string, data: any, context: SecurityContext) {
  let query = supabase.from(table)

  // Add updated_by and updated_at
  if (data && typeof data === 'object') {
    data.updated_by = context.user_id
    data.updated_at = new Date().toISOString()
  }

  // Apply tenant isolation
  if (TENANT_ISOLATED_TABLES.includes(table) && context.tenant_id) {
    query = query.eq('tenant_id', context.tenant_id)
  }

  const { data: result, error } = await query.update(data).eq('id', id).select().single()
  
  if (error) throw new Error(`Update failed: ${error.message}`)
  return result
}

async function handleDelete(table: string, id: string, context: SecurityContext) {
  let query = supabase.from(table)

  // Apply tenant isolation
  if (TENANT_ISOLATED_TABLES.includes(table) && context.tenant_id) {
    query = query.eq('tenant_id', context.tenant_id)
  }

  // Prefer soft delete if the table has deleted_at column
  const { data: result, error } = await query
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: context.user_id 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // If soft delete fails, try hard delete
    const { error: hardDeleteError } = await query.delete().eq('id', id)
    if (hardDeleteError) throw new Error(`Delete failed: ${hardDeleteError.message}`)
    return { id, deleted: true }
  }
  
  return result
}

async function handleList(table: string, filters: any, context: SecurityContext, options?: any) {
  let query = supabase.from(table).select(options?.select || '*')

  // Apply tenant isolation
  if (TENANT_ISOLATED_TABLES.includes(table) && context.tenant_id) {
    query = query.eq('tenant_id', context.tenant_id)
  }

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })
  }

  // Apply ordering
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending })
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data: result, error } = await query
  
  if (error) throw new Error(`List failed: ${error.message}`)
  return result || []
}

async function handleValidate(table: string, data: any, rules: string[]) {
  const validationResults: { field: string; valid: boolean; message?: string }[] = []

  for (const rule of rules) {
    switch (rule) {
      case 'email':
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          validationResults.push({ field: 'email', valid: false, message: 'Invalid email format' })
        } else {
          validationResults.push({ field: 'email', valid: true })
        }
        break
      
      case 'required_name':
        if (!data.name || data.name.trim().length === 0) {
          validationResults.push({ field: 'name', valid: false, message: 'Name is required' })
        } else {
          validationResults.push({ field: 'name', valid: true })
        }
        break
      
      case 'unique_email':
        const { data: existing } = await supabase.from(table).select('id').eq('email', data.email).single()
        if (existing) {
          validationResults.push({ field: 'email', valid: false, message: 'Email already exists' })
        } else {
          validationResults.push({ field: 'email', valid: true })
        }
        break
    }
  }

  return {
    isValid: validationResults.every(r => r.valid),
    results: validationResults
  }
}

async function handleAudit(table: string, id: string, context: SecurityContext) {
  // Get audit trail for the record
  const { data: auditLogs, error } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('details->entity_type', table)
    .eq('details->entity_id', id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Audit retrieval failed: ${error.message}`)
  return auditLogs || []
}

async function logOperation(
  operation: string, 
  table: string, 
  context: SecurityContext, 
  details: any
) {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: context.user_id,
      action: `generic_${operation}`,
      details: {
        table,
        entity_type: table,
        entity_id: details.id,
        tenant_id: context.tenant_id,
        success: details.success,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[GenericOps] Audit logging failed:', error)
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}
