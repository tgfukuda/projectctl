#!/usr/bin/env ts-node
import { exec } from "child_process";
import { promises as fs } from "fs";
import process from "process";
import { setTimeout } from "timers/promises";

import { createBrowser } from "./browser";
import { Config, CONFIG_PATHS, ConfigManager, ProjectConfig } from "./config";
import { EditorType, openEditor } from "./editor";

async function main() {
    // コマンドライン引数を解析
    const [,, action, projectName] = process.argv;
    if (!action || !projectName) {
        console.error("使用法: projectctl {start|stop} <project>");
        process.exit(1);
    }

    try {
        // 設定ディレクトリを初期化
        await fs.mkdir(CONFIG_PATHS.pidDir, { recursive: true });

        // プロジェクト設定を読み込む
        const config = await ConfigManager.loadProjects();
        
        if (!config.projects || !config.projects[projectName]) {
            console.error(`プロジェクト '${projectName}' が見つかりません`);
            process.exit(1);
        }
        
        const project = config.projects[projectName];
        const globalConfig = config.global || {};

        if (action === "start") {
            await stopProject(projectName);
            await startProject(projectName, project, globalConfig);
        } else if (action === "stop") {
            await stopProject(projectName);
        } else {
            console.error("アクションは start または stop である必要があります");
            process.exit(1);
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
        process.exit(1);
    }
}

/**
 * プロジェクトを起動する
 */
async function startProject(
    projectName: string, 
    projectConfig: ProjectConfig,
    globalConfig: Config["global"]
) {
    const pids: number[] = [];
    
    // エディタを起動
    if (projectConfig.workdir) {
        const editorType = globalConfig?.editor as EditorType || "cursor";
        const editorPid = openEditor(projectConfig, projectName, editorType);
        if (editorPid) {
            pids.push(editorPid);
        }
    }
    
    // ブラウザを起動
    if (projectConfig.urls && projectConfig.urls.length > 0) {
        const browser = createBrowser(projectConfig, projectName);
        const browserPid = await browser.launch();
        if (browserPid) {
            pids.push(browserPid);
        }
    }
    
    // アプリケーションを起動
    if (projectConfig.apps && projectConfig.apps.length > 0) {
        const appPromises = projectConfig.apps.map(appCommand => {
            return new Promise<number>((resolve, reject) => {
                try {
                    console.log(`アプリを起動: ${appCommand}`);
                    const child = exec(appCommand);
                    
                    if (child.pid) {
                        pids.push(child.pid);
                        child.unref();
                        resolve(child.pid);
                    } else {
                        reject(new Error(`PIDの取得に失敗: ${appCommand}`));
                    }
                } catch (error) {
                    console.error(`アプリの起動に失敗: ${appCommand}`, error);
                    reject(error);
                }
            });
        });
        
        // すべてのアプリ起動処理の結果を待機
        (await Promise.allSettled(appPromises)).forEach(result => {
            if (result.status === "fulfilled") {
                console.log(`アプリが起動しました: PID ${result.value}`);
            } else {
                console.error(`アプリの起動に失敗しました: ${result.reason}`);
            }
        });
    }
    
    // PIDを保存
    if (pids.length > 0) {
        await ConfigManager.savePids(projectName, pids);
        console.log(`プロジェクト '${projectName}' を起動しました（PID: ${pids.join(', ')}）`);
    } else {
        console.warn(`プロジェクト '${projectName}' で起動したプロセスはありません`);
    }
    
    // 待機処理
    const wait = projectConfig.wait ?? globalConfig?.wait ?? 30;
    console.log(`アプリケーションの準備のため ${wait} 秒間待機中...`);
    await setTimeout(wait * 1000);
}

/**
 * プロジェクトを停止する
 */
async function stopProject(projectName: string) {
    try {
        // PIDファイルからプロセスIDを読み込む
        const pids = await ConfigManager.loadPids(projectName);
        
        if (pids.length === 0) {
            console.warn(`プロジェクト '${projectName}' の実行中プロセスが見つかりません`);
            return;
        }
        
        // 各プロセスを終了
        for (const pid of pids) {
            try {
                process.kill(pid, "SIGTERM");
                console.log(`プロセス ${pid} を終了しました`);
            } catch (error) {
                if (error instanceof Error && error.message.includes('ESRCH')) {
                    console.warn(`プロセス ${pid} は既に終了しています`);
                } else {
                    console.error(`プロセス ${pid} の終了中にエラーが発生しました:`, error);
                }
            }
        }
        
        // PIDファイルを削除
        const pidFile = ConfigManager.getPidFilePath(projectName);
        await fs.unlink(pidFile);
        console.log(`プロジェクト '${projectName}' を停止しました`);
    } catch (error) {
        if (error instanceof Error && error.message.includes("ENOENT")) {
            console.warn("PIDファイルが見つかりません。プロジェクトは既に停止している可能性があります。");
        } else {
            throw error;
        }
    }
}

// メインエントリーポイント
if (require.main === module) {
    main().catch(console.error);
}
