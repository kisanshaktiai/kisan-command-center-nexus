import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIInsightResult {
  summary?: string;
  trend?: string;
  stress_signals?: string[];
  advisory?: string[];
  risk_zones?: string[];
  crop_performance?: string[];
  farmer_segments?: string[];
  data_window?: string;
  notes?: string;
  [k: string]: any;
}

export const AIInsightCard: React.FC<{ result: AIInsightResult | null; loading: boolean }> = ({ result, loading }) => {
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 py-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        Click "Generate insight" to produce an AI-powered NDVI report grounded only in your live data.
      </div>
    );
  }

  const toMarkdown = () => {
    const parts: string[] = [];
    if (result.summary) parts.push(`## Summary\n${result.summary}`);
    if (result.trend) parts.push(`## Trend\n${result.trend}`);
    section('Stress signals', result.stress_signals);
    section('Advisory', result.advisory);
    section('Risk zones', result.risk_zones);
    section('Crop performance', result.crop_performance);
    section('Farmer segments', result.farmer_segments);
    if (result.notes) parts.push(`\n_${result.notes}_`);
    function section(title: string, list?: string[]) {
      if (list?.length) parts.push(`## ${title}\n${list.map((s) => `- ${s}`).join('\n')}`);
    }
    return parts.join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toMarkdown());
    toast({ title: 'Copied report to clipboard' });
  };

  const Section: React.FC<{ title: string; items?: string[] }> = ({ title, items }) =>
    items?.length ? (
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {result.data_window && <Badge variant="outline">Window: {result.data_window}</Badge>}
        <Button variant="ghost" size="sm" onClick={handleCopy}><Copy className="h-3 w-3 mr-1" />Copy</Button>
      </div>
      {result.summary && <p className="text-sm leading-relaxed">{result.summary}</p>}
      {result.trend && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Trend</div>
          <p className="text-sm">{result.trend}</p>
        </div>
      )}
      <Section title="Stress signals" items={result.stress_signals} />
      <Section title="Advisory" items={result.advisory} />
      <Section title="Risk zones" items={result.risk_zones} />
      <Section title="Crop performance" items={result.crop_performance} />
      <Section title="Farmer segments" items={result.farmer_segments} />
      {result.notes && <p className="text-xs text-muted-foreground italic">{result.notes}</p>}
    </div>
  );
};
