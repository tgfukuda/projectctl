import { BaseBrowser, BROWSER_COMMANDS, BrowserType } from './BaseBrowser';

export class ChromeBrowser extends BaseBrowser {
  getBrowserType(): BrowserType {
    return 'chrome';
  }

  getBrowserCommand(): string {
    return BROWSER_COMMANDS[this.getBrowserType()];
  }

  getProfileOptions(): string[] {
    return [];
  }

  getCleanSessionOptions(): string[] {
    return ['--no-restore-session-state'];
  }

  getRestoreSessionOptions(): string[] {
    return ['--restore-last-session'];
  }
}
