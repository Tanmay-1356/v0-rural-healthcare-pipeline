"use client";

import React from "react"

import { cn } from "@/lib/utils";
import type { ViewType } from "@/app/page";
import {
  LayoutDashboard,
  Upload,
  Users,
  AlertTriangle,
  FileText,
  Menu,
  Heart,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "upload", label: "Upload Data", icon: Upload },
  { id: "patients", label: "Patients", icon: Users },
  { id: "alerts", label: "Health Alerts", icon: AlertTriangle },
  { id: "reports", label: "Reports", icon: FileText },
];

export function Sidebar({ currentView, onViewChange, isOpen, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Swasthya Setu</span>
              <span className="text-xs text-sidebar-foreground/70">Rural Healthcare</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-xs text-sidebar-foreground/70">
              Healthcare Data Pipeline for Rural Elderly Care
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
