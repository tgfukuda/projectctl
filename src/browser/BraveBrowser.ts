import { BaseBrowser, BROWSER_COMMANDS, BrowserType } from "./BaseBrowser";

export class BraveBrowser extends BaseBrowser {
    getBrowserType(): BrowserType {
        return "brave";
    }
    
    getBrowserCommand(): string {
        return BROWSER_COMMANDS[this.getBrowserType()];
    }
    
    getProfileOptions(): string[] {
        return this.profile ? [`--profile-directory=${this.profile}`] : [];
    }
    
    getCleanSessionOptions(): string[] {
        /* タブは復元しない / Cookie は残る */
        return ["--no-restore-session-state"];
    }
    
    getRestoreSessionOptions(): string[] {
        return ["--restore-last-session"];
    }
} 