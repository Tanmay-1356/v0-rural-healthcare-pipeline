import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Delete in order of foreign key dependencies
    // Delete health alerts first (references vitals and patients)
    const { error: alertsError } = await supabase
      .from('health_alerts')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (alertsError) {
      console.error('[v0] Error deleting alerts:', alertsError);
      throw alertsError;
    }

    // Delete reports (references patients)
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (reportsError) {
      console.error('[v0] Error deleting reports:', reportsError);
      throw reportsError;
    }

    // Delete vitals (references patients)
    const { error: vitalsError } = await supabase
      .from('vitals')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (vitalsError) {
      console.error('[v0] Error deleting vitals:', vitalsError);
      throw vitalsError;
    }

    // Delete patients last
    const { error: patientsError } = await supabase
      .from('patients')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (patientsError) {
      console.error('[v0] Error deleting patients:', patientsError);
      throw patientsError;
    }

    // Delete upload batches
    const { error: batchesError } = await supabase
      .from('upload_batches')
      .delete()
      .gt('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (batchesError) {
      console.error('[v0] Error deleting batches:', batchesError);
      throw batchesError;
    }

    console.log('[v0] Successfully cleared all data');
    return NextResponse.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    console.error('[v0] Clear data error:', error);
    return NextResponse.json(
      { error: 'Failed to clear data', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
