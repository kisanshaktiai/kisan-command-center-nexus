
export type LegalDocumentType = 
  | 'incorporation_certificate'
  | 'gst_certificate'
  | 'pan_card'
  | 'address_proof'
  | 'bank_statement'
  | 'trade_license'
  | 'msme_certificate'
  | 'other';

export type VerificationStatus = 
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface LegalDocument {
  id: string;
  tenant_id: string;
  document_type: LegalDocumentType;
  document_name: string;
  original_filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  verification_status: VerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  is_required: boolean;
  upload_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DocumentTypeConfig {
  type: LegalDocumentType;
  label: string;
  description: string;
  isRequired: boolean;
  maxSizeMB: number;
  uploadOrder: number;
  exampleFormats?: string[];
}

export const DOCUMENT_TYPE_CONFIGS: DocumentTypeConfig[] = [
  {
    type: 'incorporation_certificate',
    label: 'Certificate of Incorporation',
    description: 'Company registration certificate from ROC',
    isRequired: true,
    maxSizeMB: 5,
    uploadOrder: 1
  },
  {
    type: 'gst_certificate',
    label: 'GST Registration Certificate',
    description: 'Valid GST registration certificate',
    isRequired: true,
    maxSizeMB: 5,
    uploadOrder: 2
  },
  {
    type: 'pan_card',
    label: 'PAN Card',
    description: 'Company PAN card copy',
    isRequired: true,
    maxSizeMB: 2,
    uploadOrder: 3
  },
  {
    type: 'address_proof',
    label: 'Address Proof',
    description: 'Registered office address proof (Utility bill, lease agreement)',
    isRequired: true,
    maxSizeMB: 5,
    uploadOrder: 4
  },
  {
    type: 'bank_statement',
    label: 'Bank Statement',
    description: 'Latest 3 months bank statement',
    isRequired: false,
    maxSizeMB: 10,
    uploadOrder: 5
  },
  {
    type: 'trade_license',
    label: 'Trade License',
    description: 'Valid trade license (if applicable)',
    isRequired: false,
    maxSizeMB: 5,
    uploadOrder: 6
  },
  {
    type: 'msme_certificate',
    label: 'MSME Certificate',
    description: 'MSME registration certificate (if applicable)',
    isRequired: false,
    maxSizeMB: 5,
    uploadOrder: 7
  }
];

export const getDocumentTypeConfig = (type: LegalDocumentType): DocumentTypeConfig | undefined => {
  return DOCUMENT_TYPE_CONFIGS.find(config => config.type === type);
};

export const getVerificationStatusColor = (status: VerificationStatus): string => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'under_review':
      return 'text-blue-600 bg-blue-50';
    case 'approved':
      return 'text-green-600 bg-green-50';
    case 'rejected':
      return 'text-red-600 bg-red-50';
    case 'expired':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getVerificationStatusLabel = (status: VerificationStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'under_review':
      return 'Under Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
};
