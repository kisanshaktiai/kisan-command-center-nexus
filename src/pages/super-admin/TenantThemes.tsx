import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Star, Lock, GripVertical, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { subscriptionPlanOptions } from '@/types/tenant/enums';
import type { PresetTheme } from '@/lib/whitelabel-types/themeMapping';

/**
 * Tenant Themes — the SaaS admin decides WHICH master themes each tenant
 * may pick, by dragging themes from the catalogue into the tenant's bucket.
 *
 * - The tenant's subscription plan sets only HOW MANY themes the bucket may
 *   hold (public.plan_theme_quota; NULL = unlimited). The database enforces
 *   this with a trigger, so the UI check here is only for a friendly message.
 * - The house default theme (master_themes.is_default) is always in every
 *   bucket, is pinned first, cannot be removed, and never counts.
 * - Removing a theme from a bucket is a soft remove: the link row in
 *   public.tenant_theme_assignments gets removed_at set (history kept);
 *   putting it back clears removed_at. The theme itself is never touched.
 *
 * The tenant sees exactly this bucket in its own portal (White Label >
 * Mobile) through get_tenant_master_themes(tenant_id). Drag-and-drop
 * follows the same @hello-pangea/dnd pattern as DraggableLeadKanban.
 */

interface Tenant {
  id: string;
  name: string;
  subscription_plan: string | null;
}

interface CatalogueTheme {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  theme: PresetTheme;
  is_default: boolean;
  sort_order: number;
}

interface Assignment {
  theme_id: string;
  sort_order: number;
}

interface QuotaRow {
  plan: string;
  max_themes: number | null;
}

const CATALOGUE = 'catalogue';
const BUCKET = 'bucket';

const planLabel = (value: string | null | undefined) =>
  subscriptionPlanOptions.find(o => o.value === value)?.label ?? value ?? 'No plan set';

const Swatches = ({ theme }: { theme: PresetTheme }) => (
  <div className="flex gap-1 flex-shrink-0">
    {[theme.core.primary, theme.core.secondary, theme.core.accent].map((token, i) => (
      <div
        key={i}
        className="w-4 h-4 rounded-full border border-border"
        style={{ backgroundColor: `hsl(${token})` }}
      />
    ))}
  </div>
);

const ThemeCard = ({
  theme,
  pinned = false,
  dragging = false,
}: {
  theme: CatalogueTheme;
  pinned?: boolean;
  dragging?: boolean;
}) => (
  <div
    className={`flex items-center gap-3 rounded-md border bg-card p-3 ${
      dragging ? 'shadow-lg' : ''
    } ${pinned ? 'border-primary/40 bg-primary/5' : ''}`}
  >
    {pinned ? (
      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    ) : (
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    )}
    <Swatches theme={theme.theme} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate">{theme.name}</span>
        {theme.is_default && (
          <Badge variant="default" className="gap-1 flex-shrink-0">
            <Star className="h-3 w-3" />
            Default
          </Badge>
        )}
      </div>
      {theme.description && (
        <div className="text-xs text-muted-foreground truncate">{theme.description}</div>
      )}
    </div>
  </div>
);

export default function TenantThemes() {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants-for-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, subscription_plan')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return (data || []) as Tenant[];
    },
  });

  // master_themes / plan_theme_quota / tenant_theme_assignments are not in
  // the generated Supabase types yet.
  const { data: catalogue = [], isLoading: catalogueLoading } = useQuery({
    queryKey: ['master-themes-catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_themes' as any)
        .select('id, slug, name, description, theme, is_default, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CatalogueTheme[];
    },
  });

  const { data: quotas = [] } = useQuery({
    queryKey: ['plan-theme-quota'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_theme_quota' as any)
        .select('plan, max_themes');
      if (error) throw error;
      return (data || []) as unknown as QuotaRow[];
    },
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['tenant-theme-assignments', selectedTenant],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_theme_assignments' as any)
        .select('theme_id, sort_order')
        .eq('tenant_id', selectedTenant)
        .is('removed_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Assignment[];
    },
    enabled: !!selectedTenant,
  });

  const tenant = tenants.find(t => t.id === selectedTenant);
  const quota = quotas.find(q => q.plan === tenant?.subscription_plan)?.max_themes ?? null;

  const defaultTheme = catalogue.find(t => t.is_default) ?? null;
  const byId = useMemo(() => new Map(catalogue.map(t => [t.id, t])), [catalogue]);

  const bucketThemes = useMemo(
    () => assignments
      .map(a => byId.get(a.theme_id))
      .filter((t): t is CatalogueTheme => !!t && !t.is_default),
    [assignments, byId]
  );
  const bucketIds = useMemo(() => new Set(bucketThemes.map(t => t.id)), [bucketThemes]);
  const catalogueThemes = useMemo(
    () => catalogue.filter(t => !t.is_default && !bucketIds.has(t.id)),
    [catalogue, bucketIds]
  );

  const used = bucketThemes.length;
  const isFull = quota !== null && used >= quota;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-theme-assignments', selectedTenant] });
    // The tenant-facing list (White Label Config > Mobile, and the tenant portal) reads the bucket.
    queryClient.invalidateQueries({ queryKey: ['master-themes'] });
  };

  // Persist the bucket order as 1..n so the tenant portal lists it the same way.
  const renumber = async (ordered: CatalogueTheme[]) => {
    for (let i = 0; i < ordered.length; i++) {
      const { error } = await supabase
        .from('tenant_theme_assignments' as any)
        .update({ sort_order: i + 1 } as any)
        .eq('tenant_id', selectedTenant)
        .eq('theme_id', ordered[i].id);
      if (error) throw error;
    }
  };

  const assignMutation = useMutation({
    mutationFn: async ({ theme, index }: { theme: CatalogueTheme; index: number }) => {
      // Upsert: a theme removed earlier comes back by clearing removed_at.
      const { error } = await supabase
        .from('tenant_theme_assignments' as any)
        .upsert(
          { tenant_id: selectedTenant, theme_id: theme.id, sort_order: index + 1, removed_at: null } as any,
          { onConflict: 'tenant_id,theme_id' }
        );
      if (error) throw error;
      const next = [...bucketThemes];
      next.splice(index, 0, theme);
      await renumber(next);
    },
    onSuccess: () => { invalidate(); toast.success('Theme added to tenant'); },
    onError: (error: any) => toast.error(error.message || 'Failed to add theme'),
  });

  const unassignMutation = useMutation({
    mutationFn: async (theme: CatalogueTheme) => {
      const { error } = await supabase
        .from('tenant_theme_assignments' as any)
        .update({ removed_at: new Date().toISOString() } as any)
        .eq('tenant_id', selectedTenant)
        .eq('theme_id', theme.id);
      if (error) throw error;
      await renumber(bucketThemes.filter(t => t.id !== theme.id));
    },
    onSuccess: () => { invalidate(); toast.success('Theme removed from tenant'); },
    onError: (error: any) => toast.error(error.message || 'Failed to remove theme'),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const next = [...bucketThemes];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      await renumber(next);
    },
    onSuccess: () => invalidate(),
    onError: (error: any) => toast.error(error.message || 'Failed to reorder'),
  });

  const busy = assignMutation.isPending || unassignMutation.isPending || reorderMutation.isPending;

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || busy) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (source.droppableId === CATALOGUE && destination.droppableId === BUCKET) {
      if (isFull) {
        toast.error(`Quota reached: this plan allows ${quota} theme${quota === 1 ? '' : 's'}.`);
        return;
      }
      const theme = byId.get(draggableId);
      if (theme) assignMutation.mutate({ theme, index: destination.index });
      return;
    }
    if (source.droppableId === BUCKET && destination.droppableId === CATALOGUE) {
      const theme = byId.get(draggableId);
      if (theme) unassignMutation.mutate(theme);
      return;
    }
    if (source.droppableId === BUCKET && destination.droppableId === BUCKET) {
      reorderMutation.mutate({ from: source.index, to: destination.index });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-8 w-8" />
          Tenant Themes
        </h1>
        <p className="text-muted-foreground">
          Drag themes from the catalogue into a tenant's bucket. The tenant's plan sets how many it can hold;
          the default theme is always included and never counts.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="tenant-themes-select">Select Tenant</Label>
            <select
              id="tenant-themes-select"
              className="w-full p-2 border rounded-md"
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
            >
              <option value="">Choose a tenant...</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {tenant && (
              <p className="text-sm text-muted-foreground pt-1">
                Plan: <Badge variant="outline">{planLabel(tenant.subscription_plan)}</Badge>
                {' '}&middot; Bucket: <strong>{used}</strong> of{' '}
                <strong>{quota === null ? 'unlimited' : quota}</strong>
                {defaultTheme ? ` (+ ${defaultTheme.name} as default)` : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTenant && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid gap-6 md:grid-cols-2">
            <Droppable droppableId={CATALOGUE}>
              {(provided, snapshot) => (
                <Card className={`flex flex-col min-h-[480px] ${snapshot.isDraggingOver ? 'bg-muted/50' : ''}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Palette className="h-5 w-5" />Catalogue</span>
                      <Badge variant="secondary">{catalogueThemes.length}</Badge>
                    </CardTitle>
                    <CardDescription>Drag a theme to the right to give it to this tenant.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ScrollArea className="h-full" ref={provided.innerRef} {...provided.droppableProps}>
                      <div className="space-y-2">
                        {catalogueLoading && (
                          <p className="text-sm text-muted-foreground">Loading themes...</p>
                        )}
                        {catalogueThemes.map((theme, index) => (
                          <Draggable key={theme.id} draggableId={theme.id} index={index} isDragDisabled={busy}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`${snapshot.isDragging ? 'rotate-1 scale-105' : ''} transition-transform`}
                              >
                                <ThemeCard theme={theme} dragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {!catalogueLoading && catalogueThemes.length === 0 && (
                          <p className="text-center py-8 text-sm text-muted-foreground">
                            Every theme is already in this tenant's bucket.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </Droppable>

            <Droppable droppableId={BUCKET}>
              {(provided, snapshot) => (
                <Card
                  className={`flex flex-col min-h-[480px] border-2 ${
                    snapshot.isDraggingOver ? (isFull ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5') : ''
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Layers className="h-5 w-5" />{tenant?.name}'s bucket</span>
                      <Badge variant={isFull ? 'destructive' : 'secondary'}>
                        {used} / {quota === null ? '∞' : quota}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      What this tenant can pick in its own portal. Drag a theme back to the catalogue to remove it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      {defaultTheme && <ThemeCard theme={defaultTheme} pinned />}
                      <ScrollArea className="h-full" ref={provided.innerRef} {...provided.droppableProps}>
                        <div className="space-y-2">
                          {assignmentsLoading && (
                            <p className="text-sm text-muted-foreground">Loading bucket...</p>
                          )}
                          {bucketThemes.map((theme, index) => (
                            <Draggable key={theme.id} draggableId={theme.id} index={index} isDragDisabled={busy}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`${snapshot.isDragging ? 'rotate-1 scale-105' : ''} transition-transform`}
                                >
                                  <ThemeCard theme={theme} dragging={snapshot.isDragging} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {!assignmentsLoading && bucketThemes.length === 0 && (
                            <p className="text-center py-8 text-sm text-muted-foreground">
                              Only the default theme. Drag themes here from the catalogue.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
