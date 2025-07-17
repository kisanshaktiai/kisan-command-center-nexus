
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface CSSInjectionPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function CSSInjectionPanel({ config, updateConfig }: CSSInjectionPanelProps) {
  const validateCSS = (css: string) => {
    try {
      // Basic CSS validation - check for dangerous patterns
      const dangerousPatterns = [
        /javascript:/gi,
        /expression\(/gi,
        /import\s+/gi,
        /@import/gi,
        /behavior:/gi,
        /binding:/gi
      ];
      
      return !dangerousPatterns.some(pattern => pattern.test(css));
    } catch {
      return false;
    }
  };

  const handleCSSChange = (type: string, value: string) => {
    const isValid = validateCSS(value);
    if (!isValid && value.trim()) {
      toast.error('CSS contains potentially dangerous code');
      return;
    }
    
    updateConfig('css_injection', type, value);
  };

  const previewCSS = () => {
    const customCSS = config.css_injection?.custom_css || '';
    if (customCSS) {
      const styleElement = document.createElement('style');
      styleElement.textContent = customCSS;
      document.head.appendChild(styleElement);
      
      setTimeout(() => {
        document.head.removeChild(styleElement);
      }, 5000);
      
      toast.success('CSS preview applied for 5 seconds');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          CSS Injection
        </CardTitle>
        <CardDescription>
          Add custom CSS to override default styles. Use with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="enable_css_injection"
            checked={config.css_injection?.enabled || false}
            onCheckedChange={(checked) => updateConfig('css_injection', 'enabled', checked)}
          />
          <Label htmlFor="enable_css_injection">Enable Custom CSS Injection</Label>
          <Badge variant="secondary">Advanced</Badge>
        </div>

        {config.css_injection?.enabled && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Custom CSS can override core functionality. 
                  Test thoroughly before deploying to production.
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="custom_css">Global Custom CSS</Label>
              <Textarea
                id="custom_css"
                value={config.css_injection?.custom_css || ''}
                onChange={(e) => handleCSSChange('custom_css', e.target.value)}
                placeholder={`/* Add your custom CSS here */
.custom-header {
  background: linear-gradient(45deg, #1e40af, #3b82f6);
}

.btn-primary {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}`}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="mobile_css">Mobile-Specific CSS</Label>
              <Textarea
                id="mobile_css"
                value={config.css_injection?.mobile_css || ''}
                onChange={(e) => handleCSSChange('mobile_css', e.target.value)}
                placeholder={`/* Mobile-specific styles */
@media (max-width: 768px) {
  .mobile-hidden {
    display: none !important;
  }
}`}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="print_css">Print-Specific CSS</Label>
              <Textarea
                id="print_css"
                value={config.css_injection?.print_css || ''}
                onChange={(e) => handleCSSChange('print_css', e.target.value)}
                placeholder={`/* Print-specific styles */
@media print {
  .no-print {
    display: none !important;
  }
}`}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={previewCSS} variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Preview CSS (5s)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
