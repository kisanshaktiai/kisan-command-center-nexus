
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { FileText, Video, HelpCircle, MessageSquare, Upload } from 'lucide-react';

interface ContentManagementPanelProps {
  config: any;
  updateConfig: (section: string, field: string, value: any) => void;
}

export function ContentManagementPanel({ config, updateConfig }: ContentManagementPanelProps) {
  const handleArrayUpdate = (section: string, field: string, index: number, value: string) => {
    const currentArray = config[section]?.[field] || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    updateConfig(section, field, newArray);
  };

  const addArrayItem = (section: string, field: string) => {
    const currentArray = config[section]?.[field] || [];
    updateConfig(section, field, [...currentArray, '']);
  };

  const removeArrayItem = (section: string, field: string, index: number) => {
    const currentArray = config[section]?.[field] || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    updateConfig(section, field, newArray);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Content Management
        </CardTitle>
        <CardDescription>
          Customize help documentation, legal content, and in-app messaging
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="help" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="help" className="flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Help
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Legal
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Messaging
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="space-y-4">
            <div>
              <Label htmlFor="help_center_url">Custom Help Center URL</Label>
              <Input
                id="help_center_url"
                value={config.content_management?.help_center_url || ''}
                onChange={(e) => updateConfig('content_management', 'help_center_url', e.target.value)}
                placeholder="https://help.yourcompany.com"
              />
            </div>

            <div>
              <Label htmlFor="documentation_url">Documentation URL</Label>
              <Input
                id="documentation_url"
                value={config.content_management?.documentation_url || ''}
                onChange={(e) => updateConfig('content_management', 'documentation_url', e.target.value)}
                placeholder="https://docs.yourcompany.com"
              />
            </div>

            <div>
              <Label htmlFor="getting_started_guide">Getting Started Guide</Label>
              <Textarea
                id="getting_started_guide"
                value={config.content_management?.getting_started_guide || ''}
                onChange={(e) => updateConfig('content_management', 'getting_started_guide', e.target.value)}
                placeholder="Write a custom getting started guide for your users..."
                rows={8}
              />
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div>
              <Label htmlFor="onboarding_video">Onboarding Video URL</Label>
              <Input
                id="onboarding_video"
                value={config.content_management?.onboarding_video || ''}
                onChange={(e) => updateConfig('content_management', 'onboarding_video', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div>
              <Label>Tutorial Videos</Label>
              {(config.content_management?.tutorial_videos || []).map((video: string, index: number) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    value={video}
                    onChange={(e) => handleArrayUpdate('content_management', 'tutorial_videos', index, e.target.value)}
                    placeholder="Video URL"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem('content_management', 'tutorial_videos', index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('content_management', 'tutorial_videos')}
                className="mt-2"
              >
                Add Tutorial Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            <div>
              <Label htmlFor="terms_of_service">Terms of Service</Label>
              <Textarea
                id="terms_of_service"
                value={config.content_management?.terms_of_service || ''}
                onChange={(e) => updateConfig('content_management', 'terms_of_service', e.target.value)}
                placeholder="Enter your custom terms of service..."
                rows={10}
              />
            </div>

            <div>
              <Label htmlFor="privacy_policy">Privacy Policy</Label>
              <Textarea
                id="privacy_policy"
                value={config.content_management?.privacy_policy || ''}
                onChange={(e) => updateConfig('content_management', 'privacy_policy', e.target.value)}
                placeholder="Enter your custom privacy policy..."
                rows={10}
              />
            </div>

            <div>
              <Label htmlFor="data_processing_agreement">Data Processing Agreement</Label>
              <Textarea
                id="data_processing_agreement"
                value={config.content_management?.data_processing_agreement || ''}
                onChange={(e) => updateConfig('content_management', 'data_processing_agreement', e.target.value)}
                placeholder="Enter your data processing agreement..."
                rows={6}
              />
            </div>
          </TabsContent>

          <TabsContent value="faq" className="space-y-4">
            <div>
              <Label>Frequently Asked Questions</Label>
              {(config.content_management?.faq_items || []).map((faq: any, index: number) => (
                <div key={index} className="border rounded-md p-4 mt-2">
                  <div className="space-y-2">
                    <Input
                      value={faq?.question || ''}
                      onChange={(e) => {
                        const currentFaqs = config.content_management?.faq_items || [];
                        const newFaqs = [...currentFaqs];
                        newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                        updateConfig('content_management', 'faq_items', newFaqs);
                      }}
                      placeholder="Question"
                    />
                    <Textarea
                      value={faq?.answer || ''}
                      onChange={(e) => {
                        const currentFaqs = config.content_management?.faq_items || [];
                        const newFaqs = [...currentFaqs];
                        newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                        updateConfig('content_management', 'faq_items', newFaqs);
                      }}
                      placeholder="Answer"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem('content_management', 'faq_items', index)}
                    >
                      Remove FAQ
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('content_management', 'faq_items')}
                className="mt-2"
              >
                Add FAQ Item
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="custom_messaging"
                checked={config.content_management?.custom_messaging_enabled || false}
                onCheckedChange={(checked) => updateConfig('content_management', 'custom_messaging_enabled', checked)}
              />
              <Label htmlFor="custom_messaging">Enable Custom In-App Messaging</Label>
            </div>

            {config.content_management?.custom_messaging_enabled && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="welcome_message">Welcome Message</Label>
                  <Textarea
                    id="welcome_message"
                    value={config.content_management?.welcome_message || ''}
                    onChange={(e) => updateConfig('content_management', 'welcome_message', e.target.value)}
                    placeholder="Welcome to {{app_name}}! We're excited to help you..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="success_messages">Success Messages (JSON)</Label>
                  <Textarea
                    id="success_messages"
                    value={config.content_management?.success_messages || ''}
                    onChange={(e) => updateConfig('content_management', 'success_messages', e.target.value)}
                    placeholder='{"login": "Welcome back!", "signup": "Account created successfully!"}'
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="error_messages">Error Messages (JSON)</Label>
                  <Textarea
                    id="error_messages"
                    value={config.content_management?.error_messages || ''}
                    onChange={(e) => updateConfig('content_management', 'error_messages', e.target.value)}
                    placeholder='{"network": "Please check your connection", "auth": "Invalid credentials"}'
                    rows={4}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
