"use client";

import React, { useState } from "react"

import useSWR, { mutate } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Activity, AlertTriangle, FileText, Upload, Trash2 } from "lucide-react";
import { VitalsChart } from "@/components/vitals-chart";
import { RecentAlerts } from "@/components/recent-alerts";
import { RecentPatients } from "@/components/recent-patients";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "warning" | "success";
}

function StatCard({ title, value, description, icon: Icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card",
    warning: "bg-destructive/10 border-destructive/20",
    success: "bg-success/10 border-success/20",
  };

  const iconStyles = {
    default: "bg-primary/10 text-primary",
    warning: "bg-destructive/20 text-destructive",
    success: "bg-success/20 text-success",
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`rounded-full p-3 ${iconStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const [clearing, setClearing] = useState(false);
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to delete ALL patient data? This action cannot be undone.')) {
      return;
    }

    if (!window.confirm('This will permanently delete all patients, vitals, alerts, reports, and upload history. Continue?')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh dashboard data
        mutate('/api/dashboard');
        alert('All data cleared successfully');
      } else {
        alert('Error: ' + (result.details || result.error));
      }
    } catch (err) {
      console.error('[v0] Clear data error:', err);
      alert('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">Failed to load dashboard data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor health vitals and alerts for elderly patients in rural areas
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearData}
          disabled={clearing}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {clearing ? 'Clearing...' : 'Clear All Data'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Patients"
              value={data?.stats?.totalPatients || 0}
              description="Registered patients"
              icon={Users}
            />
            <StatCard
              title="Vital Records"
              value={data?.stats?.totalVitals || 0}
              description="Total readings"
              icon={Activity}
            />
            <StatCard
              title="Critical Alerts"
              value={data?.stats?.criticalAlerts || 0}
              description="Unacknowledged"
              icon={AlertTriangle}
              variant={data?.stats?.criticalAlerts > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Reports"
              value={data?.stats?.pendingReports || 0}
              description="Generated this week"
              icon={FileText}
            />
            <StatCard
              title="Recent Uploads"
              value={data?.stats?.recentUploads || 0}
              description="Last 24 hours"
              icon={Upload}
              variant={data?.stats?.recentUploads > 0 ? "success" : "default"}
            />
          </>
        )}
      </div>

      {/* Charts and Data */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vitals Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vital Signs Trends</CardTitle>
            <CardDescription>Recent telemetry data from all patients</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <VitalsChart data={data?.recentVitals || []} />
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Unacknowledged health alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <RecentAlerts alerts={data?.alerts || []} />
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
            <CardDescription>Recently added or updated</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <RecentPatients patients={data?.patients || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
