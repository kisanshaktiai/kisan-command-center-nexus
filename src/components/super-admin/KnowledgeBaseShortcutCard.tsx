import React from 'react';
import { Link } from 'react-router-dom';
import { Library, UploadCloud, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRagSources } from '@/hooks/useRagAdmin';

/**
 * Overview entry point into the RAG knowledge base.
 * Read-only: reuses the existing sources query (documents totals come with it).
 */
export const KnowledgeBaseShortcutCard: React.FC = () => {
  const { data, isLoading } = useRagSources();
  const sources = data?.sources ?? [];

  const totals = sources.reduce(
    (a, s) => ({
      docs: a.docs + s.documents.total,
      completed: a.completed + s.documents.completed,
    }),
    { docs: 0, completed: 0 }
  );

  return (
    <Card className="border-border/60">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Knowledge Base</p>
              <p className="text-xs text-muted-foreground">
                Corpus behind the farmer AI advisor
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? '—' : sources.length}
            </p>
            <p className="text-xs text-muted-foreground">Sources</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? '—' : totals.docs}
            </p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? '—' : totals.completed}
            </p>
            <p className="text-xs text-muted-foreground">Ingested</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link to="/super-admin/governance/knowledge?tab=upload">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload document
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Open knowledge base">
            <Link to="/super-admin/governance/knowledge?tab=sources">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
