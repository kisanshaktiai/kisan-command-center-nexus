
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={`color-${label}`} className="text-sm font-semibold">{label}</Label>
      <div className="flex items-center space-x-2">
        <Input
          id={`color-${label}`}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-11 p-1 border rounded cursor-pointer"
        />
        <Input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#10B981"
          className="flex-1 h-11 font-mono text-sm focus-visible:ring-primary"
        />
      </div>
    </div>
  );
};
