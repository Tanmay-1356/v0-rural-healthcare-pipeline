import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const acknowledged = searchParams.get('acknowledged');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('health_alerts')
      .select(`
        *,
        patients (id, name, patient_id, age, village)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    if (acknowledged !== null) {
      query = query.eq('is_acknowledged', acknowledged === 'true');
    }
    
    const { data, error } = await query;
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    return Response.json({ alerts: data });
    
  } catch (error) {
    console.error('[v0] Alerts fetch error:', error instanceof Error ? error.message : error);
    // Return empty alerts array on error
    return Response.json({ alerts: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { alertId, action } = await request.json();
    
    if (!alertId) {
      return Response.json({ error: 'Alert ID is required' }, { status: 400 });
    }
    
    if (action === 'acknowledge') {
      const { error } = await supabase
        .from('health_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);
      
      if (error) {
        console.error('[v0] Alert update error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
      }
      
      return Response.json({ success: true });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('[v0] Alert update error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, message: 'Database unavailable' });
  }
}
