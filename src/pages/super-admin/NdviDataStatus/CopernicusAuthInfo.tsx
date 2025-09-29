import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CopernicusAuthInfo() {
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <InfoIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Copernicus Authentication Required</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-blue-800">
          To download actual satellite data from Copernicus Dataspace, authentication is required.
        </p>
        
        <div className="space-y-2">
          <p className="font-medium text-blue-900">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Register for a free account at Copernicus Dataspace</li>
            <li>Obtain your OAuth2 credentials (Client ID and Secret)</li>
            <li>Add the credentials as Supabase secrets:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>COPERNICUS_CLIENT_ID</li>
                <li>COPERNICUS_CLIENT_SECRET</li>
              </ul>
            </li>
            <li>The system will automatically authenticate when downloading</li>
          </ol>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://dataspace.copernicus.eu/account/register" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Register Account
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://documentation.dataspace.copernicus.eu/APIs/OData.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              API Documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Current Status:</strong> The system is configured to simulate downloads. 
            When Copernicus credentials are added, it will automatically switch to downloading real data.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}