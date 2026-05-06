import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useObservations,
  useObservationTranslations,
  useObservationAliases,
  useIntents,
  useIntentMappings,
  useIntentTranslations,
} from '@/hooks/useObservations';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const ObservationConsole: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedObs, setSelectedObs] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [intentTester, setIntentTester] = useState('');

  const { data: obs, isLoading } = useObservations(search, page);
  const { data: intents } = useIntents();
  const totalPages = obs ? Math.ceil(obs.count / obs.pageSize) : 0;

  const filteredIntents = intents?.filter((i: any) =>
    !intentTester ||
    i.intent_code?.toLowerCase().includes(intentTester.toLowerCase()) ||
    i.intent_description?.toLowerCase().includes(intentTester.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Observation & Intent Console</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of farmer-observable symptoms, aliases, multilingual coverage, and intent routing.
        </p>
      </div>

      <Tabs defaultValue="observations">
        <TabsList>
          <TabsTrigger value="observations">Observations ({obs?.count ?? 0})</TabsTrigger>
          <TabsTrigger value="intents">Intents ({intents?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="space-y-4">
          <Card>
            <CardContent className="pt-6 flex gap-2">
              <Input
                placeholder="Search code, description, canonical group"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setSearch(searchInput), setPage(0))}
              />
              <Button onClick={() => { setSearch(searchInput); setPage(0); }} variant="outline">
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{obs?.count ?? 0} observations</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">{page + 1} / {Math.max(totalPages, 1)}</span>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Plant Part</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                    )}
                    {!isLoading && obs?.rows.map((o: any) => (
                      <TableRow
                        key={o.observation_code}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedObs(o.observation_code)}
                      >
                        <TableCell className="font-mono text-xs">{o.observation_code}</TableCell>
                        <TableCell className="max-w-md truncate">{o.description || '—'}</TableCell>
                        <TableCell>{o.observation_category || o.symptom_category || '—'}</TableCell>
                        <TableCell>{o.affected_plant_part || '—'}</TableCell>
                        <TableCell>{o.severity_level || '—'}</TableCell>
                        <TableCell>
                          {o.is_active ? <Badge variant="success">active</Badge> : <Badge variant="secondary">inactive</Badge>}
                          {o.is_farmer_observable && <Badge className="ml-1" variant="outline">farmer</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Input
                placeholder="Filter intents…"
                value={intentTester}
                onChange={(e) => setIntentTester(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Quick router test — type a phrase or intent fragment to find matching intents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intent Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Routing Target</TableHead>
                    <TableHead>Biological</TableHead>
                    <TableHead>Clarification</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIntents?.map((i: any) => (
                    <TableRow
                      key={i.intent_code}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedIntent(i.intent_code)}
                    >
                      <TableCell className="font-mono text-xs">{i.intent_code}</TableCell>
                      <TableCell>{i.intent_category || '—'}</TableCell>
                      <TableCell>{i.routing_target || '—'}</TableCell>
                      <TableCell>{i.is_biological ? 'yes' : 'no'}</TableCell>
                      <TableCell>{i.clarification_mode || '—'} ({i.max_clarification_rounds ?? 0})</TableCell>
                      <TableCell>
                        {i.is_active ? <Badge variant="success">active</Badge> : <Badge variant="secondary">inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ObservationDrawer
        observationCode={selectedObs}
        onOpenChange={(o) => !o && setSelectedObs(null)}
      />
      <IntentDrawer
        intentCode={selectedIntent}
        onOpenChange={(o) => !o && setSelectedIntent(null)}
      />
    </div>
  );
};

const ObservationDrawer: React.FC<{ observationCode: string | null; onOpenChange: (o: boolean) => void }> = ({ observationCode, onOpenChange }) => {
  const { data: trans } = useObservationTranslations(observationCode);
  const { data: aliases } = useObservationAliases(observationCode);
  const langs = ['en', 'hi', 'mr'];
  const haveLangs = new Set((trans || []).map((t: any) => t.language_code));
  const missing = langs.filter((l) => !haveLangs.has(l));

  return (
    <Drawer open={!!observationCode} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="font-mono">{observationCode}</DrawerTitle>
          <DrawerDescription>Observation translations and aliases</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="px-6 pb-8 max-h-[80vh] space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Translation Coverage</h3>
            {missing.length > 0
              ? <Badge variant="warning">Missing: {missing.join(', ')}</Badge>
              : <Badge variant="success">Complete</Badge>}
            <div className="space-y-2 mt-3">
              {(trans || []).map((t: any) => (
                <div key={t.id} className="border rounded p-2 text-sm">
                  <Badge variant="outline">{t.language_code}</Badge>
                  <div className="font-medium mt-1">{t.display_text}</div>
                  {t.description_text && <div className="text-muted-foreground text-xs mt-1">{t.description_text}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Aliases ({aliases?.length ?? 0})</h3>
            {aliases && aliases.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aliases.map((a: any) => (
                  <Badge key={a.alias_code} variant="secondary" className="font-mono">{a.alias_code}</Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No aliases recorded.</p>}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

const IntentDrawer: React.FC<{ intentCode: string | null; onOpenChange: (o: boolean) => void }> = ({ intentCode, onOpenChange }) => {
  const { data: trans } = useIntentTranslations(intentCode);
  const { data: mappings } = useIntentMappings(intentCode);

  return (
    <Drawer open={!!intentCode} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="font-mono">{intentCode}</DrawerTitle>
          <DrawerDescription>Intent translations and observation linkage</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="px-6 pb-8 max-h-[80vh]">
          <h3 className="font-semibold mb-2">Translations</h3>
          <div className="space-y-2 mb-4">
            {(trans || []).map((t: any) => (
              <div key={t.id} className="border rounded p-2 text-sm">
                <Badge variant="outline">{t.language_code}</Badge>
                <div className="font-medium mt-1">{t.display_text}</div>
                {t.question_text && <div className="text-muted-foreground text-xs mt-1">Q: {t.question_text}</div>}
              </div>
            ))}
            {(!trans || trans.length === 0) && <p className="text-sm text-muted-foreground">No translations.</p>}
          </div>

          <h3 className="font-semibold mb-2">Linked Observations ({mappings?.length ?? 0})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Observation</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>DAS</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(mappings || []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.observation_code}</TableCell>
                  <TableCell>{m.crop_code || '—'}</TableCell>
                  <TableCell>{m.growth_stage || '—'}</TableCell>
                  <TableCell>{m.das_min ?? '—'}–{m.das_max ?? '—'}</TableCell>
                  <TableCell>{m.confidence_rank ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default ObservationConsole;
