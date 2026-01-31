"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, MapPin, Phone, ChevronRight } from "lucide-react";
import type { Patient } from "@/lib/types";
import { PatientDetail } from "@/components/patient-detail";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PatientsView() {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR(
    `/api/patients?search=${encodeURIComponent(search)}&limit=50`,
    fetcher,
    { keepPreviousData: true }
  );

  if (selectedPatient) {
    return (
      <PatientDetail 
        patientId={selectedPatient} 
        onBack={() => setSelectedPatient(null)} 
      />
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Patients</h1>
        <p className="mt-1 text-muted-foreground">
          View and manage registered patients
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, patient ID, or village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            {data?.total !== undefined ? `${data.total} patients found` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-destructive">Failed to load patients. Please try again.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !data?.patients || data.patients.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
              <div className="text-center">
                <User className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {search ? "No patients found matching your search" : "No patients registered yet"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.patients.map((patient: Patient) => (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient.id)}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{patient.name}</p>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {patient.patient_id}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{patient.age} years</span>
                      {patient.gender && <span>{patient.gender}</span>}
                      {patient.village && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {patient.village}
                          {patient.district && `, ${patient.district}`}
                        </span>
                      )}
                      {patient.contact_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.contact_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
