interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Default: retry for network errors and 5xx errors
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') return true;
    if (error.message.includes('fetch') || error.message.includes('network')) return true;
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) return true;
    return false;
  },
};

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Check if we should retry this error
      if (!opts.shouldRetry(lastError)) {
        break;
      }
      
      // Call retry callback
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1);
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      
      // Add jitter (random factor between 0.5 and 1.5)
      const jitteredDelay = delay * (0.5 + Math.random());
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError;
}

export class RetryableError extends Error {
  constructor(message: string, public retryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof RetryableError) {
    return error.retryable;
  }
  
  // Network errors
  if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
    return true;
  }
  
  // Fetch errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return true;
  }
  
  // 5xx server errors
  if (error.message.includes('500') || error.message.includes('502') || 
      error.message.includes('503') || error.message.includes('504')) {
    return true;
  }
  
  // Rate limiting
  if (error.message.includes('429') || error.message.includes('rate limit')) {
    return true;
  }
  
  return false;
}

export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: Partial<RetryOptions> = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retryAsync(() => fn(...args), options);
  }) as T;
}