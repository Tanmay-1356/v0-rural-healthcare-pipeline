import { createClient } from '@/lib/supabase/server';
import { analyzeTrend, detectAnomalies, calculateRiskLevel } from '@/lib/vital-analyzer';
import type { Vital } from '@/lib/types';

// Impact Report API - Analyzes the entire accumulated dataset across all uploads
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get total stats
    const [patientsResult, vitalsResult, alertsResult, uploadsResult] = await Promise.all([
      supabase.from('patients').select('*', { count: 'exact' }),
      supabase.from('vitals').select('*', { count: 'exact' }),
      supabase.from('health_alerts').select('*', { count: 'exact' }).eq('is_acknowledged', false),
      supabase.from('upload_batches').select('*', { count: 'exact' }).eq('status', 'completed')
    ]);
    
    const totalPatients = patientsResult.count || 0;
    const totalVitals = vitalsResult.count || 0;
    const activeAlerts = alertsResult.count || 0;
    const completedUploads = uploadsResult.count || 0;
    
    // Get all vitals for trend analysis (last 30 days for performance)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentVitals } = await supabase
      .from('vitals')
      .select('*')
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: true });
    
    const vitalsList = (recentVitals || []) as Vital[];
    
    // Aggregate vital trends across all patients
    const heartRates = vitalsList.filter(v => v.heart_rate !== null).map(v => v.heart_rate as number);
    const systolicBPs = vitalsList.filter(v => v.systolic_bp !== null).map(v => v.systolic_bp as number);
    const diastolicBPs = vitalsList.filter(v => v.diastolic_bp !== null).map(v => v.diastolic_bp as number);
    const spo2Values = vitalsList.filter(v => v.spo2 !== null).map(v => v.spo2 as number);
    const temperatures = vitalsList.filter(v => v.temperature !== null).map(v => v.temperature as number);
    
    // Calculate population-level trends
    const populationTrends = {
      heart_rate: analyzeTrend(heartRates),
      systolic_bp: analyzeTrend(systolicBPs),
      diastolic_bp: analyzeTrend(diastolicBPs),
      spo2: analyzeTrend(spo2Values),
      temperature: analyzeTrend(temperatures)
    };
    
    // Detect anomalies across all data
    const allAnomalies = detectAnomalies(vitalsList);
    const criticalAnomalies = allAnomalies.filter(a => a.severity === 'critical');
    const warningAnomalies = allAnomalies.filter(a => a.severity === 'warning');
    
    // Get patient age distribution
    const { data: patients } = await supabase.from('patients').select('age');
    const ages = (patients || []).map(p => p.age).filter(Boolean);
    const ageGroups = {
      under60: ages.filter(a => a < 60).length,
      sixtyTo70: ages.filter(a => a >= 60 && a < 70).length,
      seventyTo80: ages.filter(a => a >= 70 && a < 80).length,
      over80: ages.filter(a => a >= 80).length
    };
    
    // Get alerts by type
    const { data: alertsByType } = await supabase
      .from('health_alerts')
      .select('alert_type, severity')
      .eq('is_acknowledged', false);
    
    const alertBreakdown = {
      heart_rate: (alertsByType || []).filter(a => a.alert_type === 'heart_rate').length,
      blood_pressure: (alertsByType || []).filter(a => a.alert_type === 'blood_pressure').length,
      spo2: (alertsByType || []).filter(a => a.alert_type === 'spo2').length,
      temperature: (alertsByType || []).filter(a => a.alert_type === 'temperature').length
    };
    
    // Get upload batches with total records
    const { data: batches } = await supabase
      .from('upload_batches')
      .select('filename, records_count, processed_count, uploaded_at')
      .eq('status', 'completed')
      .order('uploaded_at', { ascending: false })
      .limit(10);
    
    const totalRecordsProcessed = (batches || []).reduce((sum, b) => sum + (b.processed_count || 0), 0);
    
    // Calculate overall risk assessment
    const overallRisk = calculateRiskLevel(allAnomalies);
    
    // Generate insights
    const insights = [];
    
    if (populationTrends.heart_rate?.average) {
      if (populationTrends.heart_rate.average > 85) {
        insights.push({
          type: 'warning',
          message: `Population average heart rate (${populationTrends.heart_rate.average.toFixed(1)} bpm) is elevated`
        });
      }
    }
    
    if (populationTrends.spo2?.average && populationTrends.spo2.average < 95) {
      insights.push({
        type: 'critical',
        message: `Population average SpO2 (${populationTrends.spo2.average.toFixed(1)}%) is below optimal`
      });
    }
    
    if (ageGroups.over80 > totalPatients * 0.3) {
      insights.push({
        type: 'info',
        message: `${((ageGroups.over80 / totalPatients) * 100).toFixed(0)}% of patients are over 80 - increased monitoring recommended`
      });
    }
    
    if (criticalAnomalies.length > 0) {
      insights.push({
        type: 'critical',
        message: `${criticalAnomalies.length} critical vital sign anomalies detected across the population`
      });
    }
    
    // Generate recommendations
    const recommendations = [];
    
    if (criticalAnomalies.length > 5) {
      recommendations.push('Prioritize patients with critical alerts for immediate follow-up');
    }
    if (alertBreakdown.spo2 > 0) {
      recommendations.push('Review patients with low SpO2 readings for respiratory assessment');
    }
    if (alertBreakdown.blood_pressure > 0) {
      recommendations.push('Schedule blood pressure management review for flagged patients');
    }
    if (totalPatients > 0) {
      recommendations.push('Continue regular telemetry data collection for trend monitoring');
    }
    
    return Response.json({
      summary: {
        totalPatients,
        totalVitals,
        activeAlerts,
        completedUploads,
        totalRecordsProcessed,
        overallRisk,
        dataRange: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      },
      populationTrends,
      ageDistribution: ageGroups,
      alertBreakdown,
      anomalies: {
        critical: criticalAnomalies.length,
        warning: warningAnomalies.length,
        recent: allAnomalies.slice(0, 10)
      },
      recentBatches: batches || [],
      insights,
      recommendations
    });
    
  } catch (error) {
    console.error('Impact report error:', error);
    return Response.json({ 
      error: 'Failed to generate impact report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
