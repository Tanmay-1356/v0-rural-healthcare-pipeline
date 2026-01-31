import { 
  ELDERLY_VITAL_THRESHOLDS, 
  type Vital, 
  type VitalStatus, 
  type TrendAnalysis,
  type AnomalyDetection,
  type HealthAlert 
} from './types';

// Check if a vital value is within normal range
export function checkVitalStatus(
  vitalType: keyof typeof ELDERLY_VITAL_THRESHOLDS,
  value: number
): VitalStatus {
  const thresholds = ELDERLY_VITAL_THRESHOLDS[vitalType];
  
  if (value >= thresholds.normal.min && value <= thresholds.normal.max) {
    return { status: 'normal', message: 'Within normal range' };
  }
  
  if (value >= thresholds.warning.min && value <= thresholds.warning.max) {
    const isLow = value < thresholds.normal.min;
    return { 
      status: 'warning', 
      message: `${isLow ? 'Low' : 'High'} - requires monitoring` 
    };
  }
  
  const isLow = value < thresholds.critical.min;
  return { 
    status: 'critical', 
    message: `${isLow ? 'Critically low' : 'Critically high'} - immediate attention needed` 
  };
}

// Analyze trends in vital signs over time
export function analyzeTrend(values: number[]): TrendAnalysis {
  if (values.length === 0) {
    return { trend: 'stable', average: 0, min: 0, max: 0 };
  }
  
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (values.length < 2) {
    return { trend: 'stable', average, min, max };
  }
  
  // Simple linear regression for trend detection
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  const threshold = average * 0.05; // 5% change threshold
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (slope > threshold) {
    trend = 'increasing';
  } else if (slope < -threshold) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }
  
  const firstHalf = values.slice(0, Math.floor(n / 2));
  const secondHalf = values.slice(Math.floor(n / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change_percent = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  
  return { trend, average, min, max, change_percent };
}

// Detect anomalies in vital signs
export function detectAnomalies(vitals: Vital[]): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  
  for (const vital of vitals) {
    if (vital.heart_rate !== null) {
      const status = checkVitalStatus('heart_rate', vital.heart_rate);
      if (status.status !== 'normal') {
        anomalies.push({
          vital_type: 'heart_rate',
          value: vital.heart_rate,
          expected_range: ELDERLY_VITAL_THRESHOLDS.heart_rate.normal,
          timestamp: vital.recorded_at,
          severity: status.status
        });
      }
    }
    
    if (vital.systolic_bp !== null) {
      const status = checkVitalStatus('systolic_bp', vital.systolic_bp);
      if (status.status !== 'normal') {
        anomalies.push({
          vital_type: 'systolic_bp',
          value: vital.systolic_bp,
          expected_range: ELDERLY_VITAL_THRESHOLDS.systolic_bp.normal,
          timestamp: vital.recorded_at,
          severity: status.status
        });
      }
    }
    
    if (vital.diastolic_bp !== null) {
      const status = checkVitalStatus('diastolic_bp', vital.diastolic_bp);
      if (status.status !== 'normal') {
        anomalies.push({
          vital_type: 'diastolic_bp',
          value: vital.diastolic_bp,
          expected_range: ELDERLY_VITAL_THRESHOLDS.diastolic_bp.normal,
          timestamp: vital.recorded_at,
          severity: status.status
        });
      }
    }
    
    if (vital.spo2 !== null) {
      const status = checkVitalStatus('spo2', vital.spo2);
      if (status.status !== 'normal') {
        anomalies.push({
          vital_type: 'spo2',
          value: vital.spo2,
          expected_range: ELDERLY_VITAL_THRESHOLDS.spo2.normal,
          timestamp: vital.recorded_at,
          severity: status.status
        });
      }
    }
    
    if (vital.temperature !== null) {
      const status = checkVitalStatus('temperature', vital.temperature);
      if (status.status !== 'normal') {
        anomalies.push({
          vital_type: 'temperature',
          value: vital.temperature,
          expected_range: ELDERLY_VITAL_THRESHOLDS.temperature.normal,
          timestamp: vital.recorded_at,
          severity: status.status
        });
      }
    }
  }
  
  return anomalies;
}

// Generate health alerts from vitals
export function generateAlerts(
  vital: Vital,
  patientId: string
): Omit<HealthAlert, 'id' | 'created_at' | 'acknowledged_at'>[] {
  const alerts: Omit<HealthAlert, 'id' | 'created_at' | 'acknowledged_at'>[] = [];
  
  const vitalChecks: { type: HealthAlert['alert_type']; value: number | null; threshold: keyof typeof ELDERLY_VITAL_THRESHOLDS }[] = [
    { type: 'heart_rate', value: vital.heart_rate, threshold: 'heart_rate' },
    { type: 'blood_pressure', value: vital.systolic_bp, threshold: 'systolic_bp' },
    { type: 'spo2', value: vital.spo2, threshold: 'spo2' },
    { type: 'temperature', value: vital.temperature, threshold: 'temperature' }
  ];
  
  for (const check of vitalChecks) {
    if (check.value !== null) {
      const status = checkVitalStatus(check.threshold, check.value);
      if (status.status !== 'normal') {
        const thresholds = ELDERLY_VITAL_THRESHOLDS[check.threshold];
        alerts.push({
          patient_id: patientId,
          vital_id: vital.id,
          alert_type: check.type,
          severity: status.status,
          message: `${check.type.replace('_', ' ').toUpperCase()}: ${status.message}`,
          threshold_value: `${thresholds.normal.min}-${thresholds.normal.max}`,
          actual_value: check.value.toString(),
          is_acknowledged: false
        });
      }
    }
  }
  
  return alerts;
}

// Calculate risk level based on anomalies
export function calculateRiskLevel(anomalies: AnomalyDetection[]): 'low' | 'moderate' | 'high' | 'critical' {
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'warning').length;
  
  if (criticalCount >= 2) return 'critical';
  if (criticalCount >= 1) return 'high';
  if (warningCount >= 3) return 'high';
  if (warningCount >= 1) return 'moderate';
  return 'low';
}

// Format vital name for display
export function formatVitalName(vitalType: string): string {
  const names: Record<string, string> = {
    heart_rate: 'Heart Rate',
    systolic_bp: 'Systolic BP',
    diastolic_bp: 'Diastolic BP',
    spo2: 'SpO2',
    temperature: 'Temperature',
    blood_pressure: 'Blood Pressure'
  };
  return names[vitalType] || vitalType;
}

// Get unit for vital type
export function getVitalUnit(vitalType: string): string {
  const units: Record<string, string> = {
    heart_rate: 'bpm',
    systolic_bp: 'mmHg',
    diastolic_bp: 'mmHg',
    spo2: '%',
    temperature: '°C',
    blood_pressure: 'mmHg'
  };
  return units[vitalType] || '';
}
