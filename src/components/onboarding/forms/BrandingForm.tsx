
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

const brandingSchema = z.object({
  logo: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  companyDescription: z.string().max(500, 'Description must be less than 500 characters').optional()
});

type BrandingData = z.infer<typeof brandingSchema>;

interface BrandingFormProps {
  data: Partial<BrandingData>;
  onDataChange: (data: Partial<BrandingData>) => void;
}

export const BrandingForm: React.FC<BrandingFormProps> = ({ 
  data, 
  onDataChange 
}) => {
  const form = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo: data.logo || '',
      primaryColor: data.primaryColor || '#3B82F6',
      secondaryColor: data.secondaryColor || '#64748B',
      companyDescription: data.companyDescription || ''
    },
    mode: 'onChange'
  });

  React.useEffect(() => {
    const subscription = form.watch((formData) => {
      if (form.formState.isValid) {
        onDataChange(formData as Partial<BrandingData>);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Logo</FormLabel>
              <FormControl>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-16 w-16 text-gray-400" />
                  <div className="mt-4">
                    <Button type="button" variant="outline">
                      Upload Logo
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">
                      PNG, JPG up to 5MB. Recommended: 200x200px
                    </p>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="primaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Color *</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="color"
                      className="w-16 h-10 rounded border-0 cursor-pointer"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <Input
                      placeholder="#3B82F6"
                      className="flex-1"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secondaryColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Color *</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="color"
                      className="w-16 h-10 rounded border-0 cursor-pointer"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <Input
                      placeholder="#64748B"
                      className="flex-1"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="companyDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your company..."
                  className="min-h-[100px]"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                {(field.value || '').length}/500 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};
