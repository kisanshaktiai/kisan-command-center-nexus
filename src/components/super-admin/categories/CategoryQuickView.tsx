import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Layers, 
  Package, 
  Calendar, 
  Edit, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

interface CategoryQuickViewProps {
  category: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (category: any) => void;
}

export const CategoryQuickView: React.FC<CategoryQuickViewProps> = ({
  category,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!category) return null;

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'secondary';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{category.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{category.slug}</p>
              </div>
            </div>
            <Badge variant={getStatusColor(category.is_active)}>
              {category.is_active ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Parent Category */}
          {category.parent_category && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Parent Category</h4>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{category.parent_category.name}</span>
              </div>
            </div>
          )}

          {/* Description */}
          {category.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-sm">{category.description}</p>
            </div>
          )}

          <Separator />

          {/* Statistics */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="font-semibold">{category.product_count || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Subcategories</p>
                  <p className="font-semibold">{category.subcategory_count || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Icon */}
          {category.icon && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Icon</h4>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm bg-muted px-2 py-1 rounded">{category.icon}</code>
              </div>
            </div>
          )}

          {/* Metadata */}
          {category.metadata && Object.keys(category.metadata).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Additional Metadata</h4>
              <div className="space-y-2">
                {Object.entries(category.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {category.created_at ? format(new Date(category.created_at), 'PPP') : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="font-medium">
                  {category.updated_at ? format(new Date(category.updated_at), 'PPP') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onEdit(category)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Category
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};