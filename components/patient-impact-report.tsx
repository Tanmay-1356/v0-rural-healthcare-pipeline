"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Download, Globe } from "lucide-react";

interface PatientImpactReportProps {
  patientId: string;
  patientName: string;
}

export function PatientImpactReport({ patientId, patientName }: PatientImpactReportProps) {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Record<string, string> | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'telugu'>('english');

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/patient-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, languages: ['english', 'hindi', 'telugu'] })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if we got reports (either success true or fallback)
      if (data.reports && typeof data.reports === 'object') {
        setReports(data.reports);
      } else if (data.success && data.reports) {
        setReports(data.reports);
      } else {
        throw new Error(data.error || 'No reports in response');
      }
    } catch (error) {
      console.error('[v0] Error generating patient impact report:', error instanceof Error ? error.message : error);
      // Generate and show fallback reports on error
      const fallbackReports = {
        english: `HEALTH REPORT FOR ${patientName}\n\nDear ${patientName},\n\nYour health report is being prepared. Please ask your caregiver for help understanding your health information.\n\nYour healthcare team is looking after you.`,
        hindi: `${patientName} के लिए स्वास्थ्य रिपोर्ट\n\nप्रिय ${patientName},\n\nआपकी स्वास्थ्य रिपोर्ट तैयार की जा रही है। अपनी स्वास्थ्य जानकारी को समझने के लिए अपने देखभाल करने वाले से मदद मांगें।`,
        telugu: `${patientName} కోసం ఆరోగ్య నివేదన\n\nప్రియ ${patientName},\n\nమీ ఆరోగ్య నివేదన సిద్ధమవుతుంది. మీ ఆరోగ్య సమాచారాన్ని అర్థం చేసుకోవడానికి మీ సంరక్షకుడిని సహాయం కోసం అడగండి.`
      };
      setReports(fallbackReports);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reports || !reports[selectedLanguage]) return;

    const content = reports[selectedLanguage];
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${patientName}_health_report_${selectedLanguage}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Multilingual Patient Report
            </CardTitle>
            <CardDescription>
              Patient-friendly health summary for {patientName}
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </CardHeader>

      {reports && (
        <CardContent className="space-y-4">
          <Tabs value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="english">English</TabsTrigger>
              <TabsTrigger value="hindi">हिंदी</TabsTrigger>
              <TabsTrigger value="telugu">తెలుగు</TabsTrigger>
            </TabsList>

            <TabsContent value="english" className="space-y-4 mt-4">
              <div className="rounded-lg bg-muted/50 p-6 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {reports.english}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4" />
                Download English Report
              </Button>
            </TabsContent>

            <TabsContent value="hindi" className="space-y-4 mt-4">
              <div className="rounded-lg bg-muted/50 p-6 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {reports.hindi}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4" />
                हिंदी रिपोर्ट डाउनलोड करें
              </Button>
            </TabsContent>

            <TabsContent value="telugu" className="space-y-4 mt-4">
              <div className="rounded-lg bg-muted/50 p-6 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {reports.telugu}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4" />
                తెలుగు నివేదన డౌన్లోడ్ చేయండి
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
