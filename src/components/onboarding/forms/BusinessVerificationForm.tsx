
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, HelpCircle } from 'lucide-react';

const businessVerificationSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format'),
  registrationCertificate: z.string().optional(),
  addressProof: z.string().optional()
});

type BusinessVerificationData = z.infer<typeof businessVerificationSchema>;

interface BusinessVerificationFormProps {
  data: Partial<BusinessVerificationData>;
  onDataChange: (data: Partial<BusinessVerificationData>) => void;
}

export const BusinessVerificationForm: React.FC<BusinessVerificationFormProps> = ({ 
  data, 
  onDataChange 
}) => {
  const form = useForm<BusinessVerificationData>({
    resolver: zodResolver(businessVerificationSchema),
    defaultValues: {
      companyName: data.companyName || '',
      gstNumber: data.gstNumber || '',
      panNumber: data.panNumber || '',
      registrationCertificate: data.registrationCertificate || '',
      addressProof: data.addressProof || ''
    },
    mode: 'onChange'
  });

  React.useEffect(() => {
    const subscription = form.watch((formData) => {
      if (form.formState.isValid) {
        onDataChange(formData as Partial<BusinessVerificationData>);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter your company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="gstNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  GST Number *
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </FormLabel>
                <FormControl>
                  <Input placeholder="22AAAAA0000A1Z5" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your 15-digit GST identification number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="panNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  PAN Number *
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </FormLabel>
                <FormControl>
                  <Input placeholder="ABCDE1234F" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your 10-character PAN number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="registrationCertificate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Certificate</FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button type="button" variant="outline">
                        Upload Certificate
                      </Button>
                      <p className="mt-2 text-sm text-gray-500">
                        PDF, JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="addressProof"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Proof</FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button type="button" variant="outline">
                        Upload Address Proof
                      </Button>
                      <p className="mt-2 text-sm text-gray-500">
                        PDF, JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
};
