import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    let query = supabase
      .from('vitals')
      .select(`
        *,
        patients (id, name, patient_id, age, village)
      `, { count: 'exact' })
      .order('recorded_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    
    if (startDate) {
      query = query.gte('recorded_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('recorded_at', endDate);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    return Response.json({ vitals: data, total: count });
    
  } catch (error) {
    console.error('Vitals fetch error:', error);
    return Response.json({ error: 'Failed to fetch vitals' }, { status: 500 });
  }
}
