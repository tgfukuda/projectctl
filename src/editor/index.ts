import { spawn } from 'child_process';
import os from 'os';
import { ProjectConfig } from '../config';
import logger from '../logger';

// エディタの種類を定義
export type EditorType = 'cursor' | 'vscode' | 'sublime' | 'atom' | 'vim' | 'emacs';

// エディタコマンドのマッピング
export const EDITOR_COMMANDS: Record<EditorType, string> = {
  cursor: 'cursor',
  vscode: 'code',
  sublime: 'subl',
  atom: 'atom',
  vim: 'vim',
  emacs: 'emacs',
};

// 抽象エディタクラス
export abstract class BaseEditor {
  protected projectConfig: ProjectConfig;
  protected projectName: string;

  constructor(projectConfig: ProjectConfig, projectName: string) {
    this.projectConfig = projectConfig;
    this.projectName = projectName;
  }

  abstract getEditorType(): EditorType;
  abstract getEditorCommand(): string;
  abstract getEditorArgs(workdir: string): string[];

  /**
   * エディタを起動する
   * @returns 起動したプロセスのPID
   */
  launch(): number | undefined {
    if (!this.projectConfig.workdir) {
      logger.error(`プロジェクト ${this.projectName} にworkdirが設定されていません`);
      return undefined;
    }

    const workdir = this.projectConfig.workdir.replace('~', os.homedir());
    logger.debug(`${this.getEditorCommand()} ${this.getEditorArgs(workdir).join(' ')}`);
    const editorProcess = spawn(this.getEditorCommand(), this.getEditorArgs(workdir), {
      detached: true,
      stdio: 'ignore',
    });

    if (editorProcess.pid) {
      logger.info(`${this.getEditorType()} エディタを起動しました: ${workdir}`);
      editorProcess.unref();
      return editorProcess.pid;
    }

    logger.error(`${this.getEditorType()} エディタの起動に失敗しました`);
    return undefined;
  }
}

// Cursor エディタクラス
export class CursorEditor extends BaseEditor {
  getEditorType(): EditorType {
    return 'cursor';
  }

  getEditorCommand(): string {
    return EDITOR_COMMANDS[this.getEditorType()];
  }

  getEditorArgs(workdir: string): string[] {
    return [workdir];
  }
}

// VSCode エディタクラス
export class VSCodeEditor extends BaseEditor {
  getEditorType(): EditorType {
    return 'vscode';
  }

  getEditorCommand(): string {
    return EDITOR_COMMANDS[this.getEditorType()];
  }

  getEditorArgs(workdir: string): string[] {
    return [workdir];
  }
}

// エディタファクトリ関数
export function createEditor(
  projectConfig: ProjectConfig,
  projectName: string,
  editorType: EditorType = 'cursor'
): BaseEditor {
  switch (editorType) {
    case 'cursor':
      return new CursorEditor(projectConfig, projectName);
    case 'vscode':
      return new VSCodeEditor(projectConfig, projectName);
    // 他のエディタは必要に応じて実装
    default:
      return new CursorEditor(projectConfig, projectName);
  }
}

// エディタユーティリティ関数
export function openEditor(
  projectConfig: ProjectConfig,
  projectName: string,
  editorType?: EditorType
): number | undefined {
  const editor = createEditor(projectConfig, projectName, editorType);
  return editor.launch();
}
