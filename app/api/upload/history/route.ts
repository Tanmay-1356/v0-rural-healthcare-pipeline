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
      console.error('[v0] Upload history fetch error:', error);
      // Return empty list instead of error - UI will handle gracefully
      return Response.json({ batches: [], available: false, message: 'Upload history temporarily unavailable' });
    }
    
    return Response.json({ batches: batches || [], available: true });
  } catch (error) {
    console.error('[v0] Upload history error:', error instanceof Error ? error.message : error);
    // Return graceful fallback instead of 500 error
    return Response.json({ 
      batches: [], 
      available: false,
      message: 'Database connection temporarily unavailable. Please try again in a moment.'
    }, { status: 200 }); // Return 200 so UI doesn't show error state
  }
}
