import { createClient } from '@/lib/supabase/server';
import { analyzeTrend, detectAnomalies, calculateRiskLevel } from '@/lib/vital-analyzer';
import type { Vital, ReportInsights } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');
    const reportType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let query = supabase
      .from('reports')
      .select(`
        *,
        patients (id, name, patient_id)
      `)
      .order('generated_at', { ascending: false })
      .limit(limit);
    
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    
    if (reportType) {
      query = query.eq('report_type', reportType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    return Response.json({ reports: data });
    
  } catch (error) {
    console.error('Reports fetch error:', error);
    return Response.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { patientId, reportType } = await request.json();
    
    if (!patientId || !reportType) {
      return Response.json({ error: 'Patient ID and report type are required' }, { status: 400 });
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
    
    // Calculate date range based on report type
    const now = new Date();
    let periodStart: Date;
    
    switch (reportType) {
      case 'daily':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 1);
        break;
      case 'weekly':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case 'monthly':
        periodStart = new Date(now);
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      default:
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 1);
    }
    
    // Get vitals for the period
    const { data: vitals, error: vitalsError } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .gte('recorded_at', periodStart.toISOString())
      .lte('recorded_at', now.toISOString())
      .order('recorded_at', { ascending: true });
    
    if (vitalsError) {
      return Response.json({ error: 'Failed to fetch vitals' }, { status: 500 });
    }
    
    const vitalsList = (vitals || []) as Vital[];
    
    // Analyze trends
    const heartRates = vitalsList.filter(v => v.heart_rate !== null).map(v => v.heart_rate as number);
    const systolicBPs = vitalsList.filter(v => v.systolic_bp !== null).map(v => v.systolic_bp as number);
    const diastolicBPs = vitalsList.filter(v => v.diastolic_bp !== null).map(v => v.diastolic_bp as number);
    const spo2Values = vitalsList.filter(v => v.spo2 !== null).map(v => v.spo2 as number);
    const temperatures = vitalsList.filter(v => v.temperature !== null).map(v => v.temperature as number);
    
    const insights: ReportInsights = {
      vital_trends: {
        heart_rate: analyzeTrend(heartRates),
        blood_pressure: {
          ...analyzeTrend(systolicBPs),
          // Add diastolic info
        },
        spo2: analyzeTrend(spo2Values),
        temperature: analyzeTrend(temperatures)
      },
      anomalies: detectAnomalies(vitalsList),
      risk_factors: []
    };
    
    // Identify risk factors
    if (patient.age >= 75) {
      insights.risk_factors?.push('Advanced age (75+) - increased monitoring recommended');
    }
    if (insights.vital_trends?.heart_rate?.trend === 'increasing') {
      insights.risk_factors?.push('Heart rate showing increasing trend');
    }
    if (insights.vital_trends?.spo2?.average && insights.vital_trends.spo2.average < 95) {
      insights.risk_factors?.push('Average SpO2 below optimal level');
    }
    
    const riskLevel = calculateRiskLevel(insights.anomalies || []);
    
    // Generate recommendations based on analysis
    const recommendations: string[] = [];
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Immediate medical consultation recommended');
    }
    if (insights.anomalies && insights.anomalies.length > 0) {
      recommendations.push('Review flagged vital sign anomalies');
    }
    if (insights.vital_trends?.blood_pressure?.average && insights.vital_trends.blood_pressure.average > 140) {
      recommendations.push('Consider blood pressure management review');
    }
    recommendations.push('Continue regular vital sign monitoring');
    
    // Generate report title and summary
    const periodLabel = reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Monthly';
    const title = `${periodLabel} Health Report - ${patient.name}`;
    const summary = `${periodLabel} health analysis for ${patient.name} (${patient.age} years). ` +
      `Analyzed ${vitalsList.length} vital sign records. ` +
      `Risk level: ${riskLevel}. ` +
      `${insights.anomalies?.length || 0} anomalies detected.`;
    
    // Save report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        patient_id: patientId,
        report_type: reportType,
        title,
        summary,
        insights,
        recommendations,
        risk_level: riskLevel,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString()
      })
      .select()
      .single();
    
    if (reportError) {
      return Response.json({ error: 'Failed to save report' }, { status: 500 });
    }
    
    return Response.json({ report });
    
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
