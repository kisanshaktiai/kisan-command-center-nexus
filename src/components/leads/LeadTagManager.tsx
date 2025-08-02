
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Tag } from 'lucide-react';
import { useLeadTags, useAllLeadTags, useCreateLeadTag, useDeleteLeadTag } from '@/hooks/useLeadTags';
import { useNotifications } from '@/hooks/useNotifications';

interface LeadTagManagerProps {
  leadId: string;
  className?: string;
}

const TAG_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

export const LeadTagManager: React.FC<LeadTagManagerProps> = ({ leadId, className }) => {
  const { data: leadTags = [], isLoading } = useLeadTags(leadId);
  const { data: allTags = [] } = useAllLeadTags();
  const createTag = useCreateLeadTag();
  const deleteTag = useDeleteLeadTag();
  const { showSuccess, showError } = useNotifications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [selectedExistingTag, setSelectedExistingTag] = useState('');

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      await createTag.mutateAsync({
        lead_id: leadId,
        tag_name: newTagName.trim(),
        tag_color: selectedColor,
      });
      
      showSuccess('Tag added successfully');
      setNewTagName('');
      setIsDialogOpen(false);
    } catch (error) {
      showError('Failed to add tag');
    }
  };

  const handleAddExistingTag = async () => {
    if (!selectedExistingTag) return;
    
    const existingTag = allTags.find(tag => tag.tag_name === selectedExistingTag);
    if (!existingTag) return;
    
    try {
      await createTag.mutateAsync({
        lead_id: leadId,
        tag_name: existingTag.tag_name,
        tag_color: existingTag.tag_color,
      });
      
      showSuccess('Tag added successfully');
      setSelectedExistingTag('');
      setIsDialogOpen(false);
    } catch (error) {
      showError('Failed to add tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag.mutateAsync(tagId);
      showSuccess('Tag removed successfully');
    } catch (error) {
      showError('Failed to remove tag');
    }
  };

  // Filter out existing tags from available tags
  const availableTags = allTags.filter(
    tag => !leadTags.some(leadTag => leadTag.tag_name === tag.tag_name)
  );

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {leadTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1 text-white"
          style={{ backgroundColor: tag.tag_color }}
        >
          <Tag className="h-3 w-3" />
          {tag.tag_name}
          <button
            onClick={() => handleDeleteTag(tag.id)}
            className="ml-1 hover:bg-black/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lead Tag</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add existing tag */}
            {availableTags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Use Existing Tag</h4>
                <div className="flex gap-2">
                  <Select value={selectedExistingTag} onValueChange={setSelectedExistingTag}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select existing tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map((tag) => (
                        <SelectItem key={tag.tag_name} value={tag.tag_name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: tag.tag_color }}
                            />
                            {tag.tag_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddExistingTag}
                    disabled={!selectedExistingTag || createTag.isPending}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
            
            {/* Create new tag */}
            <div>
              <h4 className="font-medium mb-2">Create New Tag</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Enter tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color.value ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setSelectedColor(color.value)}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateNewTag}
                  disabled={!newTagName.trim() || createTag.isPending}
                  className="w-full"
                >
                  {createTag.isPending ? 'Creating...' : 'Create Tag'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
