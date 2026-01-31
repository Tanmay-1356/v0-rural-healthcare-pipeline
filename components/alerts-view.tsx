"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, AlertCircle, CheckCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVitalName } from "@/lib/vital-analyzer";
import type { HealthAlert, Patient } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AlertWithPatient extends HealthAlert {
  patients?: Pick<Patient, "id" | "name" | "patient_id" | "age" | "village">;
}

export function AlertsView() {
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/alerts?acknowledged=false${filter !== "all" ? `&severity=${filter}` : ""}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action: "acknowledge" }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    } finally {
      setAcknowledging(null);
    }
  };

  const alerts = (data?.alerts || []) as AlertWithPatient[];
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Health Alerts</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor and acknowledge health alerts for elderly patients
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-destructive/20 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-warning/20 p-3">
              <AlertCircle className="h-6 w-6 text-warning-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Warning Alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-muted p-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
              <p className="text-sm text-muted-foreground">Total Unacknowledged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "critical" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("critical")}
          className={filter === "critical" ? "" : "text-destructive border-destructive/50 hover:bg-destructive/10"}
        >
          Critical Only
        </Button>
        <Button
          variant={filter === "warning" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("warning")}
        >
          Warnings Only
        </Button>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Alerts requiring attention from healthcare workers</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-destructive">Failed to load alerts. Please try again.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-success" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No active alerts. All patients are within normal vital ranges.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4",
                    alert.severity === "critical"
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-warning/50 bg-warning/5"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-2",
                      alert.severity === "critical"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-warning/20 text-warning-foreground"
                    )}
                  >
                    {alert.severity === "critical" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold uppercase",
                          alert.severity === "critical"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-warning/20 text-warning-foreground"
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatVitalName(alert.alert_type)}
                      </span>
                    </div>

                    <p className="mt-2 font-medium text-foreground">
                      {alert.patients?.name || "Unknown Patient"}
                      {alert.patients?.patient_id && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({alert.patients.patient_id})
                        </span>
                      )}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">Actual:</strong> {alert.actual_value}
                      </span>
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">Normal:</strong> {alert.threshold_value}
                      </span>
                      {alert.patients?.village && (
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Location:</strong> {alert.patients.village}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledging === alert.id}
                  >
                    {acknowledging === alert.id ? "..." : "Acknowledge"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
