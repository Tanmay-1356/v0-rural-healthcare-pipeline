import type { CSVVitalRow } from './types';

export interface ParsedCSVResult {
  success: boolean;
  data: CSVVitalRow[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

// Parse CSV content into structured data
export function parseCSV(content: string): ParsedCSVResult {
  const lines = content.trim().split('\n');
  const errors: string[] = [];
  const data: CSVVitalRow[] = [];
  
  if (lines.length < 2) {
    return {
      success: false,
      data: [],
      errors: ['CSV file must contain a header row and at least one data row'],
      totalRows: 0,
      validRows: 0
    };
  }
  
  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
  
  // Required columns
  const requiredColumns = ['patient_id', 'recorded_at'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}`],
      totalRows: lines.length - 1,
      validRows: 0
    };
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      // Validate required fields
      if (!row.patient_id) {
        errors.push(`Row ${i + 1}: Missing patient_id`);
        continue;
      }
      
      if (!row.recorded_at) {
        errors.push(`Row ${i + 1}: Missing recorded_at timestamp`);
        continue;
      }
      
      // Validate date format
      const date = new Date(row.recorded_at);
      if (isNaN(date.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date format for recorded_at`);
        continue;
      }
      
      // Validate numeric fields
      const numericFields = ['heart_rate', 'systolic_bp', 'diastolic_bp', 'spo2', 'temperature', 'age'];
      for (const field of numericFields) {
        if (row[field] && isNaN(parseFloat(row[field]))) {
          errors.push(`Row ${i + 1}: Invalid numeric value for ${field}`);
        }
      }
      
      data.push(row as unknown as CSVVitalRow);
    } catch (error) {
      errors.push(`Row ${i + 1}: Failed to parse - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: data.length > 0,
    data,
    errors,
    totalRows: lines.length - 1,
    validRows: data.length
  };
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Generate sample CSV template
export function generateCSVTemplate(): string {
  const headers = [
    'patient_id',
    'patient_name',
    'age',
    'gender',
    'village',
    'district',
    'recorded_at',
    'heart_rate',
    'systolic_bp',
    'diastolic_bp',
    'spo2',
    'temperature'
  ];
  
  const sampleData = [
    ['PAT001', 'Ramesh Kumar', '72', 'Male', 'Chandpur', 'Patna', '2025-01-30T10:30:00', '78', '135', '85', '97', '36.8'],
    ['PAT002', 'Sarita Devi', '68', 'Female', 'Bhagwanpur', 'Patna', '2025-01-30T11:00:00', '82', '142', '88', '96', '37.0'],
    ['PAT003', 'Mohan Singh', '75', 'Male', 'Danapur', 'Patna', '2025-01-30T11:30:00', '72', '128', '82', '98', '36.6']
  ];
  
  return [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
}

// Validate a single vital record
export function validateVitalRecord(row: CSVVitalRow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check heart rate range (20-200 bpm is physiologically possible)
  if (row.heart_rate) {
    const hr = parseFloat(row.heart_rate);
    if (hr < 20 || hr > 200) {
      errors.push(`Heart rate ${hr} is outside valid range (20-200 bpm)`);
    }
  }
  
  // Check blood pressure ranges
  if (row.systolic_bp) {
    const sbp = parseFloat(row.systolic_bp);
    if (sbp < 60 || sbp > 250) {
      errors.push(`Systolic BP ${sbp} is outside valid range (60-250 mmHg)`);
    }
  }
  
  if (row.diastolic_bp) {
    const dbp = parseFloat(row.diastolic_bp);
    if (dbp < 30 || dbp > 150) {
      errors.push(`Diastolic BP ${dbp} is outside valid range (30-150 mmHg)`);
    }
  }
  
  // Check SpO2 range (0-100%)
  if (row.spo2) {
    const spo2 = parseFloat(row.spo2);
    if (spo2 < 0 || spo2 > 100) {
      errors.push(`SpO2 ${spo2} is outside valid range (0-100%)`);
    }
  }
  
  // Check temperature range (30-45°C is physiologically possible)
  if (row.temperature) {
    const temp = parseFloat(row.temperature);
    if (temp < 30 || temp > 45) {
      errors.push(`Temperature ${temp} is outside valid range (30-45°C)`);
    }
  }
  
  // Check age range for elderly patients
  if (row.age) {
    const age = parseInt(row.age);
    if (age < 0 || age > 120) {
      errors.push(`Age ${age} is outside valid range (0-120 years)`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
