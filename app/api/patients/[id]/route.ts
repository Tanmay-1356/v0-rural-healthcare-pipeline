import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (patientError || !patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Get patient vitals (last 100 records)
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', id)
      .order('recorded_at', { ascending: false })
      .limit(100);
    
    // Get patient alerts
    const { data: alerts } = await supabase
      .from('health_alerts')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get patient reports
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('patient_id', id)
      .order('generated_at', { ascending: false })
      .limit(10);
    
    return Response.json({
      patient,
      vitals: vitals || [],
      alerts: alerts || [],
      reports: reports || []
    });
    
  } catch (error) {
    console.error('Patient detail error:', error);
    return Response.json({ error: 'Failed to fetch patient details' }, { status: 500 });
  }
}
