import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Calendar, 
  Edit, 
  CheckCircle, 
  XCircle,
  Building,
  Layers,
  Star,
  Shield,
  Leaf,
  Brain,
  Hash,
  Beaker,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface ProductQuickViewProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: any) => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
}) => {
  if (!product) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'discontinued':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSafetyColor = (level: string | null) => {
    switch (level) {
      case 'high':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'medium':
        return 'text-amber-600 dark:text-amber-400';
      case 'low':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderRating = (rating: number | null) => {
    const stars = [];
    const fullRating = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= fullRating 
              ? 'fill-amber-400 text-amber-400' 
              : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{product.name}</DialogTitle>
                <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={getStatusColor(product.status)}>
                {product.status === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
                {product.status}
              </Badge>
              {product.is_organic && (
                <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <Leaf className="mr-1 h-3 w-3" />
                  Organic
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="composition">Composition</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="ai">AI & Safety</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Company and Category */}
            <div className="grid grid-cols-2 gap-4">
              {product.company && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{product.company.name}</p>
                  </div>
                </div>
              )}
              {product.category && (
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                <p className="text-sm">{product.description}</p>
              </div>
            )}

            {/* Product Type and Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Product Type</p>
                <Badge variant="outline" className="mt-1">
                  {product.product_type || 'N/A'}
                </Badge>
              </div>
              {product.brand && (
                <div>
                  <p className="text-sm text-muted-foreground">Brand</p>
                  <p className="font-medium mt-1">{product.brand}</p>
                </div>
              )}
            </div>

            {/* Rating and Safety */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Effectiveness Rating</p>
                <div className="flex items-center gap-2">
                  {renderRating(product.effectiveness_rating)}
                  <span className="text-sm font-medium">
                    {product.effectiveness_rating || 0}/5
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Safety Level</p>
                <div className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${getSafetyColor(product.safety_level)}`} />
                  <span className={`font-medium ${getSafetyColor(product.safety_level)}`}>
                    {product.safety_level || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="composition" className="space-y-6">
            {/* Ingredients */}
            {product.ingredients && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Beaker className="h-4 w-4" />
                  Active Ingredients
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap">{product.ingredients}</pre>
                </div>
              </div>
            )}

            {/* Composition Details */}
            {product.composition && Object.keys(product.composition).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Composition Details</h4>
                <div className="space-y-2">
                  {Object.entries(product.composition).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage Instructions */}
            {product.usage_instructions && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Usage Instructions
                </h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap">{product.usage_instructions}</pre>
                </div>
              </div>
            )}

            {/* Application Methods */}
            {product.application_methods && product.application_methods.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Application Methods</h4>
                <div className="flex flex-wrap gap-2">
                  {product.application_methods.map((method: string) => (
                    <Badge key={method} variant="secondary">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suitable Crops */}
            {product.suitable_crops && product.suitable_crops.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Suitable Crops</h4>
                <div className="flex flex-wrap gap-2">
                  {product.suitable_crops.map((crop: string) => (
                    <Badge key={crop} variant="outline">
                      {crop}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            {/* AI Settings */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Configuration
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">AI Recommendable</span>
                  <Badge variant={product.is_ai_recommendable ? 'success' : 'secondary'}>
                    {product.is_ai_recommendable ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {product.ai_confidence_score && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">AI Confidence Score</span>
                    <span className="font-medium">{product.ai_confidence_score}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            {product.ai_recommendations && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">AI Recommendations</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap">{product.ai_recommendations}</pre>
                </div>
              </div>
            )}

            {/* Safety Precautions */}
            {product.safety_precautions && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Safety Precautions
                </h4>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap">{product.safety_precautions}</pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {product.created_at ? format(new Date(product.created_at), 'PPP') : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Updated</p>
              <p className="font-medium">
                {product.updated_at ? format(new Date(product.updated_at), 'PPP') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit(product)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};