import { spawn } from 'child_process';
import { ProjectConfig } from '../config';

export const BROWSER_TYPES = [
  'brave',
  'chrome',
  'firefox',
  'safari',
  'edge',
  'opera',
  'vivaldi',
] as const;
export type BrowserType = (typeof BROWSER_TYPES)[number];

export const BROWSER_COMMANDS: Record<BrowserType, string> = {
  brave: 'brave-browser',
  chrome: 'google-chrome',
  firefox: 'firefox',
  safari: 'safari',
  edge: 'microsoft-edge',
  opera: 'opera',
  vivaldi: 'vivaldi',
};

export abstract class BaseBrowser {
  protected project: ProjectConfig;
  protected projectName: string;
  protected profile?: string;

  constructor(project: ProjectConfig, projectName: string, profile?: string) {
    this.project = project;
    this.projectName = projectName;
    this.profile = profile;
  }

  abstract getBrowserType(): BrowserType;
  abstract getBrowserCommand(): string;

  abstract getProfileOptions(): string[];
  abstract getCleanSessionOptions(): string[];
  abstract getRestoreSessionOptions(): string[];

  // セッション動作に基づいて引数を取得（非同期メソッドに変更）
  async getSessionArgs(): Promise<string[]> {
    // 2回目以降は設定に基づいてセッション動作を決定
    const tabBehavior = this.project.tabBehavior ?? 'restore';

    if (tabBehavior === 'clean') {
      return this.getCleanSessionOptions();
    } else {
      // restore
      return this.getRestoreSessionOptions();
    }
  }

  // ブラウザ起動用の引数をすべて取得（非同期メソッドに変更）
  async getBrowserArgs(): Promise<string[]> {
    const profileOptions = this.getProfileOptions();
    const sessionOptions = await this.getSessionArgs();

    return [
      // 基本オプション
      '--new-window',
      // プロファイルオプション
      ...profileOptions,
      // セッションオプション
      ...sessionOptions,
    ].filter(Boolean);
  }

  // 開くURLを決定
  async getUrlsToOpen(): Promise<string[]> {
    let urlsToOpen = [...(this.project.urls || [])];

    if (this.project.tabBehavior === 'restore') {
      urlsToOpen = []; // プロファイルが存在し、セッションを復元する場合はURLを開かない
    }

    return urlsToOpen;
  }

  // ブラウザを起動（メソッド修正）
  async launch(): Promise<number | undefined> {
    if (!this.project.urls || this.project.urls.length === 0) {
      return undefined;
    }

    const browserArgs = await this.getBrowserArgs(); // 非同期メソッド呼び出しに変更
    const urlsToOpen = await this.getUrlsToOpen();

    const browserProcess = spawn(this.getBrowserCommand(), [...browserArgs, ...urlsToOpen], {
      detached: true,
      stdio: 'ignore',
    });

    if (browserProcess.pid) {
      browserProcess.unref();
      return browserProcess.pid;
    }

    return undefined;
  }
}
