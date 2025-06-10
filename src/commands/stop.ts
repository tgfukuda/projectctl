import { promises as fs } from 'fs';
import path from 'path';
import { CONFIG_PATHS, configManager } from '../config';
import logger from '../logger';
import { CommandOptions } from './types';

export async function stopProject(projectName: string, options: CommandOptions): Promise<void> {
  logger.info(`プロジェクト '${projectName}' の停止を開始`, { options });

  await configManager.autoLoadConfig();
  const pidFile = path.join(CONFIG_PATHS.pidDir, `${projectName}.pid`);

  try {
    const pid = parseInt(await fs.readFile(pidFile, 'utf8'));
    logger.debug(`プロセスを停止: PID ${pid}`, { force: options.force });
    process.kill(pid, options.force ? 'SIGKILL' : 'SIGTERM');
    await fs.unlink(pidFile);
    logger.info(`プロジェクト '${projectName}' を停止しました`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      logger.warn('PIDファイルが見つかりません。プロジェクトは既に停止している可能性があります。');
    } else {
      logger.error('プロジェクトの停止に失敗しました', { error });
      throw error;
    }
  }
}
