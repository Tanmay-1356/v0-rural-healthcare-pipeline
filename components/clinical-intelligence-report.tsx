"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  RefreshCw,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from "recharts";

const fetcher = (url: string, options?: RequestInit) =>
  fetch(url, options).then((res) => res.json());

interface ClinicalReportProps {
  patientId: string;
  patientName: string;
  onBack: () => void;
}

export function ClinicalIntelligenceReport({ patientId, patientName, onBack }: ClinicalReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/reports/clinical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }
      
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate report on mount
  useEffect(() => {
    generateReport();
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to generate report</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button onClick={generateReport} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isGenerating || !reportData) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Generating Clinical Intelligence Report</p>
              <p className="text-sm text-muted-foreground">Analyzing vitals and generating AI insights for {patientName}...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const { patient, analysis, vitals, hourlyRisk, correlationData, riskLevel, thresholds } = reportData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinical Intelligence Report</h1>
            <p className="text-muted-foreground">{patient.name} ({patient.patient_id}) - Age {patient.age}</p>
          </div>
        </div>
        <Button onClick={generateReport} variant="outline" disabled={isGenerating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {/* Dual-Pane Tabs */}
      <Tabs defaultValue="patient" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="patient" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient View
          </TabsTrigger>
          <TabsTrigger value="doctor" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Doctor View
          </TabsTrigger>
        </TabsList>

        {/* Patient View - Simple */}
        <TabsContent value="patient" className="space-y-6 mt-6">
          {/* Traffic Light Health Score */}
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${
                  analysis.patientView.healthScore === "green" 
                    ? "bg-success/20" 
                    : analysis.patientView.healthScore === "yellow" 
                    ? "bg-warning/20" 
                    : "bg-destructive/20"
                }`}>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    analysis.patientView.healthScore === "green" 
                      ? "bg-success" 
                      : analysis.patientView.healthScore === "yellow" 
                      ? "bg-warning" 
                      : "bg-destructive"
                  }`}>
                    {analysis.patientView.healthScore === "green" ? (
                      <CheckCircle className="h-12 w-12 text-success-foreground" />
                    ) : analysis.patientView.healthScore === "yellow" ? (
                      <AlertTriangle className="h-12 w-12 text-warning-foreground" />
                    ) : (
                      <XCircle className="h-12 w-12 text-destructive-foreground" />
                    )}
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground">{analysis.patientView.healthScoreLabel}</h2>
                <p className="text-lg text-muted-foreground mt-2 max-w-xl">
                  {analysis.patientView.plainEnglishSummary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Speedometer Gauges */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SpeedometerGauge
              label="Heart Rate"
              value={vitals.latest?.heart_rate || 0}
              unit="bpm"
              min={40}
              max={140}
              normalMin={thresholds.heart_rate.normal.min}
              normalMax={thresholds.heart_rate.normal.max}
              icon={<Heart className="h-5 w-5" />}
            />
            <SpeedometerGauge
              label="Blood Pressure"
              value={vitals.latest?.systolic_bp || 0}
              unit="mmHg"
              min={80}
              max={200}
              normalMin={thresholds.systolic_bp.normal.min}
              normalMax={thresholds.systolic_bp.normal.max}
              icon={<Activity className="h-5 w-5" />}
            />
            <SpeedometerGauge
              label="Oxygen Level"
              value={vitals.latest?.spo2 || 0}
              unit="%"
              min={85}
              max={100}
              normalMin={thresholds.spo2.normal.min}
              normalMax={thresholds.spo2.normal.max}
              icon={<Wind className="h-5 w-5" />}
            />
            <SpeedometerGauge
              label="Temperature"
              value={vitals.latest?.temperature || 0}
              unit="°C"
              min={35}
              max={40}
              normalMin={thresholds.temperature.normal.min}
              normalMax={thresholds.temperature.normal.max}
              icon={<Thermometer className="h-5 w-5" />}
            />
          </div>

          {/* Actionable Advice */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">What You Can Do</CardTitle>
              <CardDescription>Simple steps to improve your health</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.patientView.actionableAdvice.map((advice: string, index: number) => (
                  <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="text-foreground">{advice}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-success font-medium">{analysis.patientView.encouragement}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor View - Technical */}
        <TabsContent value="doctor" className="space-y-6 mt-6">
          {/* Clinical Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Clinical Observations
              </CardTitle>
              <CardDescription>AI-generated clinical assessment using medical terminology</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {analysis.doctorView.clinicalObservations}
              </p>
              
              {analysis.doctorView.medicationConsiderations && (
                <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="font-medium text-warning-foreground mb-1">Medication Considerations</p>
                  <p className="text-sm text-muted-foreground">{analysis.doctorView.medicationConsiderations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Diagnoses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Potential Diagnoses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.doctorView.diagnoses.map((diagnosis: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {diagnosis}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.doctorView.riskFactors.map((risk: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommended Tests & Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.doctorView.recommendedTests.map((test: string, index: number) => (
                  <span key={index} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {test}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vitals Trend Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vital Signs Trend Analysis</CardTitle>
              <CardDescription>Detailed numerical analysis over recording period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Vital Sign</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Average</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Min</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Max</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Trend</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Normal Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TrendRow 
                      label="Heart Rate" 
                      unit="bpm" 
                      trend={vitals.trends.heartRate} 
                      normalRange={`${thresholds.heart_rate.normal.min}-${thresholds.heart_rate.normal.max}`}
                    />
                    <TrendRow 
                      label="Systolic BP" 
                      unit="mmHg" 
                      trend={vitals.trends.systolicBP} 
                      normalRange={`${thresholds.systolic_bp.normal.min}-${thresholds.systolic_bp.normal.max}`}
                    />
                    <TrendRow 
                      label="Diastolic BP" 
                      unit="mmHg" 
                      trend={vitals.trends.diastolicBP} 
                      normalRange={`${thresholds.diastolic_bp.normal.min}-${thresholds.diastolic_bp.normal.max}`}
                    />
                    <TrendRow 
                      label="SpO2" 
                      unit="%" 
                      trend={vitals.trends.spo2} 
                      normalRange={`${thresholds.spo2.normal.min}-${thresholds.spo2.normal.max}`}
                    />
                    <TrendRow 
                      label="Temperature" 
                      unit="°C" 
                      trend={vitals.trends.temperature} 
                      normalRange={`${thresholds.temperature.normal.min}-${thresholds.temperature.normal.max}`}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap - Hourly Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Time-of-Day Risk Heatmap
              </CardTitle>
              <CardDescription>Shows which hours of the day have the most abnormal readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {hourlyRisk.slice(0, 24).map((hour: any) => (
                  <div
                    key={hour.hour}
                    className="aspect-square rounded flex flex-col items-center justify-center text-xs"
                    style={{
                      backgroundColor: hour.total === 0 
                        ? "var(--muted)" 
                        : hour.riskLevel > 50 
                        ? `rgba(239, 68, 68, ${0.3 + (hour.riskLevel / 100) * 0.7})` 
                        : hour.riskLevel > 20 
                        ? `rgba(245, 158, 11, ${0.3 + (hour.riskLevel / 100) * 0.7})`
                        : `rgba(34, 197, 94, ${0.3 + (1 - hour.riskLevel / 100) * 0.4})`,
                    }}
                    title={`${hour.label}: ${hour.total} readings, ${hour.abnormal} abnormal (${hour.riskLevel.toFixed(0)}% risk)`}
                  >
                    <span className="font-medium text-foreground">{hour.hour}</span>
                    {hour.total > 0 && (
                      <span className="text-[10px] text-muted-foreground">{hour.riskLevel.toFixed(0)}%</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/50" />
                  Low Risk
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-warning/50" />
                  Moderate
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/50" />
                  High Risk
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Correlation Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Correlational Analysis</CardTitle>
              <CardDescription>Relationships between vital signs that may indicate underlying conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {correlationData.map((corr: any, index: number) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{corr.vital1} vs {corr.vital2}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      corr.correlation === "positive" 
                        ? "bg-primary/10 text-primary" 
                        : corr.correlation === "negative"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {corr.correlation === "positive" ? "Positive" : corr.correlation === "negative" ? "Negative" : "No"} Correlation (r={corr.coefficient.toFixed(2)})
                    </span>
                  </div>
                  
                  {corr.data.length > 0 && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="x" 
                            type="number" 
                            name={corr.vital1}
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            dataKey="y" 
                            type="number" 
                            name={corr.vital2}
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border border-border bg-background p-2 shadow-md">
                                    <p className="text-xs text-muted-foreground">
                                      {corr.vital1}: {payload[0].payload.x}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {corr.vital2}: {payload[0].payload.y}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter data={corr.data} fill="var(--primary)">
                            {corr.data.map((entry: any, i: number) => (
                              <Cell key={`cell-${i}`} fill="var(--primary)" />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  {/* AI interpretation of correlation */}
                  {analysis.correlations?.find((c: any) => c.vital1 === corr.vital1 && c.vital2 === corr.vital2) && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <strong>Clinical Significance:</strong>{" "}
                      {analysis.correlations.find((c: any) => c.vital1 === corr.vital1 && c.vital2 === corr.vital2)?.significance}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Anomaly Highlighting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anomaly Detection</CardTitle>
              <CardDescription>{vitals.anomalies.length} anomalies detected in {vitals.count} readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vitals.anomalies.slice(0, 20).map((anomaly: any, index: number) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      anomaly.severity === "critical" 
                        ? "bg-destructive/10 border border-destructive/20" 
                        : "bg-warning/10 border border-warning/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        anomaly.severity === "critical" ? "bg-destructive" : "bg-warning"
                      }`} />
                      <div>
                        <p className="font-medium text-foreground">
                          {anomaly.vital_type.replace("_", " ").toUpperCase()}: {anomaly.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expected: {anomaly.expected_range.min}-{anomaly.expected_range.max}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Speedometer Gauge Component
function SpeedometerGauge({ 
  label, 
  value, 
  unit, 
  min, 
  max, 
  normalMin, 
  normalMax,
  icon 
}: { 
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  icon: React.ReactNode;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const normalMinPercent = ((normalMin - min) / (max - min)) * 100;
  const normalMaxPercent = ((normalMax - min) / (max - min)) * 100;
  
  const isNormal = value >= normalMin && value <= normalMax;
  const isLow = value < normalMin;
  const isHigh = value > normalMax;
  
  const rotation = -90 + (percentage * 1.8); // 180 degree arc
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-primary">{icon}</div>
          <span className="font-medium text-foreground">{label}</span>
        </div>
        
        {/* Gauge visualization */}
        <div className="relative h-24 mb-2">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Normal range arc */}
            <path
              d={`M ${10 + normalMinPercent * 0.8} ${50 - Math.sin(Math.acos((normalMinPercent * 0.8 - 40) / 40)) * 40} A 40 40 0 0 1 ${10 + normalMaxPercent * 0.8} ${50 - Math.sin(Math.acos((normalMaxPercent * 0.8 - 40) / 40)) * 40}`}
              fill="none"
              stroke="var(--success)"
              strokeWidth="8"
              strokeLinecap="round"
              opacity={0.5}
            />
            {/* Needle */}
            <line
              x1="50"
              y1="50"
              x2={50 + 30 * Math.cos((rotation - 90) * Math.PI / 180)}
              y2={50 + 30 * Math.sin((rotation - 90) * Math.PI / 180)}
              stroke={isNormal ? "var(--success)" : isLow ? "var(--warning)" : "var(--destructive)"}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle cx="50" cy="50" r="4" fill="var(--foreground)" />
          </svg>
        </div>
        
        {/* Value display */}
        <div className="text-center">
          <span className={`text-2xl font-bold ${
            isNormal ? "text-success" : isLow ? "text-warning" : "text-destructive"
          }`}>
            {value.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Normal: {normalMin}-{normalMax} {unit}
        </p>
      </CardContent>
    </Card>
  );
}

// Trend Row Component
function TrendRow({ 
  label, 
  unit, 
  trend, 
  normalRange 
}: { 
  label: string;
  unit: string;
  trend: any;
  normalRange: string;
}) {
  if (!trend || trend.average === 0) {
    return (
      <tr className="border-b border-border">
        <td className="py-3 px-2 font-medium text-foreground">{label}</td>
        <td colSpan={5} className="text-center text-muted-foreground">No data</td>
      </tr>
    );
  }
  
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-2 font-medium text-foreground">{label}</td>
      <td className="text-center py-3 px-2 text-foreground">{trend.average.toFixed(1)} {unit}</td>
      <td className="text-center py-3 px-2 text-foreground">{trend.min} {unit}</td>
      <td className="text-center py-3 px-2 text-foreground">{trend.max} {unit}</td>
      <td className="text-center py-3 px-2">
        <div className="flex items-center justify-center gap-1">
          {trend.trend === "increasing" ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : trend.trend === "decreasing" ? (
            <TrendingDown className="h-4 w-4 text-primary" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={`text-sm ${
            trend.trend === "increasing" ? "text-destructive" : 
            trend.trend === "decreasing" ? "text-primary" : 
            "text-muted-foreground"
          }`}>
            {trend.trend}
            {trend.change_percent !== undefined && ` (${trend.change_percent > 0 ? "+" : ""}${trend.change_percent.toFixed(1)}%)`}
          </span>
        </div>
      </td>
      <td className="text-center py-3 px-2 text-muted-foreground">{normalRange} {unit}</td>
    </tr>
  );
}
