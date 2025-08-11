
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  RefreshCw,
  Users,
  Building,
  Loader2
} from 'lucide-react';
import { useLeadConversionValidator } from '@/hooks/useLeadConversionValidator';
import type { Lead } from '@/types/leads';
import type { ConversionValidationResult } from '@/services/LeadConversionValidator';

interface LeadConversionValidatorProps {
  className?: string;
}

export const LeadConversionValidator: React.FC<LeadConversionValidatorProps> = ({ className }) => {
  const {
    isValidating,
    isFixing,
    validationResults,
    validateAllConvertedLeads,
    fixLeadConversion,
    bulkFixLeads,
    clearValidationResults
  } = useLeadConversionValidator();

  const handleValidateAll = async () => {
    try {
      await validateAllConvertedLeads();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFixLead = async (
    lead: Lead, 
    validation: ConversionValidationResult, 
    action: 'revert_status' | 'retry_conversion'
  ) => {
    try {
      await fixLeadConversion(lead, validation, action);
    } catch (error) {
      console.error('Fix failed:', error);
    }
  };

  const handleBulkFix = async (action: 'revert_status' | 'retry_conversion') => {
    const leadsToFix = validationResults.filter(({ validation }) => 
      validation.recommendedAction === action
    );
    
    if (leadsToFix.length === 0) return;

    try {
      await bulkFixLeads(leadsToFix, action);
    } catch (error) {
      console.error('Bulk fix failed:', error);
    }
  };

  const getValidationIcon = (validation: ConversionValidationResult) => {
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getRecommendationBadge = (action: ConversionValidationResult['recommendedAction']) => {
    switch (action) {
      case 'revert_status':
        return <Badge variant="destructive">Revert Status</Badge>;
      case 'retry_conversion':
        return <Badge variant="secondary">Retry Conversion</Badge>;
      case 'manual_intervention':
        return <Badge variant="outline">Manual Intervention</Badge>;
      default:
        return <Badge variant="default">No Action</Badge>;
    }
  };

  const revertCandidates = validationResults.filter(({ validation }) => 
    validation.recommendedAction === 'revert_status'
  );
  
  const retryCandidates = validationResults.filter(({ validation }) => 
    validation.recommendedAction === 'retry_conversion'
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Lead Conversion Validator
          </CardTitle>
          <CardDescription>
            Validate converted leads and fix any issues with incomplete tenant creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleValidateAll}
              disabled={isValidating}
              className="flex items-center gap-2"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Validate All Converted Leads
            </Button>
            
            {validationResults.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearValidationResults}
                className="flex items-center gap-2"
              >
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Apply fixes to multiple leads at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {revertCandidates.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => handleBulkFix('revert_status')}
                  disabled={isFixing}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revert {revertCandidates.length} Lead{revertCandidates.length !== 1 ? 's' : ''}
                </Button>
              )}
              
              {retryCandidates.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => handleBulkFix('retry_conversion')}
                  disabled={isFixing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Mark {retryCandidates.length} for Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Found {validationResults.length} Invalid Converted Lead{validationResults.length !== 1 ? 's' : ''}
          </h3>
          
          {validationResults.map(({ lead, validation }) => (
            <Card key={lead.id} className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getValidationIcon(validation)}
                    <div>
                      <CardTitle className="text-base">{lead.contact_name}</CardTitle>
                      <CardDescription>{lead.email}</CardDescription>
                    </div>
                  </div>
                  {getRecommendationBadge(validation.recommendedAction)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Status Indicators */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="text-sm">
                      Tenant: {validation.tenantExists ? (
                        <span className="text-green-600">Exists</span>
                      ) : (
                        <span className="text-red-600">Missing</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Active: {validation.tenantActive ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      Admin: {validation.adminUserExists ? (
                        <span className="text-green-600">Found</span>
                      ) : (
                        <span className="text-red-600">Missing</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Issues */}
                {validation.issues.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-medium">Issues found:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validation.issues.map((issue, index) => (
                            <li key={index} className="text-sm">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {validation.recommendedAction === 'revert_status' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleFixLead(lead, validation, 'revert_status')}
                      disabled={isFixing}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Revert to Qualified
                    </Button>
                  )}
                  
                  {validation.recommendedAction === 'retry_conversion' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleFixLead(lead, validation, 'retry_conversion')}
                      disabled={isFixing}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Mark for Retry
                    </Button>
                  )}
                  
                  {validation.recommendedAction === 'manual_intervention' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Manual Intervention Required
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isValidating && validationResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
            <p className="text-muted-foreground">
              Click "Validate All Converted Leads" to check for conversion issues
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
