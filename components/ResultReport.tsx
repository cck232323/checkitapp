
import { useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AnalysisReport } from '@/types/Report';
import { cn } from '@/lib/utils';

interface ResultReportProps {
  report: AnalysisReport;
  onNewAnalysis: () => void;
}

interface SummaryNode {
  id: string;
  level: number;
  title: string;
  body: string[];
  bullets: string[];
  children: SummaryNode[];
}

const UNSUPPORTED_COLOR_REGEX = /(oklab|oklch|color-mix)/i;
const COLOR_PROPS = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'fill',
  'stroke',
] as const;

const camelToKebab = (prop: string) => prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const convertModernColor = (doc: Document, value: string) => {
  if (!value || value === 'none') return value;
  const temp = doc.createElement('span');
  temp.style.color = value;
  doc.body.appendChild(temp);
  const resolved = doc.defaultView?.getComputedStyle(temp).color || value;
  temp.remove();
  return resolved;
};

const sanitizeCloneColors = (doc: Document) => {
  const root = doc.querySelector<HTMLElement>('[data-report-export-root="true"]');
  const view = doc.defaultView;
  if (!root || !view) return;

  const process = (el: HTMLElement) => {
    const computed = view.getComputedStyle(el);
    COLOR_PROPS.forEach((prop) => {
      const value = computed[prop as keyof CSSStyleDeclaration] as string;
      if (value && UNSUPPORTED_COLOR_REGEX.test(value)) {
        const resolved = convertModernColor(doc, value);
        el.style.setProperty(camelToKebab(prop), resolved);
      }
    });

    const backgroundImage = computed.backgroundImage;
    if (backgroundImage && UNSUPPORTED_COLOR_REGEX.test(backgroundImage)) {
      el.style.backgroundImage = 'none';
      const bgColor = computed.backgroundColor;
      if (bgColor) {
        el.style.backgroundColor = UNSUPPORTED_COLOR_REGEX.test(bgColor)
          ? convertModernColor(doc, bgColor)
          : bgColor;
      }
    }

    const boxShadow = computed.boxShadow;
    if (boxShadow && UNSUPPORTED_COLOR_REGEX.test(boxShadow)) {
      el.style.boxShadow = 'none';
    }

    el.style.setProperty('color', '#050505', 'important');
    el.style.setProperty('border-color', '#050505', 'important');
    el.style.setProperty('outline-color', '#050505', 'important');
    const bgColor = computed.backgroundColor;
    const sanitizedBackground =
      bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent'
        ? '#ffffff'
        : 'transparent';
    el.style.setProperty('background-color', sanitizedBackground, 'important');
    el.style.setProperty('fill', '#050505', 'important');
    el.style.setProperty('stroke', '#050505', 'important');
  };

  process(root);
  root.querySelectorAll<HTMLElement>('*').forEach(process);
};

export const ResultReport = ({ report, onNewAnalysis }: ResultReportProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (typeof window === 'undefined' || !reportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: window.devicePixelRatio || 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          sanitizeCloneColors(clonedDoc);
        },
        windowWidth: reportRef.current.scrollWidth,
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 0;

      pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`analysis-report-${report.id || 'export'}.pdf`);
    } catch (error) {
      console.error('Failed to export analysis report:', error);
    } finally {
      setIsExporting(false);
    }
  };

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

  const renderRichText = (text: string) => {
    if (!text) return null;
    const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return segments.map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return (
          <span key={`bold-${index}`} className="font-semibold text-foreground">
            {segment.slice(2, -2)}
          </span>
        );
      }
      return <span key={`text-${index}`}>{segment}</span>;
    });
  };

  const createSummaryStructure = (summary?: string): SummaryNode[] => {
    if (!summary) return [];

    let counter = 0;
    const normalized = summary
      .replace(/(#{1,6}\s+)/g, '\n$1')
      .replace(/(\s+)(\d+\.\s+)/g, '\n$2')
      .replace(/(\s+)([-*]\s+)/g, '\n$2')
      .replace(/\n{2,}/g, '\n')
      .trim();

    const lines = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const root: SummaryNode = {
      id: 'summary-root',
      level: 0,
      title: 'root',
      body: [],
      bullets: [],
      children: [],
    };

    const stack: SummaryNode[] = [root];

    const addContentLine = (node: SummaryNode, content: string) => {
      if (!content) return;
      const bulletMatch = content.match(/^(\d+\.|[-*])\s+(.*)$/);
      if (bulletMatch) {
        node.bullets.push(bulletMatch[2].trim());
      } else {
        node.body.push(content);
      }
    };

    lines.forEach((line) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        let title = headingMatch[2].trim();
        let trailing = '';

        const hyphenIndex = title.indexOf(' - ');
        if (hyphenIndex !== -1) {
          trailing = title.slice(hyphenIndex + 3).trim();
          title = title.slice(0, hyphenIndex).trim();
        }

        while (stack.length && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        if (stack.length === 0) {
          stack.push(root);
        }

        const node: SummaryNode = {
          id: `summary-node-${counter++}`,
          level,
          title: title || `Section ${counter}`,
          body: [],
          bullets: [],
          children: [],
        };

        stack[stack.length - 1].children.push(node);
        stack.push(node);

        if (trailing) {
          addContentLine(node, trailing.startsWith('-') ? trailing : `- ${trailing}`);
        }
        return;
      }

      const current = stack[stack.length - 1] || root;
      addContentLine(current, line);
    });

    const structuredSections = [...root.children];

    if (root.body.length || root.bullets.length) {
      structuredSections.unshift({
        id: `summary-node-${counter++}`,
        level: 1,
        title: 'Overall Summary',
        body: root.body,
        bullets: root.bullets,
        children: [],
      });
    }

    return structuredSections;
  };

  const summarySections = useMemo(
    () => createSummaryStructure(report.summary),
    [report.summary]
  );

  const getSectionLabel = (level: number) => {
    switch (level) {
      case 1: return 'Primary insight';
      case 2: return 'Key dimension';
      case 3: return 'Detail';
      default: return 'Supporting detail';
    }
  };

  const SummarySection = ({ node, depth = 1 }: { node: SummaryNode; depth?: number }) => (
    <div
      className={cn(
        'rounded-2xl border border-border/60 p-4 space-y-3',
        depth === 1 ? 'bg-muted/40 shadow-sm' : 'bg-background/60'
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-base font-semibold text-foreground">{node.title}</h4>
        </div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {getSectionLabel(node.level)}
        </p>
      </div>

      {node.body.length > 0 && (
        <div className="space-y-2">
          {node.body.map((paragraph, index) => (
            <p key={`body-${node.id}-${index}`} className="text-sm text-foreground leading-relaxed">
              {renderRichText(paragraph)}
            </p>
          ))}
        </div>
      )}

      {node.bullets.length > 0 && (
        <ul className="space-y-1.5 text-sm text-foreground">
          {node.bullets.map((item, index) => (
            <li key={`bullet-${node.id}-${index}`} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">{renderRichText(item)}</span>
            </li>
          ))}
        </ul>
      )}

      {node.children.length > 0 && (
        <div className="space-y-3 border-l border-border/40 pl-4">
          {node.children.map((child) => (
            <SummarySection key={child.id} node={child} depth={(depth || 1) + 1} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={reportRef}
      data-report-export-root="true"
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-foreground">Analysis Report</h1>
          <p className="text-muted-foreground">
            {report.fileName ? `File: ${report.fileName}` : 'Text Analysis'} • {' '}
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button onClick={onNewAnalysis} size="sm" className="w-full sm:w-auto">
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
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Analysis Summary
          </h3>
          <p className="text-sm text-muted-foreground">
            Verbally structured snapshot of cross-modal insights, aligned with the analyzer template.
          </p>
        </div>
        {summarySections.length > 0 ? (
          <div className="space-y-4">
            {summarySections.map((section) => (
              <SummarySection key={section.id} node={section} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 py-6 text-center text-sm text-muted-foreground">
            {report.summary || 'No summary available'}
          </div>
        )}
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
