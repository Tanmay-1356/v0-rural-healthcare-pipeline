"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Users,
  Activity,
  BarChart3,
  PieChart,
  Heart,
  Thermometer,
  Droplets,
  Wind
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Report, Patient, ReportInsights } from "@/lib/types";
import { formatVitalName, getVitalUnit } from "@/lib/vital-analyzer";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReportWithPatient extends Report {
  patients?: Pick<Patient, "id" | "name" | "patient_id">;
}

interface PopulationTrend {
  average: number;
  min: number;
  max: number;
  trend: "increasing" | "decreasing" | "stable";
  count: number;
}

interface ImpactReport {
  summary: {
    totalPatients: number;
    totalVitals: number;
    activeAlerts: number;
    completedUploads: number;
    totalRecordsProcessed: number;
    overallRisk: string;
    dataRange: {
      from: string;
      to: string;
    };
  };
  populationTrends: {
    heart_rate?: PopulationTrend;
    systolic_bp?: PopulationTrend;
    diastolic_bp?: PopulationTrend;
    spo2?: PopulationTrend;
    temperature?: PopulationTrend;
  };
  ageDistribution: {
    under60: number;
    sixtyTo70: number;
    seventyTo80: number;
    over80: number;
  };
  alertBreakdown: {
    heart_rate: number;
    blood_pressure: number;
    spo2: number;
    temperature: number;
  };
  anomalies: {
    critical: number;
    warning: number;
  };
  insights: Array<{
    type: "critical" | "warning" | "info";
    message: string;
  }>;
  recommendations: string[];
}

export function ReportsView() {
  const [filter, setFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [selectedReport, setSelectedReport] = useState<ReportWithPatient | null>(null);
  const [activeTab, setActiveTab] = useState<"individual" | "impact">("impact");

  const { data, error, isLoading } = useSWR(
    `/api/reports${filter !== "all" ? `?type=${filter}` : ""}`,
    fetcher
  );

  const { data: impactData, isLoading: impactLoading } = useSWR<ImpactReport>(
    "/api/reports/impact",
    fetcher,
    { refreshInterval: 30000 }
  );

  const reports = (data?.reports || []) as ReportWithPatient[];

  const getRiskLevelColor = (level: string | null) => {
    switch (level) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/50";
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/50";
      case "moderate":
        return "bg-warning/10 text-warning-foreground border-warning/50";
      default:
        return "bg-success/10 text-success border-success/50";
    }
  };

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-primary" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning-foreground" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-destructive/10 border-destructive/30";
      case "warning":
        return "bg-warning/10 border-warning/30";
      default:
        return "bg-primary/10 border-primary/30";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Clinical Reports</h1>
        <p className="mt-1 text-muted-foreground">
          View impact analysis across all uploads and individual patient reports
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b border-border pb-4">
        <Button
          variant={activeTab === "impact" ? "default" : "outline"}
          onClick={() => setActiveTab("impact")}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Impact Analysis
        </Button>
        <Button
          variant={activeTab === "individual" ? "default" : "outline"}
          onClick={() => setActiveTab("individual")}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Individual Reports
        </Button>
      </div>

      {activeTab === "impact" ? (
        // Impact Analysis View - Accumulated Dataset Analysis
        <div className="space-y-6">
          {impactLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : impactData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Total Patients</p>
                        <p className="mt-1 text-3xl font-bold text-primary">{impactData.summary.totalPatients}</p>
                      </div>
                      <Users className="h-8 w-8 text-primary/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Vital Records</p>
                        <p className="mt-1 text-3xl font-bold text-foreground">{impactData.summary.totalVitals}</p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={impactData.summary.activeAlerts > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Active Alerts</p>
                        <p className={cn(
                          "mt-1 text-3xl font-bold",
                          impactData.summary.activeAlerts > 0 ? "text-destructive" : "text-foreground"
                        )}>
                          {impactData.summary.activeAlerts}
                        </p>
                      </div>
                      <AlertTriangle className={cn(
                        "h-8 w-8",
                        impactData.summary.activeAlerts > 0 ? "text-destructive/50" : "text-muted-foreground/50"
                      )} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Overall Risk</p>
                        <p className={cn(
                          "mt-1 text-2xl font-bold capitalize",
                          impactData.summary.overallRisk === "critical" ? "text-destructive" :
                          impactData.summary.overallRisk === "high" ? "text-destructive" :
                          impactData.summary.overallRisk === "moderate" ? "text-warning-foreground" :
                          "text-success"
                        )}>
                          {impactData.summary.overallRisk}
                        </p>
                      </div>
                      <PieChart className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Population Vital Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle>Population Vital Trends</CardTitle>
                    <CardDescription>
                      Aggregated trends across all {impactData.summary.totalPatients} patients (last 30 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {impactData.populationTrends.heart_rate && (
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Heart className="h-5 w-5 text-destructive" />
                          <div>
                            <p className="font-medium text-foreground">Heart Rate</p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.heart_rate.count} readings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getTrendIcon(impactData.populationTrends.heart_rate.trend)}
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {impactData.populationTrends.heart_rate.average.toFixed(0)} bpm
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.heart_rate.min} - {impactData.populationTrends.heart_rate.max}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {impactData.populationTrends.systolic_bp && (
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Blood Pressure (Systolic)</p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.systolic_bp.count} readings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getTrendIcon(impactData.populationTrends.systolic_bp.trend)}
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {impactData.populationTrends.systolic_bp.average.toFixed(0)} mmHg
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.systolic_bp.min} - {impactData.populationTrends.systolic_bp.max}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {impactData.populationTrends.spo2 && (
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Wind className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-foreground">SpO2</p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.spo2.count} readings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getTrendIcon(impactData.populationTrends.spo2.trend)}
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {impactData.populationTrends.spo2.average.toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.spo2.min.toFixed(1)} - {impactData.populationTrends.spo2.max.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {impactData.populationTrends.temperature && (
                      <div className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <Thermometer className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="font-medium text-foreground">Temperature</p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.temperature.count} readings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getTrendIcon(impactData.populationTrends.temperature.trend)}
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {impactData.populationTrends.temperature.average.toFixed(1)}°C
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {impactData.populationTrends.temperature.min.toFixed(1)} - {impactData.populationTrends.temperature.max.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Age Distribution & Alert Breakdown */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Patient Age Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Under 60</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ 
                                  width: `${impactData.summary.totalPatients > 0 
                                    ? (impactData.ageDistribution.under60 / impactData.summary.totalPatients) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{impactData.ageDistribution.under60}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">60-70 years</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ 
                                  width: `${impactData.summary.totalPatients > 0 
                                    ? (impactData.ageDistribution.sixtyTo70 / impactData.summary.totalPatients) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{impactData.ageDistribution.sixtyTo70}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">70-80 years</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full bg-warning rounded-full" 
                                style={{ 
                                  width: `${impactData.summary.totalPatients > 0 
                                    ? (impactData.ageDistribution.seventyTo80 / impactData.summary.totalPatients) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{impactData.ageDistribution.seventyTo80}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Over 80</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full bg-destructive rounded-full" 
                                style={{ 
                                  width: `${impactData.summary.totalPatients > 0 
                                    ? (impactData.ageDistribution.over80 / impactData.summary.totalPatients) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{impactData.ageDistribution.over80}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Active Alerts by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border p-3 text-center">
                          <Heart className="mx-auto h-5 w-5 text-destructive" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{impactData.alertBreakdown.heart_rate}</p>
                          <p className="text-xs text-muted-foreground">Heart Rate</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                          <Activity className="mx-auto h-5 w-5 text-primary" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{impactData.alertBreakdown.blood_pressure}</p>
                          <p className="text-xs text-muted-foreground">Blood Pressure</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                          <Wind className="mx-auto h-5 w-5 text-blue-500" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{impactData.alertBreakdown.spo2}</p>
                          <p className="text-xs text-muted-foreground">SpO2</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                          <Thermometer className="mx-auto h-5 w-5 text-orange-500" />
                          <p className="mt-1 text-2xl font-bold text-foreground">{impactData.alertBreakdown.temperature}</p>
                          <p className="text-xs text-muted-foreground">Temperature</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Insights & Recommendations */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                    <CardDescription>Analysis across all uploaded data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {impactData.insights.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No significant insights to report. All metrics appear normal.</p>
                    ) : (
                      <div className="space-y-3">
                        {impactData.insights.map((insight, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-start gap-3 rounded-lg border p-3",
                              getInsightBg(insight.type)
                            )}
                          >
                            {getInsightIcon(insight.type)}
                            <p className="text-sm text-foreground">{insight.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>Suggested actions based on analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {impactData.recommendations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No specific recommendations at this time.</p>
                    ) : (
                      <ul className="space-y-3">
                        {impactData.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Anomaly Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Summary</CardTitle>
                  <CardDescription>
                    Detected anomalies across {impactData.summary.totalVitals} vital records
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-destructive/20 p-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{impactData.anomalies.critical}</p>
                        <p className="text-sm text-muted-foreground">Critical</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-warning/20 p-2">
                        <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning-foreground">{impactData.anomalies.warning}</p>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No data available for impact analysis. Upload patient data to see insights.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Individual Reports View
        <div>
          {/* Filter */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All Reports
            </Button>
            <Button
              variant={filter === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("daily")}
            >
              Daily
            </Button>
            <Button
              variant={filter === "weekly" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("weekly")}
            >
              Weekly
            </Button>
            <Button
              variant={filter === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("monthly")}
            >
              Monthly
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reports List */}
            <Card className={selectedReport ? "" : "lg:col-span-2"}>
              <CardHeader>
                <CardTitle>Generated Reports</CardTitle>
                <CardDescription>
                  {reports.length} reports found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-destructive">Failed to load reports. Please try again.</p>
                  </div>
                ) : isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
                    <div className="text-center">
                      <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No reports generated yet. Generate reports from patient profiles.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={cn(
                          "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                          selectedReport?.id === report.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="rounded-full bg-primary/10 p-2">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{report.title}</p>
                            <span
                              className={cn(
                                "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                                getRiskLevelColor(report.risk_level)
                              )}
                            >
                              {report.risk_level || "low"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground truncate">
                            {report.patients?.name || "Unknown Patient"}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(report.generated_at).toLocaleDateString()}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.5 font-medium">
                              {report.report_type}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Detail */}
            {selectedReport && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedReport.title}</CardTitle>
                      <CardDescription>
                        {selectedReport.patients?.name} ({selectedReport.patients?.patient_id})
                      </CardDescription>
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-semibold uppercase",
                        getRiskLevelColor(selectedReport.risk_level)
                      )}
                    >
                      {selectedReport.risk_level || "low"} risk
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{selectedReport.summary}</p>
                  </div>

                  {/* Period */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {selectedReport.period_start && new Date(selectedReport.period_start).toLocaleDateString()} -{" "}
                      {selectedReport.period_end && new Date(selectedReport.period_end).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Vital Trends */}
                  {selectedReport.insights?.vital_trends && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Vital Sign Trends</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedReport.insights.vital_trends).map(([key, trend]) => {
                          if (!trend) return null;
                          return (
                            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                              <div className="flex items-center gap-2">
                                {getTrendIcon(trend.trend)}
                                <span className="text-sm font-medium text-foreground">
                                  {formatVitalName(key)}
                                </span>
                              </div>
                              <div className="text-right text-sm">
                                <p className="font-medium text-foreground">
                                  Avg: {trend.average.toFixed(1)} {getVitalUnit(key)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Range: {trend.min.toFixed(1)} - {trend.max.toFixed(1)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {selectedReport.recommendations && selectedReport.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {selectedReport.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
