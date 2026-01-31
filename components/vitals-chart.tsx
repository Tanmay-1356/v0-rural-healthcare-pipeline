"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { Vital } from "@/lib/types";

interface VitalsChartProps {
  data: Vital[];
}

type VitalType = "heart_rate" | "blood_pressure" | "spo2" | "temperature";

export function VitalsChart({ data }: VitalsChartProps) {
  const [selectedVital, setSelectedVital] = useState<VitalType>("heart_rate");

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort by recorded_at ascending
    const sorted = [...data].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    return sorted.slice(-30).map((vital) => ({
      time: new Date(vital.recorded_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      heart_rate: vital.heart_rate,
      systolic_bp: vital.systolic_bp,
      diastolic_bp: vital.diastolic_bp,
      spo2: vital.spo2,
      temperature: vital.temperature,
    }));
  }, [data]);

  const vitalConfig: Record<VitalType, { label: string; unit: string; color: string; lines: { key: string; color: string }[] }> = {
    heart_rate: {
      label: "Heart Rate",
      unit: "bpm",
      color: "hsl(var(--chart-2))",
      lines: [{ key: "heart_rate", color: "hsl(var(--chart-2))" }],
    },
    blood_pressure: {
      label: "Blood Pressure",
      unit: "mmHg",
      color: "hsl(var(--chart-1))",
      lines: [
        { key: "systolic_bp", color: "hsl(var(--chart-1))" },
        { key: "diastolic_bp", color: "hsl(var(--chart-3))" },
      ],
    },
    spo2: {
      label: "SpO2",
      unit: "%",
      color: "hsl(var(--chart-4))",
      lines: [{ key: "spo2", color: "hsl(var(--chart-4))" }],
    },
    temperature: {
      label: "Temperature",
      unit: "°C",
      color: "hsl(var(--chart-5))",
      lines: [{ key: "temperature", color: "hsl(var(--chart-5))" }],
    },
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No vital signs data available. Upload CSV data to see trends.</p>
      </div>
    );
  }

  const config = vitalConfig[selectedVital];

  return (
    <div>
      {/* Vital Type Selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(vitalConfig) as VitalType[]).map((type) => (
          <Button
            key={type}
            variant={selectedVital === type ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedVital(type)}
            className="text-xs"
          >
            {vitalConfig[type].label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              unit={` ${config.unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            {config.lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={2}
                dot={{ fill: line.color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name={line.key === "systolic_bp" ? "Systolic" : line.key === "diastolic_bp" ? "Diastolic" : config.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
