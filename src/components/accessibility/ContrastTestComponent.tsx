
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ContrastTestComponent: React.FC = () => {
  return (
    <Card className="max-w-4xl mx-auto p-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          WCAG 2.2 AA Contrast Testing - Small Text Elements
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Testing contrast ratios for 12px and smaller text elements
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Button Testing */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Buttons (12px text)</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="text-xs">Default Button</Button>
            <Button size="sm" variant="secondary" className="text-xs">Secondary</Button>
            <Button size="sm" variant="outline" className="text-xs">Outline</Button>
            <Button size="sm" variant="destructive" className="text-xs">Destructive</Button>
            <Button size="sm" variant="success" className="text-xs">Success</Button>
            <Button size="sm" variant="ghost" className="text-xs">Ghost</Button>
            <Button size="sm" variant="link" className="text-xs">Link Button</Button>
          </div>
        </div>

        {/* Badge Testing */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Badges (12px text)</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="text-xs">Default Badge</Badge>
            <Badge variant="secondary" className="text-xs">Secondary</Badge>
            <Badge variant="destructive" className="text-xs">Destructive</Badge>
            <Badge variant="success" className="text-xs">Success</Badge>
            <Badge variant="warning" className="text-xs">Warning</Badge>
            <Badge variant="outline" className="text-xs">Outline</Badge>
          </div>
        </div>

        {/* Small Text Testing */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Small Text Elements</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-small-primary">Primary small text (12px)</p>
              <p className="text-xs text-small-secondary">Secondary small text (12px)</p>
              <p className="text-xs text-small-muted">Muted small text (12px)</p>
              <p className="text-xs text-small-destructive">Destructive small text (12px)</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-small-success">Success small text (12px)</p>
              <p className="text-xs text-small-warning">Warning small text (12px)</p>
              <p className="text-xs text-small-info">Info small text (12px)</p>
              <a href="#" className="text-xs link-enhanced">Enhanced link (12px)</a>
            </div>
          </div>
        </div>

        {/* Link Testing */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Links (Various Sizes)</h3>
          <div className="space-y-2">
            <div>
              <a href="#" className="text-xs link-enhanced mr-4">Small Link (12px)</a>
              <a href="#" className="text-sm link-enhanced mr-4">Regular Link (14px)</a>
              <a href="#" className="text-base link-enhanced">Large Link (16px)</a>
            </div>
            <div>
              <a href="#" className="text-xs link-enhanced visited mr-4">Visited Small Link</a>
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800 underline">Standard Link</a>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Status Indicators (10px text)</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
              ● Online
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
              ● Pending
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
              ● Offline
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
              ● Processing
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-2">Testing Instructions:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Test with a contrast checker tool (WebAIM, Stark, etc.)</li>
            <li>• Ensure all elements meet WCAG 2.2 AA requirements (4.5:1 for normal text, 3:1 for large text)</li>
            <li>• Test in both light and dark mode</li>
            <li>• Pay special attention to elements with 12px or smaller font size</li>
            <li>• Verify focus indicators are clearly visible</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContrastTestComponent;
