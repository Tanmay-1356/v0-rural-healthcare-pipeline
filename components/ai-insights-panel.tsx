"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Brain, Loader2, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsightsPanelProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

interface AIInsight {
  summary: string;
  key_concerns: string[];
  recommendations: string[];
  risk_assessment: "low" | "moderate" | "high" | "critical";
  follow_up_actions: string[];
}

export function AIInsightsPanel({ patientId, patientName, onClose }: AIInsightsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [streamingText, setStreamingText] = useState<string>("");

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate insights");
        }

        const data = await response.json();
        
        if (data.success && data.insights) {
          setInsights(data.insights);
        } else {
          throw new Error(data.error || "Failed to parse insights");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [patientId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Health Insights</h2>
              <p className="text-sm text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && !insights ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Analyzing patient data with AI...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <p className="mt-4 text-sm text-destructive">{error}</p>
              <Button variant="outline" className="mt-4 bg-transparent" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Risk Assessment */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Risk Assessment</span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-semibold uppercase",
                    getRiskColor(insights.risk_assessment)
                  )}
                >
                  {insights.risk_assessment}
                </span>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted/50 p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p>
              </div>

              {/* Key Concerns */}
              {insights.key_concerns.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                    Key Concerns
                  </h3>
                  <ul className="space-y-2">
                    {insights.key_concerns.map((concern, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-warning-foreground" />
                        <span className="text-sm text-foreground">{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3"
                      >
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
                        <span className="text-sm text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Actions */}
              {insights.follow_up_actions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    Follow-up Actions
                  </h3>
                  <ul className="space-y-2">
                    {insights.follow_up_actions.map((action, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Disclaimer:</strong> These AI-generated insights are meant to assist healthcare
                  workers and should not replace professional medical judgment. Always consult with
                  qualified medical professionals for clinical decisions.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
