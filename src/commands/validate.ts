import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { configManager } from '../config';
import logger from '../logger';
import { withProgress } from '../utils/progress';
import { CommandOptions } from './types';

export async function validateConfig(options: CommandOptions): Promise<void> {
  return withProgress('設定ファイルを検証中...', async () => {
    logger.info('設定ファイルの検証を開始', { options });

    await configManager.autoLoadConfig();
    const configPath = options.file || path.join(os.homedir(), '.projectctl', 'projects.yaml');

    try {
      if (!(await fs.stat(configPath)).isFile()) {
        logger.error(`設定ファイルが見つかりません: ${configPath}`);
        throw new Error(`設定ファイルが見つかりません: ${configPath}`);
      }

      // 設定ファイルを読み込んでバリデーション
      await configManager.loadFromYaml(configPath);
      logger.info('設定ファイルは有効です');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('設定ファイルの検証に失敗しました', { error: error.message });
      } else {
        logger.error('設定ファイルの検証に失敗しました', { error });
      }
      process.exit(1);
    }
  });
}
