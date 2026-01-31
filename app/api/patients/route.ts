import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,patient_id.ilike.%${search}%,village.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    return Response.json({ patients: data, total: count });
    
  } catch (error) {
    console.error('Patients fetch error:', error);
    return Response.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}
