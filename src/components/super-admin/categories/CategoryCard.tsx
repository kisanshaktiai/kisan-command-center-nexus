import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Layers, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  Package,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CategoryCardProps {
  category: any;
  onEdit: (category: any) => void;
  onDelete: (id: string) => void;
  onView: (category: any) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onEdit,
  onDelete,
  onView,
  isSelected = false,
  onSelect,
}) => {
  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
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
            onChange={() => onSelect(category.id)}
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
            <DropdownMenuItem onClick={() => onView(category)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(category.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="pt-6">
        {/* Category Icon and Name */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{category.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{category.slug}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusColor(category.is_active)}>
            {category.is_active && <CheckCircle className="mr-1 h-3 w-3" />}
            {category.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {category.parent_category && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {category.parent_category.name}
            </Badge>
          )}
        </div>

        {/* Description */}
        {category.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {category.description}
          </p>
        )}

        {/* Statistics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Products:</span>
            <span className="font-medium">{category.product_count || 0}</span>
          </div>
          {category.subcategory_count > 0 && (
            <div className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Sub:</span>
              <span className="font-medium">{category.subcategory_count}</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        {category.metadata && Object.keys(category.metadata).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-1">
              {Object.entries(category.metadata).slice(0, 3).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
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
            onClick={() => onView(category)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(category)}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};