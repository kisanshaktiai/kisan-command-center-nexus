
import { toast } from "@/hooks/use-toast";

export interface FarmerCSVRow {
  name?: string;
  mobile_number?: string;
  email?: string;
  aadhaar_number?: string;
  village?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  total_land_acres?: string;
  farming_experience_years?: string;
  primary_crops?: string;
  annual_income_range?: string;
  has_irrigation?: string;
  irrigation_type?: string;
  has_tractor?: string;
  has_storage?: string;
  has_loan?: string;
  loan_amount?: string;
}

export interface ParsedFarmerData {
  name: string;
  mobile_number?: string;
  email?: string;
  aadhaar_number?: string;
  village?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  total_land_acres?: number;
  farming_experience_years?: number;
  primary_crops?: string[];
  annual_income_range?: string;
  has_irrigation?: boolean;
  irrigation_type?: string;
  has_tractor?: boolean;
  has_storage?: boolean;
  has_loan?: boolean;
  loan_amount?: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface CSVParseResult {
  validData: ParsedFarmerData[];
  errors: ValidationError[];
  duplicates: Array<{ row: number; field: string; value: string; existingRow: number }>;
  totalRows: number;
}

const REQUIRED_FIELDS = ['name'];
const OPTIONAL_FIELDS = [
  'mobile_number', 'email', 'aadhaar_number', 'village', 'district', 'state',
  'pin_code', 'total_land_acres', 'farming_experience_years', 'primary_crops',
  'annual_income_range', 'has_irrigation', 'irrigation_type', 'has_tractor',
  'has_storage', 'has_loan', 'loan_amount'
];

export function parseCSVContent(csvContent: string): FarmerCSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows: FarmerCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: FarmerCSVRow = {};
    
    headers.forEach((header, index) => {
      if (values[index] && values[index].trim()) {
        row[header as keyof FarmerCSVRow] = values[index].trim();
      }
    });
    
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function validateAndTransformFarmerData(
  csvRows: FarmerCSVRow[]
): CSVParseResult {
  const validData: ParsedFarmerData[] = [];
  const errors: ValidationError[] = [];
  const duplicates: Array<{ row: number; field: string; value: string; existingRow: number }> = [];
  const seenValues = new Map<string, number>();

  csvRows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because CSV is 1-indexed and we skip header
    const validationErrors = validateFarmerRow(row, rowNumber);
    
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      return;
    }

    // Check for duplicates
    const duplicateChecks = checkForDuplicates(row, rowNumber, seenValues);
    if (duplicateChecks.length > 0) {
      duplicates.push(...duplicateChecks);
    }

    // Transform and add to valid data
    try {
      const transformedData = transformFarmerRow(row);
      validData.push(transformedData);
      
      // Track values for duplicate detection
      if (row.mobile_number) {
        seenValues.set(`mobile_${row.mobile_number}`, rowNumber);
      }
      if (row.email) {
        seenValues.set(`email_${row.email}`, rowNumber);
      }
      if (row.aadhaar_number) {
        seenValues.set(`aadhaar_${row.aadhaar_number}`, rowNumber);
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'general',
        message: `Failed to transform data: ${error.message}`
      });
    }
  });

  return {
    validData,
    errors,
    duplicates,
    totalRows: csvRows.length
  };
}

function validateFarmerRow(row: FarmerCSVRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    if (!row[field as keyof FarmerCSVRow]?.trim()) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field} is required`
      });
    }
  });

  // Validate mobile number format
  if (row.mobile_number && !/^[6-9]\d{9}$/.test(row.mobile_number.replace(/\D/g, ''))) {
    errors.push({
      row: rowNumber,
      field: 'mobile_number',
      message: 'Mobile number must be a valid 10-digit Indian mobile number',
      value: row.mobile_number
    });
  }

  // Validate email format
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      message: 'Email must be in valid format',
      value: row.email
    });
  }

  // Validate Aadhaar number format
  if (row.aadhaar_number && !/^\d{12}$/.test(row.aadhaar_number.replace(/\D/g, ''))) {
    errors.push({
      row: rowNumber,
      field: 'aadhaar_number',
      message: 'Aadhaar number must be 12 digits',
      value: row.aadhaar_number
    });
  }

  // Validate numeric fields
  if (row.total_land_acres && (isNaN(Number(row.total_land_acres)) || Number(row.total_land_acres) < 0)) {
    errors.push({
      row: rowNumber,
      field: 'total_land_acres',
      message: 'Total land acres must be a positive number',
      value: row.total_land_acres
    });
  }

  if (row.farming_experience_years && (isNaN(Number(row.farming_experience_years)) || Number(row.farming_experience_years) < 0)) {
    errors.push({
      row: rowNumber,
      field: 'farming_experience_years',
      message: 'Farming experience years must be a positive number',
      value: row.farming_experience_years
    });
  }

  if (row.loan_amount && (isNaN(Number(row.loan_amount)) || Number(row.loan_amount) < 0)) {
    errors.push({
      row: rowNumber,
      field: 'loan_amount',
      message: 'Loan amount must be a positive number',
      value: row.loan_amount
    });
  }

  return errors;
}

function checkForDuplicates(
  row: FarmerCSVRow,
  rowNumber: number,
  seenValues: Map<string, number>
): Array<{ row: number; field: string; value: string; existingRow: number }> {
  const duplicates = [];

  if (row.mobile_number) {
    const key = `mobile_${row.mobile_number}`;
    const existingRow = seenValues.get(key);
    if (existingRow) {
      duplicates.push({
        row: rowNumber,
        field: 'mobile_number',
        value: row.mobile_number,
        existingRow
      });
    }
  }

  if (row.email) {
    const key = `email_${row.email}`;
    const existingRow = seenValues.get(key);
    if (existingRow) {
      duplicates.push({
        row: rowNumber,
        field: 'email',
        value: row.email,
        existingRow
      });
    }
  }

  if (row.aadhaar_number) {
    const key = `aadhaar_${row.aadhaar_number}`;
    const existingRow = seenValues.get(key);
    if (existingRow) {
      duplicates.push({
        row: rowNumber,
        field: 'aadhaar_number',
        value: row.aadhaar_number,
        existingRow
      });
    }
  }

  return duplicates;
}

function transformFarmerRow(row: FarmerCSVRow): ParsedFarmerData {
  const transformed: ParsedFarmerData = {
    name: row.name!.trim(),
  };

  // Transform optional fields
  if (row.mobile_number) {
    transformed.mobile_number = row.mobile_number.replace(/\D/g, '');
  }

  if (row.email) {
    transformed.email = row.email.toLowerCase().trim();
  }

  if (row.aadhaar_number) {
    transformed.aadhaar_number = row.aadhaar_number.replace(/\D/g, '');
  }

  if (row.village) transformed.village = row.village.trim();
  if (row.district) transformed.district = row.district.trim();
  if (row.state) transformed.state = row.state.trim();
  if (row.pin_code) transformed.pin_code = row.pin_code.trim();

  if (row.total_land_acres) {
    transformed.total_land_acres = Number(row.total_land_acres);
  }

  if (row.farming_experience_years) {
    transformed.farming_experience_years = Number(row.farming_experience_years);
  }

  if (row.primary_crops) {
    transformed.primary_crops = row.primary_crops
      .split(',')
      .map(crop => crop.trim())
      .filter(crop => crop.length > 0);
  }

  if (row.annual_income_range) {
    transformed.annual_income_range = row.annual_income_range.trim();
  }

  if (row.irrigation_type) {
    transformed.irrigation_type = row.irrigation_type.trim();
  }

  if (row.loan_amount) {
    transformed.loan_amount = Number(row.loan_amount);
  }

  // Transform boolean fields
  transformed.has_irrigation = parseBooleanField(row.has_irrigation);
  transformed.has_tractor = parseBooleanField(row.has_tractor);
  transformed.has_storage = parseBooleanField(row.has_storage);
  transformed.has_loan = parseBooleanField(row.has_loan);

  return transformed;
}

function parseBooleanField(value?: string): boolean {
  if (!value) return false;
  const normalizedValue = value.toLowerCase().trim();
  return ['true', 'yes', '1', 'y'].includes(normalizedValue);
}

export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'mobile_number',
    'email',
    'aadhaar_number',
    'village',
    'district',
    'state',
    'pin_code',
    'total_land_acres',
    'farming_experience_years',
    'primary_crops',
    'annual_income_range',
    'has_irrigation',
    'irrigation_type',
    'has_tractor',
    'has_storage',
    'has_loan',
    'loan_amount'
  ];

  const sampleRow = [
    'Rajesh Kumar',
    '9876543210',
    'rajesh@example.com',
    '123456789012',
    'Rampur',
    'Sitapur',
    'Uttar Pradesh',
    '261001',
    '5.5',
    '15',
    'wheat,rice,sugarcane',
    '2-5 lakhs',
    'true',
    'drip',
    'true',
    'false',
    'true',
    '50000'
  ];

  return [headers.join(','), sampleRow.join(',')].join('\n');
}
