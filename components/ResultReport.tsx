
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react';
import { AnalysisReport } from '@/types/Report';
import { cn } from '@/lib/utils';

interface ResultReportProps {
  report: AnalysisReport;
  onNewAnalysis: () => void;
}

export const ResultReport = ({ report, onNewAnalysis }: ResultReportProps) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-risk-high';
      case 'medium': return 'text-risk-medium';
      case 'low': return 'text-risk-low';
      default: return 'text-risk-neutral';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-risk-high" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-risk-medium" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-risk-low" />;
      default: return <CheckCircle className="w-4 h-4 text-risk-neutral" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analysis Report</h1>
          <p className="text-muted-foreground">
            {report.fileName ? `File: ${report.fileName}` : 'Text Analysis'} • {' '}
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={onNewAnalysis} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Overall Assessment */}
      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={cn("text-3xl font-bold mb-2", getRiskColor(report.overallRisk || 'neutral'))}>
              {(report.overallRisk || 'UNKNOWN').toUpperCase()}
            </div>
            <Badge variant={getRiskBadgeVariant(report.overallRisk || 'neutral')} className="mb-2">
              Overall Risk Level
            </Badge>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">
              {(report.confidenceScore || 0).toFixed(0)}%
            </div>
            <p className="text-sm text-muted-foreground mb-2">Confidence Score</p>
            <Progress value={report.confidenceScore || 0} className="w-full" />
          </div>

          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {((report.metadata?.processingTime || 0) / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {(report.fileType || 'UNKNOWN').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-primary" />
          Analysis Summary
        </h3>
        <p className="text-foreground leading-relaxed">{report.summary || 'No summary available'}</p>
      </Card>

      {/* Deception Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-primary" />
          Deception Indicators ({report.indicators?.length || 0})
        </h3>
        
        <div className="space-y-4">
          {report.indicators?.map((indicator, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getSeverityIcon(indicator.severity || 'neutral')}
                  <div>
                    <h4 className="font-medium text-foreground">{indicator.description || 'Unknown indicator'}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {indicator.type || 'unknown'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(indicator.confidence || 0)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={getRiskBadgeVariant(indicator.severity || 'neutral')}>
                  {indicator.severity || 'unknown'}
                </Badge>
              </div>
              
              <Separator />
              
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Evidence:</h5>
                <ul className="space-y-1">
                  {(indicator.evidence || []).map((evidence, evidenceIndex) => (
                    <li key={evidenceIndex} className="text-sm text-muted-foreground flex items-start space-x-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
          {(!report.indicators || report.indicators.length === 0) && (
            <div className="text-center py-4 text-muted-foreground">
              No deception indicators found
            </div>
          )}
        </div>
      </Card>

      {/* Metadata */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Details</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Time:</span>
              <span className="text-foreground">{((report.metadata?.processingTime || 0) / 1000).toFixed(2)}s</span>
            </div>
            {report.metadata?.fileSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Size:</span>
                <span className="text-foreground">
                  {((report.metadata.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Analysis ID:</span>
              <span className="text-foreground font-mono text-xs">{report.id || 'Unknown'}</span>
            </div>
            {report.metadata?.framesAnalyzed !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frames Analyzed:</span>
                <span className="text-foreground">{report.metadata.framesAnalyzed}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
