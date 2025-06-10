import { exec } from 'child_process';
import { setTimeout } from 'timers/promises';
import { createBrowser } from '../browser';
import { configManager } from '../config';
import { EditorType, openEditor } from '../editor';
import logger from '../logger';
import { withProgress } from '../utils/progress';
import { CommandOptions } from './types';

export async function startProject(projectName: string, options: CommandOptions): Promise<void> {
  return withProgress(`プロジェクト '${projectName}' を起動中...`, async () => {
    logger.info(`プロジェクト '${projectName}' の起動を開始`, { options });

    await configManager.autoLoadConfig();
    const config = configManager.getAll();
    const project = config.projects[projectName];
    const globalConfig = config.global || {};

    if (!project) {
      logger.error(`プロジェクト '${projectName}' が見つかりません`);
      throw new Error(`プロジェクト '${projectName}' が見つかりません`);
    }

    const pids: number[] = [];

    // エディタを起動
    if (project.workdir) {
      const editorType = (globalConfig?.editor as EditorType) || 'cursor';
      logger.debug(`エディタを起動: ${editorType}`, { workdir: project.workdir });
      const editorPid = openEditor(project, projectName, editorType);
      if (editorPid) {
        pids.push(editorPid);
        logger.debug(`エディタのPID: ${editorPid}`);
      }
    }

    // ブラウザを起動
    if (project.urls && project.urls.length > 0) {
      logger.debug('ブラウザを起動', { urls: project.urls });
      const browser = createBrowser(project, projectName);
      const browserPid = await browser.launch();
      if (browserPid) {
        pids.push(browserPid);
        logger.debug(`ブラウザのPID: ${browserPid}`);
      }
    }

    // アプリケーションを起動
    if (project.apps && project.apps.length > 0) {
      logger.debug('アプリケーションを起動', { apps: project.apps });
      const appPromises = project.apps.map((appCommand) => {
        return new Promise<number>((resolve, reject) => {
          try {
            logger.info(`アプリを起動: ${appCommand}`);
            const [command, ...args] = appCommand.split(' ');
            const child = exec(`${command} ${args.join(' ')}`);

            if (child.pid) {
              pids.push(child.pid);
              child.unref();
              logger.debug(`アプリのPID: ${child.pid}`);
              resolve(child.pid);
            } else {
              logger.error(`PIDの取得に失敗: ${appCommand}`);
              reject(new Error(`PIDの取得に失敗: ${appCommand}`));
            }
          } catch (error) {
            logger.error(`アプリの起動に失敗: ${appCommand}`, { error });
            reject(error);
          }
        });
      });

      const results = await Promise.allSettled(appPromises);
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          logger.info(`アプリが起動しました: PID ${result.value}`);
        } else {
          logger.error(`アプリの起動に失敗しました: ${result.reason}`);
        }
      });
    }

    // 待機処理
    const wait = project.wait ?? globalConfig?.wait ?? 30;
    logger.info(`アプリケーションの準備のため ${wait} 秒間待機中...`);
    await setTimeout(wait * 1000);

    logger.info(`プロジェクト '${projectName}' を起動しました`, { pids });
  });
}
