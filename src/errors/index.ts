export class ProjectError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ProjectError';
  }
}

export class ConfigError extends ProjectError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class BrowserError extends ProjectError {
  constructor(message: string, details?: any) {
    super(message, 'BROWSER_ERROR', details);
    this.name = 'BrowserError';
  }
}

export class ProcessError extends ProjectError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESS_ERROR', details);
    this.name = 'ProcessError';
  }
} 