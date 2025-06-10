import { exec } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { configManager } from '../config';
import logger from '../logger';
import { CommandOptions } from './types';

export async function editConfig(options: CommandOptions): Promise<void> {
  logger.info('設定ファイルの編集を開始', { options });

  await configManager.autoLoadConfig();
  const configPath = options.file || path.join(os.homedir(), '.projectctl', 'projects.yaml');

  try {
    // 設定ファイルが存在しない場合は新規作成
    if (!(await fs.stat(configPath)).isFile()) {
      logger.info('設定ファイルが存在しないため、新規作成します', { path: configPath });
      await configManager.saveToYaml(configPath);
    }

    // デフォルトエディタで開く
    const editor = process.env.EDITOR || 'nano';
    logger.debug(`エディタを起動: ${editor}`, { path: configPath });
    exec(`${editor} ${configPath}`);
  } catch (error) {
    logger.error('設定ファイルの編集に失敗しました', { error });
    throw new Error(`設定ファイルの編集に失敗しました: ${error}`);
  }
}
