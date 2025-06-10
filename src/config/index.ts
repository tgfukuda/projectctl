import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import os from 'os';
import path from 'path';
import { BROWSER_TYPES, BrowserType } from '../browser';
import { EditorType } from '../editor';
import logger from '../logger';
import { withProgress } from '../utils/progress';

export type TabBehavior = 'restore' | 'clean';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type ProjectConfig = {
  urls: string[];
  workdir: string;
  apps: string[];
  browser?: BrowserType;
  tabBehavior?: TabBehavior;
  wait?: number; // 秒単位
  reuseLogin?: boolean;
};

export interface Config {
  global?: {
    browser?: BrowserType;
    editor?: EditorType;
    tabBehavior?: TabBehavior;
    wait?: number; // 秒単位
    reuseLogin?: boolean;
    profileBaseDir?: string;
    pidDir?: string;
    defaultApps?: string[];
    logLevel?: LogLevel;
  };
  projects: {
    [projectName: string]: ProjectConfig;
  };
}

export const CONFIG_PATHS = {
  projectsFile: path.join(process.cwd(), '.projectctl', 'projects.json'),
  pidDir: path.join(os.homedir(), '.cache/projectctl'),
  profileBaseDir: path.join(os.homedir(), '.cache/projectctl'),
};

// 設定バリデーションエラークラス
class ConfigValidationError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigManager {
  private config: Config = {
    projects: {},
  };
  private configPath: string | null = null;

  constructor() {
    // デフォルトのコンフィグは空
  }

  private async validateConfig(rawConfig: any, filePath: string): Promise<void> {
    if (!rawConfig || typeof rawConfig !== 'object') {
      throw new ConfigValidationError('無効な設定ファイル形式です');
    }

    // プロジェクト設定のバリデーション
    const validationErrors: string[] = [];

    if ('projects' in rawConfig) {
      if (!Array.isArray(rawConfig.projects)) {
        throw new ConfigValidationError('projects フィールドは配列である必要があります');
      }

      // 各プロジェクトをバリデーションして変換
      rawConfig.projects = rawConfig.projects.reduce(
        (acc: Record<string, ProjectConfig>, projectRaw: any, index: number) => {
          try {
            const project = this.validateProjectConfig(projectRaw);
            acc[projectRaw.name] = project;
            return acc;
          } catch (err) {
            if (err instanceof ConfigValidationError) {
              validationErrors.push(`プロジェクト #${index + 1}: ${err.message}`);
            }
            throw err;
          }
        },
        {}
      );
    }

    // エラーがあればまとめて報告
    if (validationErrors.length > 0) {
      throw new ConfigValidationError('設定のバリデーションで問題が見つかりました', {
        errors: validationErrors,
      });
    }

    this.config = rawConfig as Config;
    this.configPath = filePath;
  }

  async loadFromJson(filePath: string): Promise<void> {
    if (!(await fs.stat(filePath)).isFile()) {
      throw new Error(`設定ファイルが見つかりません: ${filePath}`);
    }

    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      const rawConfig = JSON.parse(fileContents);

      if (!rawConfig || typeof rawConfig !== 'object') {
        throw new ConfigValidationError('無効なJSON設定ファイル形式です');
      }

      await this.validateConfig(rawConfig, filePath);
      logger.info(`JSONファイルから設定を読み込みました: ${filePath}`);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw error; // バリデーションエラーはそのまま再スロー
      } else {
        throw new Error(
          `JSON設定ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * YAMLファイルから設定を読み込み、バリデーションを実行
   * エラーが発生した場合は例外をスロー
   */
  async loadFromYaml(filePath: string): Promise<void> {
    if (!(await fs.stat(filePath)).isFile()) {
      logger.error(`設定ファイルが見つかりません: ${filePath}`);
      throw new Error(`設定ファイルが見つかりません: ${filePath}`);
    }

    try {
      const fileContents = await fs.readFile(filePath, 'utf8');
      const rawConfig = yaml.load(fileContents);
      await this.validateConfig(rawConfig, filePath);
      logger.info(`YAMLファイルから設定を読み込みました: ${filePath}`);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        logger.error('設定のバリデーションに失敗しました', { error });
        throw error;
      } else {
        logger.error('YAML設定ファイルの読み込みに失敗しました', { error });
        throw new Error(
          `YAML設定ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * デフォルトのProjectConfig設定を返す
   */
  private getDefaultConfig(): ProjectConfig {
    return {
      urls: [],
      workdir: '',
      apps: [],
      browser: 'brave',
      tabBehavior: 'restore',
      wait: 30,
      reuseLogin: true,
    };
  }

  /**
   * コマンドがシステムにインストールされているか確認
   */
  private isCommandExecutable(command: string): boolean {
    // コマンドの最初の部分（空白の前）を取得
    const commandName = command.split(' ')[0];

    if (commandName.includes('projectctl')) {
      // 自分自身は除外
      return false;
    }

    try {
      const platform = process.platform;
      if (platform === 'win32') {
        // Windowsの場合はwhereコマンドを使用
        execSync(`where ${commandName}`, { stdio: 'ignore' });
      } else {
        // Linux/Macの場合はwhichコマンドを使用
        execSync(`which ${commandName}`, { stdio: 'ignore' });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 設定オブジェクトをProjectConfig型に適合するようにバリデーション
   * バリデーションエラーがある場合は例外をスロー
   */
  private validateProjectConfig(raw: any): ProjectConfig {
    if (!raw || typeof raw !== 'object') {
      throw new ConfigValidationError('プロジェクト設定はオブジェクトである必要があります');
    }

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    const project = this.getDefaultConfig();

    if (raw.name === '' || raw.name === undefined || typeof raw.name !== 'string') {
      throw new ConfigValidationError('プロジェクト名が指定されていません');
    }

    // urls（文字列配列）
    if (raw.urls !== undefined) {
      if (!Array.isArray(raw.urls)) {
        validationErrors.push('urls は配列である必要があります');
      } else {
        const invalidUrls = raw.urls.filter((url: any) => typeof url !== 'string');
        if (invalidUrls.length > 0) {
          validationErrors.push('urls には文字列のみ含めることができます');
        } else {
          project.urls = raw.urls;
        }
      }
    }

    // workdir（文字列）
    if (raw.workdir !== undefined) {
      if (typeof raw.workdir !== 'string') {
        validationErrors.push('workdir は文字列である必要があります');
      } else {
        project.workdir = raw.workdir;
      }
    }

    // apps（文字列配列）とコマンドの存在確認
    if (raw.apps !== undefined) {
      if (!Array.isArray(raw.apps)) {
        validationErrors.push('apps は配列である必要があります');
      } else {
        const invalidApps = raw.apps.filter((app: any) => typeof app !== 'string');
        if (invalidApps.length > 0) {
          validationErrors.push('apps には文字列のみ含めることができます');
        } else {
          // 文字列の配列として有効なので、コマンドの存在を確認
          const notInstalledApps: string[] = [];
          const executableApps: string[] = [];

          for (const app of raw.apps) {
            // コマンド名の最初の部分を抽出（引数を除く）
            const commandName = app.split(' ')[0];

            if (!this.isCommandExecutable(commandName)) {
              notInstalledApps.push(commandName);
            } else {
              executableApps.push(app);
            }
          }

          if (notInstalledApps.length > 0) {
            validationWarnings.push(
              `以下のコマンドがシステムにインストールされていません: ${notInstalledApps.join(', ')}`
            );
          }

          project.apps = executableApps;
        }
      }
    }

    // browser（文字列）
    if (raw.browser !== undefined) {
      if (typeof raw.browser !== 'string') {
        validationErrors.push('browser は文字列である必要があります');
      } else {
        if (!BROWSER_TYPES.includes(raw.browser as BrowserType)) {
          validationErrors.push('browser は有効なブラウザ名である必要があります');
        } else {
          project.browser = raw.browser as BrowserType;
        }
      }
    }

    // tabBehavior（"restore" | "clean"）
    if (raw.tabBehavior !== undefined) {
      if (typeof raw.tabBehavior !== 'string') {
        validationErrors.push('tabBehavior は文字列である必要があります');
      } else if (raw.tabBehavior !== 'restore' && raw.tabBehavior !== 'clean') {
        validationErrors.push('tabBehavior は "restore" または "clean" である必要があります');
      } else {
        project.tabBehavior = raw.tabBehavior as TabBehavior;
      }
    }

    // wait（数値）
    if (raw.wait !== undefined) {
      const waitValue = Number(raw.wait);
      if (isNaN(waitValue)) {
        validationErrors.push('wait は数値である必要があります');
      } else if (waitValue < 1000) {
        validationWarnings.push('waitはms単位の指定です');
      } else {
        project.wait = waitValue;
      }
    }

    // reuseLogin（真偽値）
    if (raw.reuseLogin !== undefined) {
      if (typeof raw.reuseLogin !== 'boolean') {
        validationErrors.push('reuseLogin は真偽値である必要があります');
      } else {
        project.reuseLogin = raw.reuseLogin;
      }
    }

    // エラーがあれば例外をスロー
    if (validationErrors.length > 0) {
      throw new ConfigValidationError('プロジェクト設定のバリデーションで問題が見つかりました', {
        errors: validationErrors,
        warnings: validationWarnings,
      });
    }

    // 警告があれば表示
    if (validationWarnings.length > 0) {
      logger.warn('設定のバリデーションで警告が見つかりました:');
      validationWarnings.forEach((warning, i) => {
        logger.warn(`  ${i + 1}. ${warning}`);
      });
    }

    return project;
  }

  async saveToJson(filePath?: string): Promise<boolean> {
    const outputPath = filePath || this.configPath;
    if (!outputPath) {
      logger.error('保存先のパスが指定されていません');
      return false;
    }

    try {
      const jsonString = JSON.stringify(this.config, null, 2);
      await fs.writeFile(outputPath, jsonString, 'utf8');
      logger.info(`設定をJSONファイルに保存しました: ${outputPath}`);
      return true;
    } catch (error) {
      logger.error('JSON設定ファイルの保存に失敗しました', { error });
      throw error;
    }
  }

  /**
   * YAML形式で設定を保存する
   */
  async saveToYaml(filePath?: string): Promise<boolean> {
    const outputPath = filePath || this.configPath;
    if (!outputPath) {
      logger.error('保存先のパスが指定されていません');
      return false;
    }

    try {
      const yamlString = yaml.dump(this.config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });

      await fs.writeFile(outputPath, yamlString, 'utf8');
      logger.info(`設定をYAMLファイルに保存しました: ${outputPath}`);
      return true;
    } catch (error) {
      logger.error('YAML設定ファイルの保存に失敗しました', { error });
      return false;
    }
  }

  private async checkFileStats(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  private async getExtension(filePath: string): Promise<string> {
    const ext = path.extname(filePath);
    return ext.slice(1);
  }

  /**
   * 設定ファイルを自動検出して読み込む
   */
  async autoLoadConfig(): Promise<boolean> {
    return withProgress('設定ファイルを検索中...\n', async () => {
      const searchPaths = [
        process.cwd(),
        path.join(process.cwd(), '.projectctl'),
        path.join(os.homedir(), '.projectctl'),
      ];

      const configFileNames = ['projects.yaml', 'projects.yml', 'projects.json'];

      for (const dir of searchPaths) {
        for (const fileName of configFileNames) {
          const fullPath = path.join(dir, fileName);
          if (await this.checkFileStats(fullPath)) {
            const ext = await this.getExtension(fullPath);
            logger.debug(`設定ファイルを検出: ${fullPath}`);
            if (ext === 'yaml' || ext === 'yml') {
              await this.loadFromYaml(fullPath);
            } else if (ext === 'json') {
              await this.loadFromJson(fullPath);
            }
            return true;
          }
        }
      }

      logger.warn('設定ファイルが見つかりませんでした');
      return false;
    });
  }

  /**
   * 現在の設定全体を取得
   */
  getAll(): Config {
    return { ...this.config };
  }
}

// シングルトンインスタンスをエクスポート
export const configManager = new ConfigManager();
