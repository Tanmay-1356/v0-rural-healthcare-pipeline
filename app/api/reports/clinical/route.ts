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

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
    });
    
    console.log("[v0] Clinical report Groq response:", result.text?.slice(0, 500));
    
    // Parse JSON from response - try multiple approaches
    let analysis;
    const responseText = result.text || "";
    
    try {
      // First try: direct parse
      analysis = JSON.parse(responseText.trim());
    } catch {
      try {
        // Second try: find JSON object in text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.log("[v0] Clinical JSON parsing failed, using fallback");
      }
    }
    
    // If parsing failed, create comprehensive fallback analysis
    if (!analysis) {
      const healthScore = riskLevel === 'critical' ? 'red' : riskLevel === 'high' ? 'yellow' : 'green';
      const healthLabel = riskLevel === 'critical' ? 'Needs Immediate Attention' : 
                          riskLevel === 'high' ? 'Monitor Closely' : 'Stable Condition';
      
      analysis = {
        doctorView: {
          clinicalObservations: `Patient ${patient.name}, ${patient.age} years old, presents with ${vitals.length} recorded vital sign measurements. ${
            anomalies.length > 0 
              ? `${anomalies.length} anomalies detected including ${anomalies.slice(0, 3).map(a => `${a.vital_type} (${a.severity})`).join(', ')}.`
              : 'Vital signs within acceptable parameters for elderly patient.'
          } Trends show: HR ${trends.heartRate.trend}, BP ${trends.systolicBP.trend}/${trends.diastolicBP.trend}, SpO2 ${trends.spo2.trend}, Temp ${trends.temperature.trend}.`,
          diagnoses: anomalies.length > 0 
            ? ['Vital sign variability requiring monitoring', ...new Set(anomalies.slice(0, 3).map(a => `Abnormal ${a.vital_type}`))]
            : ['No acute concerns identified'],
          riskFactors: [
            patient.age >= 75 ? 'Advanced age (75+)' : 'Elderly patient',
            ...anomalies.filter(a => a.severity === 'critical').map(a => `Critical ${a.vital_type} readings`),
            trends.heartRate.trend === 'increasing' ? 'Increasing heart rate trend' : null,
            trends.spo2.trend === 'decreasing' ? 'Decreasing SpO2 trend' : null,
          ].filter(Boolean),
          recommendedTests: [
            'Complete blood count (CBC)',
            'Basic metabolic panel',
            anomalies.some(a => a.vital_type === 'heart_rate') ? 'ECG/EKG' : null,
            anomalies.some(a => a.vital_type === 'spo2') ? 'Chest X-ray' : null,
          ].filter(Boolean),
          medicationConsiderations: riskLevel === 'critical' || riskLevel === 'high' 
            ? 'Review current medications for cardiovascular and respiratory effects. Consider medication adjustments based on vital sign trends.'
            : 'Continue current medication regimen. Monitor for any adverse effects.',
        },
        patientView: {
          healthScore,
          healthScoreLabel: healthLabel,
          plainEnglishSummary: healthScore === 'green' 
            ? `Good news! Your health readings look stable. Your heart rate, blood pressure, and oxygen levels are within normal range for your age.`
            : healthScore === 'yellow'
            ? `Your health readings show some values that need watching. This doesn't mean something is wrong, but we want to keep a close eye on things.`
            : `Some of your health readings need attention. Please follow up with your healthcare provider soon to discuss these results.`,
          actionableAdvice: [
            'Take your medications as prescribed',
            'Drink plenty of water throughout the day',
            'Get adequate rest and sleep',
            healthScore !== 'green' ? 'Avoid strenuous activities until cleared by your doctor' : 'Light daily exercise is encouraged',
            'Keep track of how you feel each day',
          ],
          encouragement: healthScore === 'green'
            ? 'You are doing a great job managing your health! Keep up the good work with regular monitoring.'
            : 'Thank you for staying on top of your health. Regular monitoring helps us catch any changes early!',
        },
        correlations: correlationData.map(c => ({
          vital1: c.vital1,
          vital2: c.vital2,
          correlation: c.correlation,
          significance: c.correlation === 'positive' 
            ? `When ${c.vital1} increases, ${c.vital2} tends to increase as well. This is ${c.vital1 === 'Heart Rate' && c.vital2 === 'Temperature' ? 'expected during fever or exertion' : 'worth monitoring'}.`
            : c.correlation === 'negative'
            ? `When ${c.vital1} increases, ${c.vital2} tends to decrease. This pattern should be monitored.`
            : `No significant relationship found between ${c.vital1} and ${c.vital2}.`,
        })),
      };
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
