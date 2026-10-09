import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store, Plus, Edit, Power, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AVAILABILITY_STATUSES,
  OfferingFormValues,
  useVarietyOfferings,
} from '@/hooks/useVarietyOfferings';

const EMPTY_FORM: OfferingFormValues = {
  company_id: '',
  company_sku: '',
  brand_name: '',
  price: '',
  currency: 'INR',
  pack_size: '',
  pack_unit: 'kg',
  availability_status: 'available',
  regions: [],
  notes: '',
};

interface VarietyOfferingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  varietyId?: string;
  varietyName?: string;
}

export function VarietyOfferingsDialog({
  open,
  onOpenChange,
  varietyId,
  varietyName,
}: VarietyOfferingsDialogProps) {
  const [form, setForm] = useState<OfferingFormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [regionsText, setRegionsText] = useState('');

  const { offerings, isLoading, createOffering, updateOffering, setOfferingActive } =
    useVarietyOfferings(open ? varietyId : undefined);

  const { data: companies } = useQuery({
    queryKey: ['master-companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const activeCount = useMemo(() => offerings.filter((o) => o.is_active).length, [offerings]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setRegionsText('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = async (offeringId: string) => {
    const offering = offerings.find((o) => o.offering_id === offeringId);
    if (!offering) return;

    const { data, error } = await supabase
      .from('variety_company_offerings')
      .select('notes')
      .eq('id', offeringId)
      .single();

    setForm({
      company_id: offering.company_id,
      company_sku: offering.company_sku ?? '',
      brand_name: offering.brand_name ?? '',
      price: offering.price != null ? String(offering.price) : '',
      currency: offering.currency ?? 'INR',
      pack_size: offering.pack_size != null ? String(offering.pack_size) : '',
      pack_unit: offering.pack_unit ?? 'kg',
      availability_status: offering.availability_status ?? 'available',
      regions: offering.regions ?? [],
      notes: error || !data ? '' : (data.notes ?? ''),
    });
    setRegionsText((offering.regions ?? []).join(', '));
    setEditingId(offeringId);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: OfferingFormValues = {
      ...form,
      regions: regionsText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    };
    if (!values.company_id) return;

    if (editingId) {
      updateOffering.mutate({ id: editingId, values }, { onSuccess: resetForm });
    } else {
      createOffering.mutate(values, { onSuccess: resetForm });
    }
  };

  const isSaving = createOffering.isPending || updateOffering.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="h-5 w-5 text-primary" />
            Sellers &amp; Offerings
          </DialogTitle>
          <DialogDescription>
            Companies selling <span className="font-medium">{varietyName || 'this variety'}</span> —{' '}
            {activeCount} active of {offerings.length} total.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Each seller can list its own SKU, pack size, price and regions.
          </p>
          {!showForm && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setForm(EMPTY_FORM);
                setRegionsText('');
                setEditingId(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add seller
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Seller company <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.company_id}
                  onValueChange={(value) => setForm({ ...form, company_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Seller SKU</Label>
                <Input
                  placeholder="e.g., SD-PB1121-5KG"
                  value={form.company_sku}
                  onChange={(e) => setForm({ ...form, company_sku: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand name</Label>
                <Input
                  placeholder="e.g., Kisan Gold"
                  value={form.brand_name}
                  onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={form.availability_status}
                  onValueChange={(value) => setForm({ ...form, availability_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITY_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm({ ...form, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pack size</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 5"
                  value={form.pack_size}
                  onChange={(e) => setForm({ ...form, pack_size: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Pack unit</Label>
                <Select
                  value={form.pack_unit}
                  onValueChange={(value) => setForm({ ...form, pack_unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="packet">packet</SelectItem>
                    <SelectItem value="bag">bag</SelectItem>
                    <SelectItem value="seeds">seeds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Regions (comma separated)</Label>
                <Input
                  placeholder="e.g., Maharashtra, Punjab, Haryana"
                  value={regionsText}
                  onChange={(e) => setRegionsText(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="Internal notes about this seller offering"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!form.company_id || isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Save changes' : 'Add offering'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-lg border">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading offerings...
            </div>
          ) : offerings.length === 0 ? (
            <div className="py-10 text-center">
              <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No sellers yet</p>
              <p className="text-sm text-muted-foreground">
                Add the first company that sells this variety.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>SKU / Brand</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerings.map((offering) => (
                  <TableRow key={offering.offering_id} className={offering.is_active ? '' : 'opacity-60'}>
                    <TableCell className="font-medium">{offering.company_name || '—'}</TableCell>
                    <TableCell className="text-sm">
                      <div>{offering.company_sku || '—'}</div>
                      {offering.brand_name && (
                        <div className="text-muted-foreground">{offering.brand_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {offering.pack_size != null
                        ? `${offering.pack_size} ${offering.pack_unit || ''}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {offering.price != null
                        ? `${offering.currency || 'INR'} ${offering.price}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {AVAILABILITY_STATUSES.find((s) => s.value === offering.availability_status)
                          ?.label || offering.availability_status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] text-sm text-muted-foreground truncate">
                      {offering.regions?.length ? offering.regions.join(', ') : 'All regions'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={offering.is_active ? 'default' : 'secondary'}>
                        {offering.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(offering.offering_id)}
                          aria-label="Edit offering"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={setOfferingActive.isPending}
                          onClick={() =>
                            setOfferingActive.mutate({
                              id: offering.offering_id,
                              isActive: !offering.is_active,
                            })
                          }
                          aria-label={offering.is_active ? 'Deactivate offering' : 'Activate offering'}
                        >
                          <Power
                            className={`h-4 w-4 ${offering.is_active ? 'text-destructive' : 'text-primary'}`}
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
