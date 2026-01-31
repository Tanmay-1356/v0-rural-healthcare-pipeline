"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, MapPin, Phone, Calendar, Activity, Brain, FileText, ClipboardList } from "lucide-react";
import { VitalsChart } from "@/components/vitals-chart";
import { RecentAlerts } from "@/components/recent-alerts";
import { AIInsightsPanel } from "@/components/ai-insights-panel";
import { ClinicalIntelligenceReport } from "@/components/clinical-intelligence-report";
import type { Patient, Vital, HealthAlert, Report } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export function PatientDetail({ patientId, onBack }: PatientDetailProps) {
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showClinicalReport, setShowClinicalReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/patients/${patientId}`,
    fetcher
  );

  const handleGenerateReport = async (reportType: "daily" | "weekly" | "monthly") => {
    setGeneratingReport(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, reportType }),
      });
      
      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">Failed to load patient details.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-10 w-40" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const patient = data?.patient as Patient;
  const vitals = data?.vitals as Vital[];
  const alerts = data?.alerts as HealthAlert[];
  const reports = data?.reports as Report[];

  return (
    <div className="p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Patients
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patient Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-8 w-8" />
              </div>
              <div>
                <CardTitle>{patient.name}</CardTitle>
                <CardDescription>{patient.patient_id}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium text-foreground">{patient.age} years</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium text-foreground">{patient.gender || "—"}</p>
              </div>
            </div>

            {(patient.village || patient.district) && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium text-foreground">
                    {[patient.village, patient.district].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {patient.contact_number && (
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium text-foreground">{patient.contact_number}</p>
                </div>
              </div>
            )}

            {patient.emergency_contact && (
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium text-foreground">{patient.emergency_contact}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="font-medium text-foreground">
                  {new Date(patient.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {patient.medical_history && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground">Medical History</p>
                <p className="mt-1 text-sm text-muted-foreground">{patient.medical_history}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Button
                className="w-full"
                onClick={() => setShowClinicalReport(true)}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Clinical Intelligence Report
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => setShowAIInsights(true)}
              >
                <Brain className="mr-2 h-4 w-4" />
                Quick AI Insights
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateReport("daily")}
                  disabled={generatingReport}
                >
                  Daily
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateReport("weekly")}
                  disabled={generatingReport}
                >
                  Weekly
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateReport("monthly")}
                  disabled={generatingReport}
                >
                  Monthly
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">Generate Report</p>
            </div>
          </CardContent>
        </Card>

        {/* Vitals and Alerts */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vitals Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Vital Signs History</CardTitle>
                  <CardDescription>{vitals.length} readings recorded</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vitals.length > 0 ? (
                <VitalsChart data={vitals} />
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">No vital signs recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Health Alerts</CardTitle>
              <CardDescription>Recent alerts for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentAlerts alerts={alerts.map(a => ({ ...a, patients: { name: patient.name, patient_id: patient.patient_id } }))} />
            </CardContent>
          </Card>

          {/* Reports */}
          {reports && reports.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Clinical Reports</CardTitle>
                    <CardDescription>Generated reports for this patient</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.slice(0, 5).map((report) => (
                    <div
                      key={report.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{report.title}</p>
                          <p className="text-sm text-muted-foreground">{report.summary}</p>
                        </div>
                        <span className={`rounded px-2 py-1 text-xs font-medium ${
                          report.risk_level === "critical" ? "bg-destructive/10 text-destructive" :
                          report.risk_level === "high" ? "bg-destructive/10 text-destructive" :
                          report.risk_level === "moderate" ? "bg-warning/10 text-warning-foreground" :
                          "bg-success/10 text-success"
                        }`}>
                          {report.risk_level}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Generated: {new Date(report.generated_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Insights Modal */}
      {showAIInsights && (
        <AIInsightsPanel
          patientId={patientId}
          patientName={patient.name}
          onClose={() => setShowAIInsights(false)}
        />
      )}

      {/* Clinical Intelligence Report Modal */}
      {showClinicalReport && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <ClinicalIntelligenceReport
            patientId={patientId}
            patientName={patient.name}
            onBack={() => setShowClinicalReport(false)}
          />
        </div>
      )}
    </div>
  );
}
