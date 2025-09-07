import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  Building,
  Layers,
  Star,
  Shield,
  Leaf,
  Brain,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  onView: (product: any) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onView,
  isSelected = false,
  onSelect,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'draft':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string | null) => {
    const typeValue = type || 'other';
    switch (typeValue) {
      case 'fertilizer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pesticide':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'herbicide':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'fungicide':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'seeds':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
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
          className={`h-3.5 w-3.5 ${
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
    <Card 
      className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(product.id)}
            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
          />
        </div>
      )}

      {/* Quick Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(product)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(product.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="pt-6">
        {/* Product Icon and Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusColor(product.status)}>
            {product.status === 'active' && <CheckCircle className="mr-1 h-3 w-3" />}
            {product.status}
          </Badge>
          <Badge className={getTypeColor(product.product_type)}>
            {product.product_type || 'Other'}
          </Badge>
          {product.is_organic && (
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <Leaf className="mr-1 h-3 w-3" />
              Organic
            </Badge>
          )}
          {product.is_ai_recommendable && (
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <Brain className="mr-1 h-3 w-3" />
              AI Ready
            </Badge>
          )}
        </div>

        {/* Company and Category */}
        <div className="space-y-2 text-sm mb-4">
          {product.company && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              <span className="truncate">{product.company.name}</span>
            </div>
          )}
          {product.category && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span className="truncate">{product.category.name}</span>
            </div>
          )}
        </div>

        {/* Rating and Safety */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {renderRating(product.effectiveness_rating)}
            <span className="text-xs text-muted-foreground ml-1">
              ({product.effectiveness_rating || 0})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className={`h-4 w-4 ${getSafetyColor(product.safety_level)}`} />
            <span className={`text-xs font-medium ${getSafetyColor(product.safety_level)}`}>
              {product.safety_level || 'N/A'}
            </span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Brand */}
        {product.brand && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Brand:</span>
              <span className="font-medium">{product.brand}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <div className="flex gap-2 w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onView(product)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(product)}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};