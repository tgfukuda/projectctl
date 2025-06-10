import * as yaml from 'js-yaml';
import { configManager } from '../config';
import logger from '../logger';
import { CommandOptions } from './types';

export async function listProjects(options: CommandOptions): Promise<void> {
  logger.info('プロジェクト一覧の取得を開始', { options });

  await configManager.autoLoadConfig();
  const config = configManager.getAll();
  const projects = config.projects;

  if (Object.keys(projects).length === 0) {
    logger.info('プロジェクトが登録されていません');
    return;
  }

  if (options.status) {
    logger.debug('プロジェクトの実行状態を確認');
    // TODO: プロジェクトの実行状態を確認
    logger.warn('実行状態の確認機能は未実装です');
  }

  logger.debug('プロジェクト一覧を表示', { projects });
  console.log(yaml.dump(projects));
}
