import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Loader2 } from 'lucide-react';
import {
  useValidateNarration,
  useHallucinationLogs,
  useUpdateHallucinationVerdict,
  type NarrationVerdict,
} from '@/hooks/useGovernanceAI';

const verdictColor = (v: string) => {
  switch (v) {
    case 'clean': return 'bg-green-500/15 text-green-700 dark:text-green-400';
    case 'suspect': return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400';
    case 'hallucinated': return 'bg-red-500/15 text-red-700 dark:text-red-400';
    case 'dismissed': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function NarrationValidation() {
  const [tab, setTab] = useState('validate');
  const [content, setContent] = useState('');
  const [rulesJson, setRulesJson] = useState('[]');
  const [persist, setPersist] = useState(true);
  const [verdict, setVerdict] = useState<NarrationVerdict | null>(null);

  const [filter, setFilter] = useState('all');
  const validate = useValidateNarration();
  const logs = useHallucinationLogs(filter);
  const updateVerdict = useUpdateHallucinationVerdict();

  const handleValidate = async () => {
    let rules: any[] = [];
    try { rules = JSON.parse(rulesJson || '[]'); } catch { rules = []; }
    const r = await validate.mutateAsync({
      ai_content: content,
      rules_applied: rules,
      source_type: 'manual_validation',
      persist,
    });
    setVerdict(r.judge);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Narration Validation</h1>
        <p className="text-muted-foreground">Judge AI farmer-facing narration against the rules that fired. Flag hallucinated chemical names, dosages, and ungrounded claims.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="queue">Flagged Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Inputs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AI narration</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Paste the AI-generated farmer message here…" />
              </div>
              <div>
                <Label>Rules applied (JSON array)</Label>
                <Textarea value={rulesJson} onChange={(e) => setRulesJson(e.target.value)} rows={6} className="font-mono text-xs" placeholder='[{"rule_id":"...","action_type":"..."}]' />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="persist" checked={persist} onCheckedChange={(v) => setPersist(!!v)} />
                <Label htmlFor="persist" className="cursor-pointer">Persist verdict to hallucination log</Label>
              </div>
              <Button onClick={handleValidate} disabled={!content || validate.isPending}>
                {validate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Run validation
              </Button>
            </CardContent>
          </Card>

          {verdict && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Verdict</span>
                  <Badge className={verdictColor(verdict.verdict)}>{verdict.verdict.toUpperCase()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">Hallucination score: <span className="font-mono">{verdict.hallucination_score.toFixed(2)}</span></div>
                {verdict.flagged_terms?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {verdict.flagged_terms.map((t, i) => <Badge key={i} variant="destructive">{t}</Badge>)}
                  </div>
                )}
                <div>
                  <Label>Reasoning</Label>
                  <p className="text-sm italic mt-1">{verdict.reasoning}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Filter:</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspect">Suspect</SelectItem>
                <SelectItem value="hallucinated">Hallucinated</SelectItem>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{logs.data?.length ?? 0} entries</span>
          </div>

          {logs.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          <div className="space-y-3">
            {logs.data?.map((row: any) => (
              <Card key={row.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={verdictColor(row.verdict)}>{row.verdict}</Badge>
                      <span className="text-xs text-muted-foreground">score {Number(row.hallucination_score).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {['clean', 'hallucinated', 'dismissed'].map((v) => (
                        <Button key={v} size="sm" variant="outline"
                          disabled={updateVerdict.isPending || row.verdict === v}
                          onClick={() => updateVerdict.mutate({ id: row.id, verdict: v })}>
                          Mark {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{row.ai_content}</div>
                  {row.flagged_terms?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {row.flagged_terms.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                  {row.judge_reasoning && <p className="text-xs italic text-muted-foreground">{row.judge_reasoning}</p>}
                </CardContent>
              </Card>
            ))}
            {logs.data?.length === 0 && <div className="text-sm text-muted-foreground">No entries.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
