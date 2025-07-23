
import React from 'react';
import { cn } from '@/lib/utils';

interface CompactFormProps {
  children: React.ReactNode;
  className?: string;
}

export const CompactForm: React.FC<CompactFormProps> = ({ children, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  );
};

interface CompactFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const CompactFormSection: React.FC<CompactFormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
};

interface CompactFormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const CompactFormGroup: React.FC<CompactFormGroupProps> = ({ children, className }) => {
  return (
    <div className={cn('grid gap-3 md:grid-cols-2', className)}>
      {children}
    </div>
  );
};
