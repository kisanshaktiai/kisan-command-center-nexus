
// API Configuration
export const API_ENDPOINTS = {
  WEATHER: process.env.NODE_ENV === 'production' 
    ? 'https://api.openweathermap.org/data/2.5' 
    : 'https://api.openweathermap.org/data/2.5',
  SATELLITE: process.env.NODE_ENV === 'production'
    ? 'https://sentinel-hub.api.com'
    : 'https://sentinel-hub.api.com',
  MARKET_PRICES: process.env.NODE_ENV === 'production'
    ? 'https://api.data.gov.in/resource'
    : 'https://api.data.gov.in/resource',
} as const;

// Application Configuration
export const APP_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUPPORTED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  MAX_LANDS_PER_FARMER: 50,
  MAX_CROPS_PER_LAND: 10,
  PAGINATION_DEFAULT_SIZE: 20,
  SEARCH_DEBOUNCE_MS: 300,
} as const;

// Database Configuration
export const DB_CONFIG = {
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  QUERY_TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_SATELLITE_IMAGERY: true,
  ENABLE_AI_RECOMMENDATIONS: true,
  ENABLE_MARKETPLACE: true,
  ENABLE_MULTI_TENANT: true,
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_AREA_ACRES: 0.1,
  MAX_AREA_ACRES: 10000,
  PHONE_REGEX: /^[+]?[\d\s\-\(\)]{8,15}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  DATABASE_ERROR: 'Database operation failed. Please try again later.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_UPLOAD_ERROR: 'File upload failed. Please try again.',
  TENANT_DETECTION_ERROR: 'Unable to determine tenant context.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_SAVED: 'Data saved successfully.',
  FILE_UPLOADED: 'File uploaded successfully.',
  EMAIL_SENT: 'Email sent successfully.',
  OPERATION_COMPLETED: 'Operation completed successfully.',
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TENANT_TTL: 30 * 60 * 1000, // 30 minutes
  USER_DATA_TTL: 15 * 60 * 1000, // 15 minutes
  MARKET_PRICES_TTL: 60 * 60 * 1000, // 1 hour
  WEATHER_DATA_TTL: 10 * 60 * 1000, // 10 minutes
  SATELLITE_DATA_TTL: 24 * 60 * 60 * 1000, // 24 hours
} as const;
