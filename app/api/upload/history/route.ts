import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get upload batches ordered by most recent
    const { data: batches, error } = await supabase
      .from('upload_batches')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(20);
    
    if (error) {
      return Response.json({ error: 'Failed to fetch upload history', details: error.message }, { status: 500 });
    }
    
    return Response.json({ batches: batches || [] });
  } catch (error) {
    console.error('Upload history error:', error);
    return Response.json({ 
      error: 'Failed to fetch upload history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
