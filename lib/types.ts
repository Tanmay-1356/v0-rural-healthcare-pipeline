// Healthcare Data Pipeline Types

export interface Patient {
  id: string;
  patient_id: string;
  name: string;
  age: number;
  gender: string | null;
  village: string | null;
  district: string | null;
  contact_number: string | null;
  emergency_contact: string | null;
  medical_history: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  recorded_at: string;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
  temperature: number | null;
  batch_id: string | null;
  is_critical: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  patient_id: string;
  report_type: 'daily' | 'alert' | 'weekly' | 'monthly';
  title: string;
  summary: string | null;
  insights: ReportInsights | null;
  recommendations: string[] | null;
  risk_level: 'low' | 'moderate' | 'high' | 'critical' | null;
  generated_at: string;
  period_start: string | null;
  period_end: string | null;
}

export interface ReportInsights {
  vital_trends?: {
    heart_rate?: TrendAnalysis;
    blood_pressure?: TrendAnalysis;
    spo2?: TrendAnalysis;
    temperature?: TrendAnalysis;
  };
  anomalies?: AnomalyDetection[];
  risk_factors?: string[];
  ai_analysis?: string;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  average: number;
  min: number;
  max: number;
  change_percent?: number;
}

export interface AnomalyDetection {
  vital_type: string;
  value: number;
  expected_range: { min: number; max: number };
  timestamp: string;
  severity: 'warning' | 'critical';
}

export interface UploadBatch {
  id: string;
  filename: string;
  records_count: number;
  processed_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  uploaded_at: string;
  completed_at: string | null;
}

export interface HealthAlert {
  id: string;
  patient_id: string;
  vital_id: string;
  alert_type: 'heart_rate' | 'blood_pressure' | 'spo2' | 'temperature';
  severity: 'warning' | 'critical';
  message: string;
  threshold_value: string | null;
  actual_value: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

// CSV Row interface for parsing
export interface CSVVitalRow {
  patient_id: string;
  patient_name?: string;
  age?: string;
  gender?: string;
  village?: string;
  district?: string;
  recorded_at: string;
  heart_rate?: string;
  systolic_bp?: string;
  diastolic_bp?: string;
  spo2?: string;
  temperature?: string;
}

// Thresholds for elderly patients (adjusted for age)
export const ELDERLY_VITAL_THRESHOLDS = {
  heart_rate: {
    normal: { min: 60, max: 100 },
    warning: { min: 50, max: 110 },
    critical: { min: 40, max: 130 }
  },
  systolic_bp: {
    normal: { min: 110, max: 140 },
    warning: { min: 100, max: 160 },
    critical: { min: 90, max: 180 }
  },
  diastolic_bp: {
    normal: { min: 60, max: 90 },
    warning: { min: 55, max: 100 },
    critical: { min: 50, max: 110 }
  },
  spo2: {
    normal: { min: 95, max: 100 },
    warning: { min: 92, max: 100 },
    critical: { min: 88, max: 100 }
  },
  temperature: {
    normal: { min: 36.1, max: 37.2 },
    warning: { min: 35.5, max: 38.0 },
    critical: { min: 35.0, max: 39.0 }
  }
};

export interface VitalStatus {
  status: 'normal' | 'warning' | 'critical';
  message: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalVitals: number;
  criticalAlerts: number;
  pendingReports: number;
  recentUploads: number;
}
