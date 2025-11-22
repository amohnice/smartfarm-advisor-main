'use client';

import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPdf } from './ReportPdf';
import { Loader2, Download } from 'lucide-react';

// Define proper types for the analysis data
interface AnalysisData {
  disease: string;
  confidence: number;
  severity: string;
  treatment: {
    immediate: string[];
    preventive: string[];
    organic?: string[];
  };
  estimatedLoss?: string;
  localizedText?: string;
}

interface ReportGeneratorProps {
  reportData: {
    analysis: AnalysisData;
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
    language?: string;
  };
  onSave?: () => Promise<void> | void;
}

const ReportGenerator = ({ reportData, onSave }: ReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = async () => {
    try {
      setIsGenerating(true);
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error('Error in onSave handler:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PDFDownloadLink
      document={
        <ReportPdf 
          analysis={reportData.analysis}
          location={reportData.location}
          notes={reportData.notes}
          language={reportData.language}
        />
      }
      fileName={`smartfarm-report-${new Date().toISOString().split('T')[0]}.pdf`}
      className="w-full"
    >
      {({ loading, error }) => {
        if (error) {
          console.error('Error generating PDF:', error);
          return (
            <div className="text-red-600 p-2 text-sm">
              Error generating PDF. Please try again.
            </div>
          );
        }

        const isDisabled = loading || isGenerating;
        
        return (
          <button
            onClick={handleSave}
            disabled={isDisabled}
            className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold transition-colors
              ${isDisabled 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {loading || isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {loading ? 'Generating PDF...' : 'Saving...'}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download PDF Report
              </>
            )}
          </button>
        );
      }}
    </PDFDownloadLink>
  );
};

export { ReportGenerator };
export default ReportGenerator;
