
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, AlertCircle, CheckCircle, X, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  parseCSVContent, 
  validateAndTransformFarmerData, 
  generateCSVTemplate,
  type CSVParseResult,
  type ValidationError 
} from '@/utils/csvParser';

interface FarmerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (farmers: any[]) => Promise<void>;
  tenantId: string;
}

export function FarmerImportModal({ isOpen, onClose, onImport, tenantId }: FarmerImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setParseResult(null);

    try {
      const text = await readFileAsText(file);
      console.log('File content read successfully, length:', text.length);
      
      const csvRows = parseCSVContent(text);
      console.log('CSV parsed successfully, rows:', csvRows.length);
      
      const result = validateAndTransformFarmerData(csvRows);
      console.log('Validation complete:', {
        valid: result.validData.length,
        errors: result.errors.length,
        duplicates: result.duplicates.length
      });
      
      setParseResult(result);
      setActiveTab('preview');
      
      toast({
        title: "File Processed",
        description: `Found ${result.validData.length} valid records out of ${result.totalRows} total rows`
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validData.length === 0) {
      toast({
        title: "No Data to Import",
        description: "Please process a valid CSV file first",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const farmersWithTenant = parseResult.validData.map(farmer => ({
        ...farmer,
        tenant_id: tenantId
      }));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onImport(farmersWithTenant);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${parseResult.validData.length} farmers`
      });
      
      // Reset state and close modal
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    setIsProcessing(false);
    setIsImporting(false);
    setImportProgress(0);
    setActiveTab('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'farmers_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded to your device"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Farmers Data
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="preview" disabled={!parseResult}>Preview Data</TabsTrigger>
            <TabsTrigger value="import" disabled={!parseResult?.validData.length}>Import</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Download Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download the CSV template to ensure your data is in the correct format.
                  </p>
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Upload CSV File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {!file ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                          >
                            Choose CSV File
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Maximum file size: 5MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        {isProcessing && (
                          <div className="space-y-2">
                            <Progress value={50} className="w-full" />
                            <p className="text-sm text-muted-foreground">Processing file...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {parseResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {parseResult.validData.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Valid Records</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {parseResult.errors.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {parseResult.duplicates.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Duplicates</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {parseResult.totalRows}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Rows</div>
                    </CardContent>
                  </Card>
                </div>

                {parseResult.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Validation Errors ({parseResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {parseResult.errors.slice(0, 20).map((error, index) => (
                            <div key={index} className="text-sm p-2 bg-red-50 rounded">
                              <span className="font-medium">Row {error.row}:</span>{' '}
                              <span className="text-red-600">{error.message}</span>
                              {error.value && (
                                <span className="text-muted-foreground"> (Value: "{error.value}")</span>
                              )}
                            </div>
                          ))}
                          {parseResult.errors.length > 20 && (
                            <div className="text-sm text-muted-foreground">
                              ... and {parseResult.errors.length - 20} more errors
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {parseResult.duplicates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-yellow-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Duplicate Values ({parseResult.duplicates.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {parseResult.duplicates.slice(0, 10).map((duplicate, index) => (
                            <div key={index} className="text-sm p-2 bg-yellow-50 rounded">
                              <span className="font-medium">Row {duplicate.row}:</span>{' '}
                              {duplicate.field} "{duplicate.value}" already exists at row {duplicate.existingRow}
                            </div>
                          ))}
                          {parseResult.duplicates.length > 10 && (
                            <div className="text-sm text-muted-foreground">
                              ... and {parseResult.duplicates.length - 10} more duplicates
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {parseResult.validData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Valid Data Preview ({parseResult.validData.length} records)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {parseResult.validData.slice(0, 5).map((farmer, index) => (
                            <div key={index} className="text-sm p-3 bg-green-50 rounded border">
                              <div className="font-medium">{farmer.name}</div>
                              <div className="text-muted-foreground">
                                {farmer.mobile_number && `📱 ${farmer.mobile_number}`}
                                {farmer.village && ` • 📍 ${farmer.village}`}
                                {farmer.total_land_acres && ` • 🌾 ${farmer.total_land_acres} acres`}
                              </div>
                            </div>
                          ))}
                          {parseResult.validData.length > 5 && (
                            <div className="text-sm text-muted-foreground text-center py-2">
                              ... and {parseResult.validData.length - 5} more records
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            {parseResult && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You are about to import {parseResult.validData.length} farmer records. 
                    This action cannot be undone.
                  </AlertDescription>
                </Alert>

                {isImporting && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Import Progress</span>
                          <span className="text-sm text-muted-foreground">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="w-full" />
                        <p className="text-sm text-muted-foreground text-center">
                          Importing farmers data...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={isImporting || !parseResult?.validData.length}
                    className="min-w-[120px]"
                  >
                    {isImporting ? 'Importing...' : `Import ${parseResult?.validData.length} Records`}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
