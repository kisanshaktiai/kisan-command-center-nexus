
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, FileText, Info } from 'lucide-react';
import { LegalDocumentUpload } from '@/components/legal-documents/LegalDocumentUpload';
import { DOCUMENT_TYPE_CONFIGS } from '@/types/legalDocuments';

interface LegalDocumentsStepProps {
  tenantId: string;
  onComplete: (data: any) => void;
  data: any;
  onDataChange: (data: any) => void;
}

export const LegalDocumentsStep: React.FC<LegalDocumentsStepProps> = ({
  tenantId,
  onComplete,
  data,
  onDataChange
}) => {
  const [documentsStatus, setDocumentsStatus] = useState({
    totalDocuments: 0,
    requiredCompleted: 0,
    totalRequired: DOCUMENT_TYPE_CONFIGS.filter(config => config.isRequired).length
  });

  const handleDocumentsChange = (totalDocuments: number, requiredCompleted: number) => {
    const newStatus = {
      totalDocuments,
      requiredCompleted,
      totalRequired: DOCUMENT_TYPE_CONFIGS.filter(config => config.isRequired).length
    };
    setDocumentsStatus(newStatus);
    
    // Update parent component data
    onDataChange({
      ...data,
      legalDocuments: {
        totalDocuments,
        requiredCompleted,
        totalRequired: newStatus.totalRequired,
        isComplete: requiredCompleted === newStatus.totalRequired
      }
    });
  };

  const isComplete = documentsStatus.requiredCompleted === documentsStatus.totalRequired;
  const canProceed = isComplete;

  const handleSubmit = () => {
    if (!canProceed) return;

    onComplete({
      ...data,
      legalDocuments: {
        ...documentsStatus,
        isComplete: true,
        completedAt: new Date().toISOString()
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Legal Documents Verification</h3>
        <p className="text-muted-foreground">
          Upload required legal documents for business verification and compliance
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Upload Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div>
                <p className="font-medium">
                  Required Documents: {documentsStatus.requiredCompleted}/{documentsStatus.totalRequired}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Documents: {documentsStatus.totalDocuments}
                </p>
              </div>
            </div>
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {isComplete ? (
                <><CheckCircle className="w-3 h-3 mr-1" />Complete</>
              ) : (
                <><AlertTriangle className="w-3 h-3 mr-1" />Incomplete</>
              )}
            </Badge>
          </div>

          {!isComplete && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please upload all required documents to proceed. Documents will be reviewed by our team within 24-48 hours.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Required Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents Checklist</CardTitle>
          <CardDescription>
            The following documents are mandatory for business verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPE_CONFIGS.filter(config => config.isRequired).map((config) => (
              <div key={config.type} className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium">{config.label}</p>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Component */}
      <LegalDocumentUpload
        tenantId={tenantId}
        onDocumentsChange={handleDocumentsChange}
      />

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Document Requirements</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                <li>All documents must be in PDF format</li>
                <li>Maximum file size: 10MB per document</li>
                <li>Documents should be clear and readable</li>
                <li>Ensure all information is visible and not cut off</li>
              </ul>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Verification Process</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                <li>Documents will be reviewed within 24-48 hours</li>
                <li>You will be notified via email about the verification status</li>
                <li>Rejected documents can be re-uploaded with corrections</li>
                <li>Your account will be activated after successful verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSubmit}
          disabled={!canProceed}
          className="min-w-[200px]"
        >
          {canProceed ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Document Upload
            </>
          ) : (
            'Upload Required Documents'
          )}
        </Button>
      </div>
    </div>
  );
};
