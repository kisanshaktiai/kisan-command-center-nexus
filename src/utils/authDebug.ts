
import { supabase } from '@/integrations/supabase/client';

export const debugAuthIssue = async (email: string) => {
  console.log('=== AUTH DEBUG UTILITY ===');
  console.log('Email to check:', email);
  
  try {
    // Check 1: Check if user exists in auth.users (we can't query this directly, but we can check session)
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Current session user:', sessionData.session?.user?.email || 'No session');
    
    // Check 2: Check admin_users table by email
    console.log('Checking admin_users table by email...');
    const { data: adminByEmail, error: emailError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email);
      
    console.log('Admin users found by email:', adminByEmail);
    console.log('Email query error:', emailError);
    
    // Check 3: If we have a session, check by user ID
    if (sessionData.session?.user?.id) {
      console.log('Checking admin_users table by user ID...');
      const { data: adminById, error: idError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', sessionData.session.user.id);
        
      console.log('Admin users found by ID:', adminById);
      console.log('ID query error:', idError);
    }
    
    // Check 4: Test the RLS function directly
    console.log('Testing is_authenticated_admin function...');
    const { data: functionTest, error: funcError } = await supabase
      .rpc('is_authenticated_admin');
      
    console.log('Function result:', functionTest);
    console.log('Function error:', funcError);
    
  } catch (error) {
    console.error('Debug utility error:', error);
  }
  
  console.log('=== END AUTH DEBUG ===');
};

// Call this in the browser console with: debugAuthIssue('your-email@example.com')
(window as any).debugAuthIssue = debugAuthIssue;
