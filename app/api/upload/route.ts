import { createClient } from '@/lib/supabase/server';
import { parseCSV, validateVitalRecord } from '@/lib/csv-parser';
import { generateAlerts, checkVitalStatus } from '@/lib/vital-analyzer';
import type { CSVVitalRow } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!file.name.endsWith('.csv')) {
      return Response.json({ error: 'File must be a CSV' }, { status: 400 });
    }
    
    const content = await file.text();
    const parseResult = parseCSV(content);
    
    if (!parseResult.success) {
      return Response.json({ 
        error: 'Failed to parse CSV', 
        details: parseResult.errors 
      }, { status: 400 });
    }
    
    // Create upload batch record
    const { data: batch, error: batchError } = await supabase
      .from('upload_batches')
      .insert({
        filename: file.name,
        records_count: parseResult.totalRows,
        status: 'processing'
      })
      .select()
      .single();
    
    if (batchError) {
      return Response.json({ error: 'Failed to create batch record', details: batchError.message }, { status: 500 });
    }
    
    let processedCount = 0;
    let failedCount = 0;
    const allAlerts: Array<{
      patient_id: string;
      vital_id: string;
      alert_type: string;
      severity: string;
      message: string;
      threshold_value: string | null;
      actual_value: string | null;
      is_acknowledged: boolean;
    }> = [];
    
    // Process each row
    for (const row of parseResult.data) {
      try {
        // Validate vital record
        const validation = validateVitalRecord(row);
        if (!validation.valid) {
          failedCount++;
          continue;
        }
        
        // Upsert patient
        const patientData = {
          patient_id: row.patient_id,
          name: row.patient_name || `Patient ${row.patient_id}`,
          age: row.age ? parseInt(row.age) : 65,
          gender: row.gender || null,
          village: row.village || null,
          district: row.district || null
        };
        
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .upsert(patientData, { onConflict: 'patient_id' })
          .select()
          .single();
        
        if (patientError || !patient) {
          failedCount++;
          continue;
        }
        
        // Check if any vital is critical
        let isCritical = false;
        if (row.heart_rate) {
          const status = checkVitalStatus('heart_rate', parseFloat(row.heart_rate));
          if (status.status === 'critical') isCritical = true;
        }
        if (row.spo2) {
          const status = checkVitalStatus('spo2', parseFloat(row.spo2));
          if (status.status === 'critical') isCritical = true;
        }
        
        // Insert vital signs
        const vitalData = {
          patient_id: patient.id,
          recorded_at: row.recorded_at,
          heart_rate: row.heart_rate ? parseInt(row.heart_rate) : null,
          systolic_bp: row.systolic_bp ? parseInt(row.systolic_bp) : null,
          diastolic_bp: row.diastolic_bp ? parseInt(row.diastolic_bp) : null,
          spo2: row.spo2 ? parseFloat(row.spo2) : null,
          temperature: row.temperature ? parseFloat(row.temperature) : null,
          batch_id: batch.id,
          is_critical: isCritical
        };
        
        const { data: vital, error: vitalError } = await supabase
          .from('vitals')
          .insert(vitalData)
          .select()
          .single();
        
        if (vitalError || !vital) {
          failedCount++;
          continue;
        }
        
        // Generate alerts for abnormal vitals
        const alerts = generateAlerts(vital, patient.id);
        if (alerts.length > 0) {
          allAlerts.push(...alerts);
        }
        
        processedCount++;
      } catch (error) {
        failedCount++;
      }
    }
    
    // Insert all alerts
    if (allAlerts.length > 0) {
      await supabase.from('health_alerts').insert(allAlerts);
    }
    
    // Update batch status
    await supabase
      .from('upload_batches')
      .update({
        processed_count: processedCount,
        failed_count: failedCount,
        status: failedCount === parseResult.totalRows ? 'failed' : 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batch.id);
    
    return Response.json({
      success: true,
      batchId: batch.id,
      totalRows: parseResult.totalRows,
      processedCount,
      failedCount,
      alertsGenerated: allAlerts.length,
      parseErrors: parseResult.errors
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ 
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
