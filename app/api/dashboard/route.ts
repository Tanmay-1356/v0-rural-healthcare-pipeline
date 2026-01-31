import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get total patients count
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    // Get total vitals count
    const { count: totalVitals } = await supabase
      .from('vitals')
      .select('*', { count: 'exact', head: true });
    
    // Get unacknowledged critical alerts count
    const { count: criticalAlerts } = await supabase
      .from('health_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .eq('is_acknowledged', false);
    
    // Get recent reports count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: pendingReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .gte('generated_at', sevenDaysAgo.toISOString());
    
    // Get recent uploads count (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { count: recentUploads } = await supabase
      .from('upload_batches')
      .select('*', { count: 'exact', head: true })
      .gte('uploaded_at', oneDayAgo.toISOString());
    
    // Get recent vitals for chart (last 50 records)
    const { data: recentVitals } = await supabase
      .from('vitals')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(50);
    
    // Get recent alerts
    const { data: alerts } = await supabase
      .from('health_alerts')
      .select(`
        *,
        patients (name, patient_id)
      `)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get recent patients with their latest vitals
    const { data: patients } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return Response.json({
      stats: {
        totalPatients: totalPatients || 0,
        totalVitals: totalVitals || 0,
        criticalAlerts: criticalAlerts || 0,
        pendingReports: pendingReports || 0,
        recentUploads: recentUploads || 0
      },
      recentVitals: recentVitals || [],
      alerts: alerts || [],
      patients: patients || []
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return Response.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
