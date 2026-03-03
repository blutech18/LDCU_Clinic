import { supabase } from './supabase';

interface AuditLogParams {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN';
  resourceType: string;
  resourceId?: string;
  campusId?: string;
  details?: Record<string, any>;
}

export async function logUserAction({
  userId,
  action,
  resourceType,
  resourceId,
  campusId,
  details,
}: AuditLogParams): Promise<void> {
  try {
    await supabase.rpc('log_user_action', {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_campus_id: campusId || null,
      p_details: details || null,
      p_ip_address: null,
      p_user_agent: navigator.userAgent || null,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error('Failed to log audit action:', error);
  }
}
