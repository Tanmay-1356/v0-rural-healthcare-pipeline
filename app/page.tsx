"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { DashboardView } from "@/components/dashboard-view";
import { UploadView } from "@/components/upload-view";
import { PatientsView } from "@/components/patients-view";
import { AlertsView } from "@/components/alerts-view";
import { ReportsView } from "@/components/reports-view";

export type ViewType = "dashboard" | "upload" | "patients" | "alerts" | "reports";

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView />;
      case "upload":
        return <UploadView />;
      case "patients":
        return <PatientsView />;
      case "alerts":
        return <AlertsView />;
      case "reports":
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}>
        {renderView()}
      </main>
    </div>
  );
}
