"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import useSWR, { mutate } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Clock, 
  Users, 
  Database,
  Activity,
  TrendingUp
} from "lucide-react";
import { generateCSVTemplate } from "@/lib/csv-parser";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UploadResult {
  success: boolean;
  batchId?: string;
  totalRows?: number;
  processedCount?: number;
  failedCount?: number;
  alertsGenerated?: number;
  newPatientsAdded?: number;
  existingPatientsUpdated?: number;
  parseErrors?: string[];
  error?: string;
  details?: string | string[];
}

interface UploadBatch {
  id: string;
  filename: string;
  records_count: number;
  processed_count: number;
  failed_count: number;
  status: string;
  uploaded_at: string;
  completed_at: string | null;
}

interface DashboardStats {
  stats: {
    totalPatients: number;
    totalVitals: number;
    criticalAlerts: number;
    recentUploads: number;
  };
}

export function UploadView() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  // Fetch upload history
  const { data: uploadHistory, isLoading: historyLoading } = useSWR<{ batches: UploadBatch[] }>(
    "/api/upload/history",
    fetcher,
    { refreshInterval: 5000 }
  );
  
  // Fetch live patient count - refreshes frequently for real-time updates
  const { data: dashboardData, isLoading: statsLoading } = useSWR<DashboardStats>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 3000 }
  );

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.name.endsWith(".csv")) {
      setResult({ success: false, error: "Please upload a CSV file" });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      
      // Refresh all data after successful upload
      if (data.success) {
        mutate("/api/dashboard");
        mutate("/api/upload/history");
        mutate("/api/patients");
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vitals_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success border-success/30";
      case "processing":
        return "bg-primary/10 text-primary border-primary/30";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Upload Telemetry Data</h1>
        <p className="mt-1 text-muted-foreground">
          Upload CSV files containing patient vital signs data for processing
        </p>
      </div>

      {/* Live Database Counter - Prominent at top */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Patients in Database</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-9 w-20" />
                ) : (
                  <p className="mt-1 text-4xl font-bold text-primary">{dashboardData?.stats?.totalPatients || 0}</p>
                )}
              </div>
              <div className="rounded-full bg-primary/20 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Updates in real-time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Vital Records</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-9 w-20" />
                ) : (
                  <p className="mt-1 text-4xl font-bold text-foreground">{dashboardData?.stats?.totalVitals || 0}</p>
                )}
              </div>
              <div className="rounded-full bg-muted p-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploads Today</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-9 w-20" />
                ) : (
                  <p className="mt-1 text-4xl font-bold text-foreground">{dashboardData?.stats?.recentUploads || 0}</p>
                )}
              </div>
              <div className="rounded-full bg-muted p-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboardData?.stats?.criticalAlerts && dashboardData.stats.criticalAlerts > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical Alerts</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-9 w-20" />
                ) : (
                  <p className={cn(
                    "mt-1 text-4xl font-bold",
                    dashboardData?.stats?.criticalAlerts && dashboardData.stats.criticalAlerts > 0 
                      ? "text-destructive" 
                      : "text-foreground"
                  )}>
                    {dashboardData?.stats?.criticalAlerts || 0}
                  </p>
                )}
              </div>
              <div className={cn(
                "rounded-full p-3",
                dashboardData?.stats?.criticalAlerts && dashboardData.stats.criticalAlerts > 0 
                  ? "bg-destructive/20" 
                  : "bg-muted"
              )}>
                <AlertTriangle className={cn(
                  "h-6 w-6",
                  dashboardData?.stats?.criticalAlerts && dashboardData.stats.criticalAlerts > 0 
                    ? "text-destructive" 
                    : "text-muted-foreground"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Drag and drop or click to select a CSV file. New records are appended to existing data using PatientID as unique key.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                } ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  {uploading ? (
                    <>
                      <p className="text-lg font-medium text-foreground">Processing...</p>
                      <p className="text-sm text-muted-foreground">
                        Parsing CSV and analyzing vital signs
                      </p>
                    </>
                  ) : isDragActive ? (
                    <p className="text-lg font-medium text-primary">Drop the file here</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-foreground">
                        Drag and drop your CSV file here
                      </p>
                      <p className="text-sm text-muted-foreground">or click to browse files</p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Upsert Logic:</p>
                <p>If a patient_id already exists, their information will be updated. New patient_ids will be added to the database. Vital records are always appended.</p>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Results</CardTitle>
                <CardDescription>Processing status and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {result.success ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg bg-success/10 p-4">
                      <CheckCircle className="h-6 w-6 text-success" />
                      <div>
                        <p className="font-medium text-foreground">Upload Successful</p>
                        <p className="text-sm text-muted-foreground">
                          Batch ID: {result.batchId?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-2xl font-bold text-foreground">{result.totalRows}</p>
                        <p className="text-sm text-muted-foreground">Total Records</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-2xl font-bold text-success">{result.processedCount}</p>
                        <p className="text-sm text-muted-foreground">Processed</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-2xl font-bold text-destructive">{result.failedCount}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-2xl font-bold text-warning-foreground">{result.alertsGenerated}</p>
                        <p className="text-sm text-muted-foreground">Alerts</p>
                      </div>
                    </div>

                    {result.parseErrors && result.parseErrors.length > 0 && (
                      <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                          <p className="font-medium text-warning-foreground">Parse Warnings</p>
                        </div>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {result.parseErrors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {result.parseErrors.length > 5 && (
                            <li>...and {result.parseErrors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4">
                      <XCircle className="h-6 w-6 text-destructive" />
                      <div>
                        <p className="font-medium text-foreground">Upload Failed</p>
                        <p className="text-sm text-destructive">{result.error}</p>
                      </div>
                    </div>

                    {result.details && (
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-foreground mb-2">Details:</p>
                        {Array.isArray(result.details) ? (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {result.details.map((detail, i) => (
                              <li key={i}>{detail}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">{result.details}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Upload history for this session</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !uploadHistory?.batches || uploadHistory.batches.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
                  <div className="text-center">
                    <Database className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No uploads yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {uploadHistory.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <p className="font-medium text-sm text-foreground truncate">
                            {batch.filename}
                          </p>
                        </div>
                        <span className={cn(
                          "shrink-0 rounded px-2 py-0.5 text-xs font-medium border",
                          getStatusColor(batch.status)
                        )}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(batch.uploaded_at)}
                        </span>
                        <span className="font-medium">
                          {batch.processed_count}/{batch.records_count} rows
                        </span>
                      </div>
                      {batch.failed_count > 0 && (
                        <p className="mt-1 text-xs text-destructive">
                          {batch.failed_count} failed
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Accumulation Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Accumulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
                <p>New uploads append to existing data</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
                <p>Duplicate patient_ids update existing records</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-success mt-0.5" />
                <p>Reports analyze entire accumulated dataset</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CSV Format Guide */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>CSV Format Guide</CardTitle>
          <CardDescription>Required and optional columns for vital signs data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-left font-medium text-foreground">Column</th>
                  <th className="py-3 pr-4 text-left font-medium text-foreground">Required</th>
                  <th className="py-3 pr-4 text-left font-medium text-foreground">Description</th>
                  <th className="py-3 text-left font-medium text-foreground">Example</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">patient_id</td>
                  <td className="py-3 pr-4 text-success">Yes (Unique Key)</td>
                  <td className="py-3 pr-4">Unique patient identifier for upsert</td>
                  <td className="py-3 font-mono">PAT001</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">recorded_at</td>
                  <td className="py-3 pr-4 text-success">Yes</td>
                  <td className="py-3 pr-4">Timestamp (ISO 8601 format)</td>
                  <td className="py-3 font-mono">2025-01-30T10:30:00</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">patient_name</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Patient full name</td>
                  <td className="py-3 font-mono">Ramesh Kumar</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">age</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Patient age in years</td>
                  <td className="py-3 font-mono">72</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">heart_rate</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Heart rate in bpm</td>
                  <td className="py-3 font-mono">78</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">systolic_bp</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Systolic blood pressure mmHg</td>
                  <td className="py-3 font-mono">135</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">diastolic_bp</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Diastolic blood pressure mmHg</td>
                  <td className="py-3 font-mono">85</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 font-mono text-foreground">spo2</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Blood oxygen saturation %</td>
                  <td className="py-3 font-mono">97</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-foreground">temperature</td>
                  <td className="py-3 pr-4 text-muted-foreground">No</td>
                  <td className="py-3 pr-4">Body temperature in Celsius</td>
                  <td className="py-3 font-mono">36.8</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
