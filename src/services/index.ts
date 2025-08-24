
// Core services
export { BaseService, type ServiceResult } from './BaseService';

// Error handling services
export { 
  ErrorProcessor, 
  type ErrorContext, 
  type ErrorInfo,
  errorProcessor 
} from './core/ErrorProcessor';

export { 
  UserMessageService,
  userMessageService 
} from './core/UserMessageService';

export { 
  ErrorLoggingService,
  errorLoggingService 
} from './core/ErrorLoggingService';

export { 
  UnifiedErrorService,
  type ErrorHandlingOptions,
  type ErrorResult,
  unifiedErrorService 
} from './core/UnifiedErrorService';
