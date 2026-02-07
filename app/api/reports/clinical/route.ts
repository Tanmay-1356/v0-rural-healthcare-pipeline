import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { ELDERLY_VITAL_THRESHOLDS } from "@/lib/types";
import { analyzeTrend, detectAnomalies, calculateRiskLevel } from "@/lib/vital-analyzer";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { patientId } = await request.json();
    
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Fetch patient info
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();
    
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    
    // Fetch all vitals for this patient
    const { data: vitals } = await supabase
      .from("vitals")
      .select("*")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: true });
    
    if (!vitals || vitals.length === 0) {
      return NextResponse.json({ error: "No vitals data available" }, { status: 400 });
    }
    
    // Fetch active alerts
    const { data: alerts } = await supabase
      .from("health_alerts")
      .select("*")
      .eq("patient_id", patientId)
      .eq("is_acknowledged", false);
    
    // Analyze vitals
    const heartRates = vitals.filter(v => v.heart_rate).map(v => v.heart_rate!);
    const systolicBPs = vitals.filter(v => v.systolic_bp).map(v => v.systolic_bp!);
    const diastolicBPs = vitals.filter(v => v.diastolic_bp).map(v => v.diastolic_bp!);
    const spo2Values = vitals.filter(v => v.spo2).map(v => v.spo2!);
    const temperatures = vitals.filter(v => v.temperature).map(v => v.temperature!);
    
    const trends = {
      heartRate: analyzeTrend(heartRates),
      systolicBP: analyzeTrend(systolicBPs),
      diastolicBP: analyzeTrend(diastolicBPs),
      spo2: analyzeTrend(spo2Values),
      temperature: analyzeTrend(temperatures),
    };
    
    const anomalies = detectAnomalies(vitals);
    const riskLevel = calculateRiskLevel(anomalies);
    
    // Calculate hourly risk distribution for heatmap
    const hourlyRisk = calculateHourlyRisk(vitals);
    
    // Calculate correlations
    const correlationData = calculateCorrelations(vitals);
    
    // Generate AI clinical analysis
    const prompt = `You are a clinical decision support AI for rural elderly healthcare. Analyze the following patient data and provide insights for BOTH a medical professional (doctor) AND the patient themselves.

PATIENT INFORMATION:
- Name: ${patient.name}
- Age: ${patient.age} years (elderly patient)
- Gender: ${patient.gender || "Not specified"}
- Medical History: ${patient.medical_history || "None recorded"}

VITAL SIGNS SUMMARY (${vitals.length} readings):
- Heart Rate: Avg ${trends.heartRate.average.toFixed(1)} bpm (${trends.heartRate.trend}), Range: ${trends.heartRate.min}-${trends.heartRate.max} bpm
- Systolic BP: Avg ${trends.systolicBP.average.toFixed(1)} mmHg (${trends.systolicBP.trend}), Range: ${trends.systolicBP.min}-${trends.systolicBP.max} mmHg
- Diastolic BP: Avg ${trends.diastolicBP.average.toFixed(1)} mmHg (${trends.diastolicBP.trend}), Range: ${trends.diastolicBP.min}-${trends.diastolicBP.max} mmHg
- SpO2: Avg ${trends.spo2.average.toFixed(1)}% (${trends.spo2.trend}), Range: ${trends.spo2.min}-${trends.spo2.max}%
- Temperature: Avg ${trends.temperature.average.toFixed(1)}°C (${trends.temperature.trend}), Range: ${trends.temperature.min}-${trends.temperature.max}°C

ANOMALIES DETECTED: ${anomalies.length}
${anomalies.slice(0, 10).map(a => `- ${a.vital_type}: ${a.value} (${a.severity}) at ${a.timestamp}`).join("\n")}

ACTIVE ALERTS: ${alerts?.length || 0}
${alerts?.slice(0, 5).map(a => `- ${a.alert_type}: ${a.message}`).join("\n") || "None"}

ELDERLY REFERENCE RANGES:
- Heart Rate: ${ELDERLY_VITAL_THRESHOLDS.heart_rate.normal.min}-${ELDERLY_VITAL_THRESHOLDS.heart_rate.normal.max} bpm
- Systolic BP: ${ELDERLY_VITAL_THRESHOLDS.systolic_bp.normal.min}-${ELDERLY_VITAL_THRESHOLDS.systolic_bp.normal.max} mmHg
- Diastolic BP: ${ELDERLY_VITAL_THRESHOLDS.diastolic_bp.normal.min}-${ELDERLY_VITAL_THRESHOLDS.diastolic_bp.normal.max} mmHg
- SpO2: ${ELDERLY_VITAL_THRESHOLDS.spo2.normal.min}-${ELDERLY_VITAL_THRESHOLDS.spo2.normal.max}%
- Temperature: ${ELDERLY_VITAL_THRESHOLDS.temperature.normal.min}-${ELDERLY_VITAL_THRESHOLDS.temperature.normal.max}°C

CORRELATION DATA:
${correlationData.map(c => `- ${c.vital1} vs ${c.vital2}: ${c.correlation} (r=${c.coefficient.toFixed(2)})`).join("\n")}

Please provide your analysis as a JSON object with this exact structure:
{
  "doctorView": {
    "clinicalObservations": "detailed clinical observations using medical terminology",
    "diagnoses": ["potential diagnosis 1", "potential diagnosis 2"],
    "riskFactors": ["risk factor 1", "risk factor 2"],
    "recommendedTests": ["test 1", "test 2"],
    "medicationConsiderations": "medication notes or null"
  },
  "patientView": {
    "healthScore": "green|yellow|red",
    "healthScoreLabel": "label for the score",
    "plainEnglishSummary": "simple summary for patient",
    "actionableAdvice": ["advice 1", "advice 2"],
    "encouragement": "positive message"
  },
  "correlations": [
    {"vital1": "name", "vital2": "name", "correlation": "positive|negative|none", "significance": "explanation"}
  ]
}

Respond with ONLY the JSON object, no other text.`;

    // Check if GROQ_API_KEY is set - use fallback if not
    let analysis;
    if (!process.env.GROQ_API_KEY) {
      console.error('[v0] GROQ_API_KEY is not set - using rule-based analysis');
      analysis = generateFallbackAnalysis(patient, trends, anomalies, riskLevel, alerts);
    } else {
      try {
        const result = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt,
        });
        
        // Parse JSON from response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (aiError) {
        console.error('[v0] AI analysis failed:', aiError instanceof Error ? aiError.message : aiError);
        analysis = generateFallbackAnalysis(patient, trends, anomalies, riskLevel, alerts);
      }
    }
    
    // Get the latest vitals for current status
    const latestVital = vitals[vitals.length - 1];
    
    return NextResponse.json({
      success: true,
      patient,
      analysis,
      vitals: {
        latest: latestVital,
        trends,
        anomalies,
        count: vitals.length,
      },
      hourlyRisk,
      correlationData,
      riskLevel,
      alertCount: alerts?.length || 0,
      thresholds: ELDERLY_VITAL_THRESHOLDS,
    });
    
  } catch (error) {
    console.error("Clinical report error:", error);
    return NextResponse.json(
      { error: "Failed to generate clinical report" },
      { status: 500 }
    );
  }
}

// Calculate hourly risk distribution
function calculateHourlyRisk(vitals: any[]) {
  const hourlyData: { [hour: number]: { total: number; abnormal: number } } = {};
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { total: 0, abnormal: 0 };
  }
  
  for (const vital of vitals) {
    const hour = new Date(vital.recorded_at).getHours();
    hourlyData[hour].total++;
    
    // Check if any vital is abnormal
    let isAbnormal = false;
    if (vital.heart_rate && (vital.heart_rate < 60 || vital.heart_rate > 100)) isAbnormal = true;
    if (vital.systolic_bp && (vital.systolic_bp < 110 || vital.systolic_bp > 140)) isAbnormal = true;
    if (vital.spo2 && vital.spo2 < 95) isAbnormal = true;
    if (vital.temperature && (vital.temperature < 36.1 || vital.temperature > 37.2)) isAbnormal = true;
    
    if (isAbnormal) hourlyData[hour].abnormal++;
  }
  
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    label: `${hour.toString().padStart(2, "0")}:00`,
    total: data.total,
    abnormal: data.abnormal,
    riskLevel: data.total > 0 ? (data.abnormal / data.total) * 100 : 0,
  }));
}

// Calculate correlations between vitals
function calculateCorrelations(vitals: any[]) {
  const correlations = [];
  
  const pairs = [
    { vital1: "heart_rate", vital2: "temperature", label1: "Heart Rate", label2: "Temperature" },
    { vital1: "heart_rate", vital2: "spo2", label1: "Heart Rate", label2: "SpO2" },
    { vital1: "systolic_bp", vital2: "heart_rate", label1: "Systolic BP", label2: "Heart Rate" },
    { vital1: "temperature", vital2: "spo2", label1: "Temperature", label2: "SpO2" },
  ];
  
  for (const pair of pairs) {
    const validVitals = vitals.filter(v => v[pair.vital1] != null && v[pair.vital2] != null);
    if (validVitals.length < 3) continue;
    
    const x = validVitals.map(v => v[pair.vital1]);
    const y = validVitals.map(v => v[pair.vital2]);
    
    const coefficient = pearsonCorrelation(x, y);
    
    let correlation: "positive" | "negative" | "none" = "none";
    if (coefficient > 0.3) correlation = "positive";
    else if (coefficient < -0.3) correlation = "negative";
    
    correlations.push({
      vital1: pair.label1,
      vital2: pair.label2,
      coefficient,
      correlation,
      data: validVitals.slice(-20).map(v => ({
        x: v[pair.vital1],
        y: v[pair.vital2],
        timestamp: v.recorded_at,
      })),
    });
  }
  
  return correlations;
}

// Pearson correlation coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Generate fallback analysis when AI is unavailable
function generateFallbackAnalysis(
  patient: any,
  trends: any,
  anomalies: any[],
  riskLevel: string,
  alerts: any[] | null
) {
  const healthScore = riskLevel === 'critical' ? 'red' : riskLevel === 'high' ? 'yellow' : 'green';
  
  const riskFactors: string[] = [];
  const diagnoses: string[] = [];
  
  // Analyze trends for risk factors
  if (trends.heartRate.average > 100) {
    riskFactors.push("Elevated resting heart rate");
    diagnoses.push("Possible tachycardia");
  }
  if (trends.heartRate.average < 60) {
    riskFactors.push("Low resting heart rate");
    diagnoses.push("Possible bradycardia");
  }
  if (trends.systolicBP.average > 140) {
    riskFactors.push("Elevated systolic blood pressure");
    diagnoses.push("Stage 1 or Stage 2 Hypertension");
  }
  if (trends.spo2.average < 95) {
    riskFactors.push("Below-normal oxygen saturation");
    diagnoses.push("Possible hypoxemia");
  }
  if (trends.temperature.average > 37.5) {
    riskFactors.push("Elevated body temperature");
    diagnoses.push("Possible febrile condition");
  }
  
  return {
    doctorView: {
      clinicalObservations: `${patient.name}, ${patient.age}-year-old ${patient.gender || 'patient'}. Vital signs analysis shows: HR avg ${trends.heartRate.average.toFixed(0)} bpm (${trends.heartRate.trend}), BP avg ${trends.systolicBP.average.toFixed(0)}/${trends.diastolicBP.average.toFixed(0)} mmHg, SpO2 avg ${trends.spo2.average.toFixed(1)}%, Temp avg ${trends.temperature.average.toFixed(1)}°C. ${anomalies.length} anomalies detected in the monitoring period.`,
      diagnoses: diagnoses.length > 0 ? diagnoses : ["No significant diagnoses based on available data"],
      riskFactors: riskFactors.length > 0 ? riskFactors : ["Age-related monitoring recommended"],
      recommendedTests: ["Complete blood count", "Basic metabolic panel", "Thyroid function test"],
      medicationConsiderations: riskLevel === 'high' || riskLevel === 'critical' 
        ? "Review current medications for potential interactions affecting vitals" 
        : null,
    },
    patientView: {
      healthScore,
      healthScoreLabel: healthScore === 'green' ? 'Good Health' : healthScore === 'yellow' ? 'Monitor Closely' : 'Needs Attention',
      plainEnglishSummary: healthScore === 'green' 
        ? "Your vital signs look stable. Keep up the good work with your health routines!"
        : healthScore === 'yellow'
        ? "Some of your readings need attention. Please follow up with your healthcare provider."
        : "Your vital signs show some concerns. Please consult with a doctor soon.",
      actionableAdvice: [
        "Continue taking your medications as prescribed",
        "Stay well hydrated with 6-8 glasses of water daily",
        "Get 7-8 hours of restful sleep each night",
        "Take short walks if you are able to",
        "Avoid salty and processed foods"
      ],
      encouragement: "You are doing a great job monitoring your health! Regular tracking helps you and your care team make better decisions.",
    },
    correlations: [],
  };
}
