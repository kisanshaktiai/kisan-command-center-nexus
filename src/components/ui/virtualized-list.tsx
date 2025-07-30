
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  width?: number | string;
  itemHeight: number;
  itemComponent: React.ComponentType<{ index: number; style: any; data: T[] }>;
  className?: string;
}

export const VirtualizedList = React.memo(<T,>({
  items,
  height,
  width = '100%',
  itemHeight,
  itemComponent: ItemComponent,
  className = ''
}: VirtualizedListProps<T>) => {
  const memoizedItems = useMemo(() => items, [items]);

  if (!items.length) {
    return (
      <div className={`flex items-center justify-center h-32 text-muted-foreground ${className}`}>
        No items to display
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={memoizedItems}
      >
        {ItemComponent}
      </List>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';
