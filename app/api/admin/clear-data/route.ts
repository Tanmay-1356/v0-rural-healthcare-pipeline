import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Delete in correct order to respect foreign key constraints
    // Delete reports first (references patients)
    await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete health_alerts (references patients and vitals)
    await supabase.from('health_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete vitals (references patients)
    await supabase.from('vitals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete patients
    await supabase.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete upload batches
    await supabase.from('upload_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[v0] All dashboard data cleared successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All data has been cleared successfully'
    });
    
  } catch (error) {
    console.error('[v0] Clear data error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to clear data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
