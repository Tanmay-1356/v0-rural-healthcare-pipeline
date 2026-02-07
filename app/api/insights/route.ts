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

// Check if GROQ_API_KEY is set
    if (!process.env.GROQ_API_KEY) {
      console.error('[v0] GROQ_API_KEY is not set');
      // Return fallback insights without AI
      const fallbackInsights = {
        summary: `${patient.name} is a ${patient.age}-year-old patient. Based on ${vitalsList.length} recent vital readings, automated analysis is currently unavailable.`,
        key_concerns: vitalsList.some(v => v.is_critical) 
          ? ['Critical vital signs detected in recent readings'] 
          : ['Regular monitoring recommended'],
        recommendations: [
          'Continue regular vital sign monitoring',
          'Ensure adequate hydration',
          'Consult healthcare provider for comprehensive assessment'
        ],
        risk_assessment: vitalsList.some(v => v.is_critical) ? 'high' : 'moderate',
        follow_up_actions: ['Schedule routine health check', 'Review medication compliance']
      };
      return Response.json({ success: true, insights: fallbackInsights });
    }

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are a medical AI assistant specialized in elderly care in rural healthcare settings. 
Analyze patient vital signs and provide actionable insights for community health workers.
Focus on practical recommendations that can be implemented in resource-limited settings.
Always prioritize patient safety and recommend professional medical consultation when vital signs indicate serious concerns.
Consider age-appropriate normal ranges for elderly patients (typically 60+ years).

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format, no other text:
{
  "summary": "A brief 2-3 sentence summary of patient health status",
  "key_concerns": ["concern1", "concern2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "risk_assessment": "low|moderate|high|critical",
  "follow_up_actions": ["action1", "action2"]
}`,
      prompt: `Analyze the following patient data and provide health insights as JSON:\n\n${patientContext}`,
    });
    
    // Parse JSON from response
    let insights;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // Fallback if parsing fails
      insights = {
        summary: result.text.slice(0, 200),
        key_concerns: ['Unable to parse detailed concerns'],
        recommendations: ['Please consult a healthcare professional'],
        risk_assessment: 'moderate',
        follow_up_actions: ['Schedule follow-up assessment']
      };
    }
    
    return Response.json({ success: true, insights });
    
  } catch (error) {
    console.error('[v0] AI insights error:', error instanceof Error ? error.message : error);
    // Return fallback insights on error
    return Response.json({ 
      success: true, 
      insights: {
        summary: 'AI analysis temporarily unavailable. Please review vitals manually.',
        key_concerns: ['Automated analysis could not be completed'],
        recommendations: ['Review vital signs manually', 'Consult healthcare provider if concerns exist'],
        risk_assessment: 'moderate',
        follow_up_actions: ['Retry analysis later', 'Schedule follow-up if needed']
      }
    });
  }
}
