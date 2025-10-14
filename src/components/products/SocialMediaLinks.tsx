import { useState } from 'react';
import { Plus, X, Youtube, Instagram, Facebook, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export interface VideoUrls {
  youtube: string[];
  instagram: string[];
  facebook: string[];
}

interface SocialMediaLinksProps {
  videoUrls: VideoUrls;
  onVideoUrlsChange: (urls: VideoUrls) => void;
}

const PLATFORM_CONFIGS = {
  youtube: {
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/watch?v=...',
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/
    ]
  },
  instagram: {
    icon: Instagram,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    label: 'Instagram',
    placeholder: 'https://www.instagram.com/p/...',
    patterns: [
      /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+/
    ]
  },
  facebook: {
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/...',
    patterns: [
      /^https?:\/\/(www\.)?facebook\.com\/(watch\?v=|[\w.]+\/videos\/)\d+/,
      /^https?:\/\/fb\.watch\/[\w-]+/
    ]
  }
};

export const SocialMediaLinks = ({ videoUrls, onVideoUrlsChange }: SocialMediaLinksProps) => {
  const [newUrls, setNewUrls] = useState<Record<keyof VideoUrls, string>>({
    youtube: '',
    instagram: '',
    facebook: ''
  });

  const validateUrl = (platform: keyof VideoUrls, url: string): boolean => {
    if (!url.trim()) return false;
    
    const config = PLATFORM_CONFIGS[platform];
    return config.patterns.some(pattern => pattern.test(url));
  };

  const handleAddUrl = (platform: keyof VideoUrls) => {
    const url = newUrls[platform].trim();
    
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    if (!validateUrl(platform, url)) {
      toast.error(`Invalid ${PLATFORM_CONFIGS[platform].label} URL format`);
      return;
    }

    const currentUrls = videoUrls?.[platform] || [];
    
    if (currentUrls.includes(url)) {
      toast.error('This URL has already been added');
      return;
    }

    if (currentUrls.length >= 5) {
      toast.error('Maximum 5 URLs per platform');
      return;
    }

    onVideoUrlsChange({
      ...videoUrls,
      [platform]: [...currentUrls, url]
    });

    setNewUrls({ ...newUrls, [platform]: '' });
    toast.success('URL added successfully');
  };

  const handleRemoveUrl = (platform: keyof VideoUrls, index: number) => {
    const currentUrls = videoUrls?.[platform] || [];
    onVideoUrlsChange({
      ...videoUrls,
      [platform]: currentUrls.filter((_, i) => i !== index)
    });
    toast.success('URL removed');
  };

  const handleKeyPress = (e: React.KeyboardEvent, platform: keyof VideoUrls) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl(platform);
    }
  };

  return (
    <div className="space-y-6">
      {(Object.keys(PLATFORM_CONFIGS) as Array<keyof VideoUrls>).map((platform) => {
        const config = PLATFORM_CONFIGS[platform];
        const Icon = config.icon;
        const urls = videoUrls?.[platform] || [];

        return (
          <Card key={platform} className="p-4">
            <div className="space-y-4">
              {/* Platform Header */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    {config.label} Videos
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add up to 5 {config.label} video URLs
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {urls.length} / 5
                </span>
              </div>

              {/* Add URL Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder={config.placeholder}
                    value={newUrls[platform]}
                    onChange={(e) => setNewUrls({ ...newUrls, [platform]: e.target.value })}
                    onKeyPress={(e) => handleKeyPress(e, platform)}
                    disabled={urls.length >= 5}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleAddUrl(platform)}
                  disabled={urls.length >= 5 || !newUrls[platform].trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* URL List */}
              {urls.length > 0 && (
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 group hover:bg-muted transition-colors"
                    >
                      <Icon className={`h-4 w-4 ${config.color} flex-shrink-0`} />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-sm truncate hover:text-primary"
                      >
                        {url}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveUrl(platform, index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Format Help */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Accepted formats:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  {config.patterns.map((pattern, idx) => (
                    <li key={idx} className="font-mono text-[10px]">
                      {pattern.source.replace(/\^https\?:\\\/\\\//g, 'https://').replace(/[\[\]\\]/g, '')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
