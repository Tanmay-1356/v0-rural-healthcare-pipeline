"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthAlert, Patient } from "@/lib/types";
import { formatVitalName } from "@/lib/vital-analyzer";

interface AlertWithPatient extends HealthAlert {
  patients?: Pick<Patient, "name" | "patient_id">;
}

interface RecentAlertsProps {
  alerts: AlertWithPatient[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-3",
            alert.severity === "critical"
              ? "border-destructive/50 bg-destructive/5"
              : "border-warning/50 bg-warning/5"
          )}
        >
          <div
            className={cn(
              "mt-0.5 rounded-full p-1.5",
              alert.severity === "critical"
                ? "bg-destructive/20 text-destructive"
                : "bg-warning/20 text-warning-foreground"
            )}
          >
            {alert.severity === "critical" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium uppercase",
                  alert.severity === "critical" ? "text-destructive" : "text-warning-foreground"
                )}
              >
                {alert.severity}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatVitalName(alert.alert_type)}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground truncate">
              {alert.patients?.name || "Unknown Patient"}
            </p>
            <p className="text-xs text-muted-foreground">
              Value: {alert.actual_value} (Normal: {alert.threshold_value})
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
