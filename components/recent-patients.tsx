"use client";

import { User } from "lucide-react";
import type { Patient } from "@/lib/types";

interface RecentPatientsProps {
  patients: Patient[];
}

export function RecentPatients({ patients }: RecentPatientsProps) {
  if (!patients || patients.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No patients registered yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {patients.slice(0, 6).map((patient) => (
        <div
          key={patient.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{patient.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{patient.age} years</span>
              {patient.gender && (
                <>
                  <span className="text-border">|</span>
                  <span>{patient.gender}</span>
                </>
              )}
              {patient.village && (
                <>
                  <span className="text-border">|</span>
                  <span className="truncate">{patient.village}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">{patient.patient_id}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
