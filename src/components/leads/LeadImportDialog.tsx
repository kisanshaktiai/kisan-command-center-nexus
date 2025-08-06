
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  X
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNotifications } from '@/hooks/useNotifications';

interface LeadImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

export const LeadImportDialog: React.FC<LeadImportDialogProps> = ({
  open,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { showSuccess, showError } = useNotifications();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setImportResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate import process
      const formData = new FormData();
      formData.append('file', file);

      // Mock progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        setImportProgress(progress);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Mock import result
      const result: ImportResult = {
        total: 150,
        successful: 142,
        failed: 8,
        errors: [
          'Row 5: Invalid email format',
          'Row 12: Missing required field: contact_name',
          'Row 23: Duplicate email address',
          'Row 45: Invalid phone number format',
          'Row 67: Organization name too long',
          'Row 89: Invalid priority value',
          'Row 101: Missing email address',
          'Row 134: Invalid source format'
        ]
      };

      setImportResult(result);
      
      if (result.failed === 0) {
        showSuccess(`Successfully imported ${result.successful} leads`);
      } else {
        showError(`Imported ${result.successful} leads, ${result.failed} failed`, {
          description: 'Some leads could not be imported due to validation errors.'
        });
      }
    } catch (error) {
      showError('Import failed', {
        description: 'Please check your file format and try again.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setImportProgress(0);
    setIsImporting(false);
    onClose();
  };

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `contact_name,email,phone,organization_name,source,priority,notes
John Smith,john.smith@example.com,+1-555-0123,Acme Corp,Website,high,Interested in premium plan
Jane Doe,jane.doe@example.com,+1-555-0124,Tech Solutions,Referral,medium,Looking for basic features
Mike Johnson,mike.j@example.com,+1-555-0125,StartupXYZ,Social Media,low,Early stage startup`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="lead-import-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads
          </DialogTitle>
          <DialogDescription id="lead-import-desc">
            Upload a CSV or Excel file to import multiple leads at once. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult && (
            <>
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Need a template?</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Download our CSV template with the correct format and sample data.
                    </p>
                  </div>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload File</Label>
                <div
                  {...getRootProps()}
                  className={`
                    mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  <input {...getInputProps()} />
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag and drop your file here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports CSV, Excel (.xlsx, .xls) files up to 10MB
                      </p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Import Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Import Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultSource">Default Source</Label>
                    <Input
                      id="defaultSource"
                      placeholder="e.g., Import, Manual Upload"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultPriority">Default Priority</Label>
                    <select 
                      id="defaultPriority"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="importNotes">Import Notes</Label>
                  <Textarea
                    id="importNotes"
                    placeholder="Optional notes to add to all imported leads..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Import Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importing leads...</span>
                    <span className="text-sm text-gray-600">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}
            </>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Import Complete</h3>
                <p className="text-gray-600 mt-2">
                  Processed {importResult.total} leads from your file
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {importResult.successful}
                  </div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">
                    {importResult.failed}
                  </div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Import Errors
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
              >
                {isImporting ? 'Importing...' : 'Import Leads'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
