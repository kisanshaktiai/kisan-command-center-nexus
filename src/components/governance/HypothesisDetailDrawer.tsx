import React from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHypothesisDetail, useHypothesisVersions } from '@/hooks/useHypotheses';
import { format } from 'date-fns';

interface Props {
  hypothesisId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function HypothesisDetailDrawer({ hypothesisId, open, onOpenChange }: Props) {
  const { data: h } = useHypothesisDetail(hypothesisId);
  // hypothesis_versions.hypothesis_id is uuid; hypothesis_master.hypothesis_id is text — versions may be empty until backfill
  const { data: versions } = useHypothesisVersions(null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base">{h?.hypothesis_id || '...'}</span>
            {h?.is_active ? <Badge variant="success">active</Badge> : <Badge variant="secondary">inactive</Badge>}
            {h?.hypothesis_type && <Badge variant="outline">{h.hypothesis_type}</Badge>}
          </DrawerTitle>
          <DrawerDescription>{h?.cause_name_en}</DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="px-6 pb-8 max-h-[80vh]">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="i18n">Translations</TabsTrigger>
              <TabsTrigger value="versions">Versions ({versions?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <Field label="Crop Group" value={h?.crop_group} />
                <Field label="Canonical Group" value={h?.canonical_group} />
                <Field label="Severity Model" value={h?.severity_model} />
                <Field label="Version" value={h?.version} />
                <Field label="Engine min" value={h?.engine_min_version} />
                <Field label="Updated" value={h?.updated_at && format(new Date(h.updated_at), 'PP p')} />
              </div>
              {h?.biological_basis && (
                <Card className="mt-3"><CardContent className="pt-4 text-sm">{h.biological_basis}</CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="i18n">
              <div className="space-y-2 text-sm">
                <Field label="EN" value={h?.cause_name_en} />
                <Field label="HI" value={h?.cause_name_hi} />
                <Field label="MR" value={h?.cause_name_mr} />
                {(!h?.cause_name_hi || !h?.cause_name_mr) && (
                  <Badge variant="warning">Translation gap</Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="versions">
              <div className="text-sm text-muted-foreground py-8 text-center">
                Version snapshots will appear here after the next change. Triggers are armed.
              </div>
            </TabsContent>

            <TabsContent value="json">
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[60vh]">
                {JSON.stringify(h ?? {}, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="border rounded p-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium break-words">{value ?? '—'}</div>
  </div>
);
