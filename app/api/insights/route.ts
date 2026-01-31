import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import type { Vital } from '@/lib/types';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { patientId } = await request.json();
    
    if (!patientId) {
      return Response.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (patientError || !patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Get recent vitals
    const { data: vitals } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(20);
    
    const vitalsList = (vitals || []) as Vital[];
    
    // Get recent alerts
    const { data: alerts } = await supabase
      .from('health_alerts')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Prepare context for AI
    const patientContext = `
Patient Information:
- Name: ${patient.name}
- Age: ${patient.age} years old
- Gender: ${patient.gender || 'Not specified'}
- Location: ${patient.village || 'Unknown'}, ${patient.district || 'Unknown'}
- Medical History: ${patient.medical_history || 'No recorded history'}

Recent Vital Signs (last ${vitalsList.length} readings):
${vitalsList.map(v => `
- Date: ${new Date(v.recorded_at).toLocaleString()}
  Heart Rate: ${v.heart_rate || 'N/A'} bpm
  Blood Pressure: ${v.systolic_bp || 'N/A'}/${v.diastolic_bp || 'N/A'} mmHg
  SpO2: ${v.spo2 || 'N/A'}%
  Temperature: ${v.temperature || 'N/A'}°C
  Critical: ${v.is_critical ? 'Yes' : 'No'}
`).join('')}

Active Alerts (${alerts?.length || 0}):
${alerts?.map(a => `- ${a.alert_type}: ${a.message} (${a.severity})`).join('\n') || 'No active alerts'}

Context: This is an elderly patient in a rural healthcare setting. Consider limited access to advanced medical facilities and the need for practical, actionable advice suitable for community health workers.
`;

const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `You are a medical AI assistant specialized in elderly care in rural healthcare settings.

Analyze the following patient data and provide health insights.

${patientContext}

Respond with a JSON object in this exact format (no markdown, no extra text):
{"summary":"2-3 sentence summary","key_concerns":["concern1","concern2"],"recommendations":["rec1","rec2"],"risk_assessment":"low","follow_up_actions":["action1"]}

Use one of: low, moderate, high, critical for risk_assessment.`,
    });
    
    console.log("[v0] Groq response text:", result.text?.slice(0, 500));
    
    // Parse JSON from response - try multiple approaches
    let insights;
    const responseText = result.text || "";
    
    // Try to extract JSON from the response
    try {
      // First try: direct parse
      insights = JSON.parse(responseText.trim());
    } catch {
      try {
        // Second try: find JSON object in text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: use rule-based insights
        console.log("[v0] JSON parsing failed, using fallback");
      }
    }
    
    // If parsing failed, create fallback insights
    if (!insights) {
      const hasAlerts = (alerts?.length || 0) > 0;
      const hasCriticalVitals = vitalsList.some(v => v.is_critical);
      
      insights = {
        summary: `Patient ${patient.name}, age ${patient.age}, has ${vitalsList.length} recent vital readings. ${hasAlerts ? `There are ${alerts?.length} active alerts requiring attention.` : 'No active alerts.'} ${hasCriticalVitals ? 'Some readings show critical values.' : 'Vital signs are within monitoring range.'}`,
        key_concerns: hasAlerts || hasCriticalVitals 
          ? ['Active health alerts detected', 'Requires close monitoring']
          : ['Continue routine monitoring', 'Maintain healthy lifestyle'],
        recommendations: [
          'Monitor vital signs regularly',
          'Ensure adequate hydration',
          'Maintain medication schedule if prescribed',
          hasCriticalVitals ? 'Consult healthcare provider for critical readings' : 'Continue current care plan'
        ].filter(Boolean),
        risk_assessment: hasCriticalVitals ? 'high' : hasAlerts ? 'moderate' : 'low',
        follow_up_actions: [
          'Schedule next vital signs check',
          'Review any medication adherence',
          hasAlerts ? 'Address active alerts' : 'Document observations'
        ]
      };
    }
    
    return Response.json({ success: true, insights });
    
  } catch (error) {
    console.error('AI insights error:', error);
    return Response.json({ error: 'Failed to generate AI insights' }, { status: 500 });
  }
}
