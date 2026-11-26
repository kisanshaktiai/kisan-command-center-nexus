import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Palette, Edit, Upload, CheckCircle, XCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { PresetTheme } from '@/lib/whitelabel-types/themeMapping';

/**
 * Master Themes — the platform-wide mobile theme catalogue (public.master_themes).
 *
 * The SaaS admin owns this list. Which themes a given tenant may pick is
 * decided on the Tenant Themes page (drag-and-drop into the tenant's bucket);
 * the tenant's plan only sets how many it can hold. One theme is the house
 * default (`is_default`): every tenant always has it and it never counts.
 *
 * Nothing is ever deleted here — retire a theme with Active = off.
 * `theme` holds the SOURCE shape only (core / neutral / status / support /
 * typography / spacing / border_radius / shadows), the same shape the
 * tenant-portal presets always had; expansion into brand_identity /
 * theme_colors happens at apply time against each tenant's own branding.
 */

interface MasterThemeRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  theme: PresetTheme;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const HSL_PATTERN = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
const REQUIRED_GROUPS: Record<string, string[]> = {
  core: ['primary', 'primary_variant', 'secondary', 'secondary_variant', 'tertiary', 'accent'],
  neutral: ['background', 'surface', 'on_background', 'on_surface', 'border'],
  status: ['success', 'warning', 'error', 'info'],
  support: ['disabled', 'overlay'],
};

// Same shape the mobile theme panels require (and the DB CHECK constraint).
const parseThemeJson = (text: string): { theme?: PresetTheme; error?: string } => {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: 'Theme JSON is not valid JSON.' };
  }
  // Accept a full white-label export too: use its mobile_theme if present.
  const candidate = parsed?.mobile_theme ?? parsed;
  if (!candidate || typeof candidate !== 'object') return { error: 'Theme JSON must be an object.' };

  for (const [group, keys] of Object.entries(REQUIRED_GROUPS)) {
    const g = candidate[group];
    if (!g || typeof g !== 'object') return { error: `Missing "${group}" group.` };
    for (const key of keys) {
      const v = g[key];
      if (typeof v !== 'string' || !HSL_PATTERN.test(v)) {
        return { error: `${group}.${key} must be an HSL token like "152 82% 24%".` };
      }
    }
  }
  return { theme: candidate as PresetTheme };
};

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
  is_active: true,
  theme_json: '',
};

export default function MasterThemes() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<MasterThemeRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [themeError, setThemeError] = useState<string | null>(null);

  // master_themes is not in the generated Supabase types yet.
  const { data: themes, isLoading } = useQuery({
    queryKey: ['master-themes-admin', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('master_themes' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as MasterThemeRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['master-themes-admin'] });
    // Tenant-facing lists (White Label Config > Mobile tab) read the same catalogue.
    queryClient.invalidateQueries({ queryKey: ['master-themes'] });
  };

  const buildPayload = (data: typeof formData) => {
    const { theme, error } = parseThemeJson(data.theme_json);
    if (error || !theme) throw new Error(error || 'Invalid theme JSON');
    return {
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description.trim() || null,
      sort_order: Number(data.sort_order) || 0,
      is_active: data.is_active,
      theme,
    };
  };

  const addThemeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('master_themes' as any)
        .insert(buildPayload(data) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Theme added successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add theme');
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('master_themes' as any)
        .update(buildPayload(data) as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Theme updated successfully');
      setIsEditModalOpen(false);
      setSelectedTheme(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update theme');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('set_default_master_theme' as any, { p_theme_id: id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['master-themes-catalogue'] });
      toast.success('Default theme updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set default theme');
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setThemeError(null);
  };

  const handleEdit = (theme: MasterThemeRow) => {
    setSelectedTheme(theme);
    setFormData({
      name: theme.name,
      slug: theme.slug,
      description: theme.description || '',
      sort_order: theme.sort_order,
      is_active: theme.is_active,
      theme_json: JSON.stringify(theme.theme, null, 2),
    });
    setThemeError(null);
    setIsEditModalOpen(true);
  };

  const handleThemeJsonChange = (text: string) => {
    setFormData(prev => ({ ...prev, theme_json: text }));
    setThemeError(text.trim() ? parseThemeJson(text).error ?? null : null);
  };

  const handleThemeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    handleThemeJsonChange(await file.text());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = parseThemeJson(formData.theme_json);
    if (error) {
      setThemeError(error);
      return;
    }
    if (selectedTheme) {
      updateThemeMutation.mutate({ id: selectedTheme.id, data: formData });
    } else {
      addThemeMutation.mutate(formData);
    }
  };

  const closeDialog = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedTheme(null);
    resetForm();
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Master Themes
          </h1>
          <p className="text-muted-foreground">
            Mobile theme catalogue. Give themes to tenants on the Tenant Themes page; the starred theme is the house default every tenant always has.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Theme
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            Retire a theme with Active off — themes are never deleted, because tenants may already use them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading themes...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Colours</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(themes || []).map((theme) => (
                  <TableRow key={theme.id}>
                    <TableCell className="text-muted-foreground">{theme.sort_order}</TableCell>
                    <TableCell><Swatches theme={theme.theme} /></TableCell>
                    <TableCell>
                      <div className="font-medium">{theme.name}</div>
                      {theme.description && (
                        <div className="text-xs text-muted-foreground">{theme.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{theme.slug}</TableCell>
                    <TableCell>
                      {theme.is_default ? (
                        <Badge variant="default" className="gap-1"><Star className="h-3 w-3" />Default</Badge>
                      ) : theme.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(theme.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          Set as default
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {theme.is_active ? (
                        <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Retired</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(theme)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(themes || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No themes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTheme ? 'Edit Theme' : 'Add New Theme'}</DialogTitle>
            <DialogDescription>
              {selectedTheme ? 'Update theme information' : 'Add a theme to the catalogue'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Theme Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (!selectedTheme) {
                        setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="theme_json">Theme JSON</Label>
                  <div>
                    <input
                      id="theme_file"
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleThemeFile}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <label htmlFor="theme_file" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Load from file
                      </label>
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="theme_json"
                  value={formData.theme_json}
                  onChange={(e) => handleThemeJsonChange(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder='{ "core": { "primary": "152 82% 24%", ... }, "neutral": { ... }, "status": { ... }, "support": { ... } }'
                  required
                />
                {themeError ? (
                  <p className="text-xs text-destructive">{themeError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Same shape as a tenant-portal theme export: core, neutral, status and support groups with HSL tokens.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!!themeError || addThemeMutation.isPending || updateThemeMutation.isPending}
              >
                {selectedTheme ? 'Update Theme' : 'Add Theme'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
