import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { patientId, languages = ['english', 'hindi', 'telugu'] } = await request.json();

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get patient data
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (!patientData) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get recent vitals (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: vitalsData } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .gte('recorded_at', thirtyDaysAgo)
      .order('recorded_at', { ascending: false })
      .limit(100);

    // Get active alerts
    const { data: alertsData } = await supabase
      .from('health_alerts')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false });

    // Calculate statistics
    const stats = calculateStats(vitalsData || []);

    // Generate multilingual reports
    const reports: Record<string, string> = {};

    for (const language of languages) {
      const report = await generateMultilingualReport(patientData, stats, vitalsData || [], alertsData || [], language);
      reports[language] = report;
    }

    return NextResponse.json({
      success: true,
      patientName: patientData.name,
      patientId: patientData.patient_id,
      age: patientData.age,
      generatedAt: new Date().toISOString(),
      reports
    });
  } catch (error) {
    console.error('[v0] Patient impact report error:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      reports: generateFallbackReports()
    });
  }
}

function calculateStats(vitals: any[]) {
  if (vitals.length === 0) {
    return {
      avgHeartRate: 0,
      avgSystolicBP: 0,
      avgDiastolicBP: 0,
      avgSpO2: 0,
      avgTemp: 0,
      criticalReadings: 0,
      totalReadings: 0,
      trend: 'stable'
    };
  }

  const heartRates = vitals.filter(v => v.heart_rate).map(v => v.heart_rate);
  const systolic = vitals.filter(v => v.systolic_bp).map(v => v.systolic_bp);
  const diastolic = vitals.filter(v => v.diastolic_bp).map(v => v.diastolic_bp);
  const spo2 = vitals.filter(v => v.spo2).map(v => v.spo2);
  const temp = vitals.filter(v => v.temperature).map(v => v.temperature);

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    avgHeartRate: avg(heartRates),
    avgSystolicBP: avg(systolic),
    avgDiastolicBP: avg(diastolic),
    avgSpO2: (spo2.length > 0 ? (spo2.reduce((a, b) => a + b, 0) / spo2.length).toFixed(1) : 0),
    avgTemp: (temp.length > 0 ? (temp.reduce((a, b) => a + b, 0) / temp.length).toFixed(1) : 0),
    criticalReadings: vitals.filter(v => v.is_critical).length,
    totalReadings: vitals.length,
    trend: vitals.length > 10 ? 'improving' : 'monitoring'
  };
}

async function generateMultilingualReport(patient: any, stats: any, vitals: any[], alerts: any[], language: string): Promise<string> {
  const prompt = `Generate a patient-friendly health impact report in ${language === 'english' ? 'English' : language === 'hindi' ? 'Hindi (use Devanagari script)' : 'Telugu (use Telugu script)'} for a caregiver to share with the patient.

Patient Information:
- Name: ${patient.name}
- Age: ${patient.age} years
- Gender: ${patient.gender || 'Not specified'}
- Village: ${patient.village || 'Not specified'}

Health Statistics (Last 30 days):
- Average Heart Rate: ${stats.avgHeartRate} bpm
- Average Blood Pressure: ${stats.avgSystolicBP}/${stats.avgDiastolicBP} mmHg
- Average Oxygen Level (SpO2): ${stats.avgSpO2}%
- Average Temperature: ${stats.avgTemp}°C
- Total Readings: ${stats.totalReadings}
- Critical Readings: ${stats.criticalReadings}
- Overall Trend: ${stats.trend}
- Active Health Alerts: ${alerts.length}

Generate a warm, encouraging, and easy-to-understand report that:
1. Greets the patient and explains the purpose of the report
2. Summarizes their recent health status in simple language
3. Highlights positive improvements or stable conditions
4. Lists any concerns that need attention (if any)
5. Provides 3-4 practical health tips
6. Ends with encouragement and next steps

Format: Use clear sections with headings. Write in a compassionate, patient-friendly tone that an elderly person can easily understand.`;

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.7,
      maxTokens: 1000
    });

    return result.text;
  } catch (error) {
    console.error(`[v0] Error generating ${language} report:`, error);
    return generateFallbackReport(patient, stats, language);
  }
}

function generateFallbackReport(patient: any, stats: any, language: string): string {
  const reports: Record<string, string> = {
    english: `
HEALTH REPORT FOR ${patient.name.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

Dear ${patient.name},

This report shows your health status for the last 30 days. Your caregiver will help explain this to you.

YOUR HEALTH NUMBERS:
- Heart Rate: Average ${stats.avgHeartRate} beats per minute
- Blood Pressure: ${stats.avgSystolicBP}/${stats.avgDiastolicBP}
- Oxygen Level: ${stats.avgSpO2}%
- Temperature: ${stats.avgTemp}°C
- Total Health Checks: ${stats.totalReadings}

YOUR HEALTH STATUS: ${stats.criticalReadings === 0 ? 'Good - Keep doing what you are doing' : 'Needs Attention - Please follow your doctor\'s advice'}

THINGS TO DO:
1. Continue taking your medicines on time
2. Drink plenty of water daily
3. Get good rest and sleep
4. Try to walk a little every day if possible

Your healthcare team is looking after you. Please ask your caregiver if you have any questions.

Stay Healthy!
    `,
    hindi: `
${patient.name} के लिए स्वास्थ्य रिपोर्ट
तिथि: ${new Date().toLocaleDateString('hi-IN')}

प्रिय ${patient.name},

यह रिपोर्ट पिछले 30 दिनों में आपके स्वास्थ्य की जानकारी दिखाती है। आपका देखभाल करने वाला व्यक्ति इसे समझाने में आपकी मदद करेगा।

आपके स्वास्थ्य के आंकड़े:
- दिल की धड़कन: औसतन ${stats.avgHeartRate} बार प्रति मिनट
- रक्तचाप: ${stats.avgSystolicBP}/${stats.avgDiastolicBP}
- ऑक्सीजन स्तर: ${stats.avgSpO2}%
- तापमान: ${stats.avgTemp}°C
- कुल स्वास्थ्य जांच: ${stats.totalReadings}

आपका स्वास्थ्य स्थिति: ${stats.criticalReadings === 0 ? 'अच्छा है - अपनी वर्तमान दिनचर्या जारी रखें' : 'ध्यान देने की आवश्यकता है - कृपया अपने डॉक्टर की सलाह मानें'}

करने योग्य बातें:
1. अपनी दवाइयां समय पर लें
2. हर दिन पर्याप्त पानी पिएं
3. अच्छी नींद लें
4. अगर संभव हो तो हर दिन थोड़ा टहलें

आपकी स्वास्थ्य देखभाल टीम आपकी देखभाल कर रही है। किसी सवाल के लिए अपने देखभाल करने वाले से पूछें।

स्वस्थ रहें!
    `,
    telugu: `
${patient.name} కోసం ఆరోగ్య నివేదన
తేదీ: ${new Date().toLocaleDateString('te-IN')}

ప్రియ ${patient.name},

ఈ నివేదన గత 30 రోజులలో మీ ఆరోగ్య స్థితిని చూపుతుంది. మీ సంరక్షకుడు దీన్ని వివరించడానికి మీకు సహాయం చేస్తాడు.

మీ ఆరోగ్య సంఖ్యలు:
- హృదయ స్పందన రేటు: సగటు ${stats.avgHeartRate} నిమిషానికి ముళ్లు
- రక్త పీడనం: ${stats.avgSystolicBP}/${stats.avgDiastolicBP}
- ఆక్సిజన్ స్థాయి: ${stats.avgSpO2}%
- ఉష్ణోగ్రత: ${stats.avgTemp}°C
- మొత్తం ఆరోగ్య తనిఖీలు: ${stats.totalReadings}

మీ ఆరోగ్య స్థితి: ${stats.criticalReadings === 0 ? 'మంచిది - ఈ విధంగా కొనసాగించండి' : 'శ్రద్ధ అవసరం - దయచేసి మీ డాక్టర్ సలహాను అనుసరించండి'}

చేయవలసిన విషయాలు:
1. మీ మందులను సమయానికి తీసుకోండి
2. రోజూ తగినంత నీరు తాగండి
3. మంచి నిద్ర పొందండి
4. వీలైతే ప్రతిరోజు కొంచెం నడవండి

మీ ఆరోగ్య సంరక్షణ బృందం మీ కన్నా చూసుకుంటున్నారు. ఏదైనా ప్రశ్నలు ఉంటే మీ సంరక్షకుడిని అడగండి.

ఆరోగ్యంగా ఉండండి!
    `
  };

  return reports[language] || reports.english;
}

function generateFallbackReports(): Record<string, string> {
  return {
    english: 'Unable to generate detailed report. Please try again later.',
    hindi: 'विस्तृत रिपोर्ट तैयार नहीं की जा सकी। कृपया बाद में फिर से कोशिश करें।',
    telugu: 'వివరణాత్మక నివేదన సృష్టించలేము. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.'
  };
}
