
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download, 
  Trash2, 
  AlertTriangle,
  Clock,
  Eye
} from 'lucide-react';
import { useLegalDocuments } from '@/hooks/useLegalDocuments';
import { 
  DOCUMENT_TYPE_CONFIGS, 
  LegalDocumentType, 
  getDocumentTypeConfig,
  getVerificationStatusColor,
  getVerificationStatusLabel
} from '@/types/legalDocuments';

interface LegalDocumentUploadProps {
  tenantId: string;
  onDocumentsChange?: (documentsCount: number, requiredCompleted: number) => void;
}

export const LegalDocumentUpload: React.FC<LegalDocumentUploadProps> = ({
  tenantId,
  onDocumentsChange
}) => {
  const [selectedDocumentType, setSelectedDocumentType] = useState<LegalDocumentType | ''>('');
  const [customDocumentName, setCustomDocumentName] = useState('');
  const [draggedFile, setDraggedFile] = useState<File | null>(null);

  const {
    documents,
    isLoading,
    uploadDocument,
    isUploading,
    deleteDocument,
    isDeleting,
    downloadDocument
  } = useLegalDocuments(tenantId);

  React.useEffect(() => {
    if (onDocumentsChange) {
      const requiredDocs = DOCUMENT_TYPE_CONFIGS.filter(config => config.isRequired);
      const uploadedRequiredDocs = documents.filter(doc => 
        DOCUMENT_TYPE_CONFIGS.find(config => 
          config.type === doc.document_type && config.isRequired
        )
      );
      onDocumentsChange(documents.length, uploadedRequiredDocs.length);
    }
  }, [documents, onDocumentsChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setDraggedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = () => {
    if (!draggedFile || !selectedDocumentType) return;

    const documentName = customDocumentName.trim() || draggedFile.name;
    
    uploadDocument({
      tenantId,
      file: draggedFile,
      documentType: selectedDocumentType,
      documentName
    });

    // Reset form
    setDraggedFile(null);
    setSelectedDocumentType('');
    setCustomDocumentName('');
  };

  const getUploadedDocumentTypes = () => {
    return documents.map(doc => doc.document_type);
  };

  const getAvailableDocumentTypes = () => {
    const uploadedTypes = getUploadedDocumentTypes();
    return DOCUMENT_TYPE_CONFIGS.filter(config => 
      !uploadedTypes.includes(config.type)
    );
  };

  const getRequiredDocumentsStatus = () => {
    const requiredConfigs = DOCUMENT_TYPE_CONFIGS.filter(config => config.isRequired);
    const uploadedRequired = documents.filter(doc => 
      requiredConfigs.some(config => 
        config.type === doc.document_type && 
        (doc.verification_status === 'approved' || doc.verification_status === 'pending' || doc.verification_status === 'under_review')
      )
    );
    
    return {
      total: requiredConfigs.length,
      completed: uploadedRequired.length,
      isComplete: uploadedRequired.length === requiredConfigs.length
    };
  };

  const requiredStatus = getRequiredDocumentsStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Legal Documents</CardTitle>
          <CardDescription>Loading documents...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Legal Documents Upload
          </CardTitle>
          <CardDescription>
            Upload required legal documents for verification. All documents must be in PDF format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${requiredStatus.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium">
                Required Documents: {requiredStatus.completed}/{requiredStatus.total}
              </span>
            </div>
            <Badge variant={requiredStatus.isComplete ? 'default' : 'secondary'}>
              {requiredStatus.isComplete ? 'Complete' : 'Incomplete'}
            </Badge>
          </div>
          
          {!requiredStatus.isComplete && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please upload all required documents to proceed with the onboarding process.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      {getAvailableDocumentTypes().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={selectedDocumentType}
                onValueChange={(value) => setSelectedDocumentType(value as LegalDocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableDocumentTypes().map((config) => (
                    <SelectItem key={config.type} value={config.type}>
                      <div className="flex items-center gap-2">
                        <span>{config.label}</span>
                        {config.isRequired && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDocumentType && (
                <p className="text-sm text-muted-foreground mt-1">
                  {getDocumentTypeConfig(selectedDocumentType)?.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="documentName">Document Name (Optional)</Label>
              <Input
                id="documentName"
                value={customDocumentName}
                onChange={(e) => setCustomDocumentName(e.target.value)}
                placeholder="Enter custom document name"
              />
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300 hover:border-primary'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {draggedFile ? (
                <div>
                  <p className="text-lg font-medium">{draggedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(draggedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a PDF file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to select a file (Max 10MB)
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!draggedFile || !selectedDocumentType || isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              View and manage your uploaded legal documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((document) => {
                const config = getDocumentTypeConfig(document.document_type);
                const statusColor = getVerificationStatusColor(document.verification_status);
                const statusLabel = getVerificationStatusLabel(document.verification_status);

                return (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium">{document.document_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {config?.label} • {(document.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${statusColor}`}>
                            {document.verification_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {document.verification_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {document.verification_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {document.verification_status === 'under_review' && <Eye className="w-3 h-3 mr-1" />}
                            {statusLabel}
                          </Badge>
                          {config?.isRequired && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {document.rejection_reason && (
                          <Alert className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              <strong>Rejection Reason:</strong> {document.rejection_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(document)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDocument(document.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
