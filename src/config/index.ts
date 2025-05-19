import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { BrowserType } from "../browser";
import { EditorType } from "../editor";
export type TabBehavior = "restore" | "clean";

export type LogLevel = "debug" | "info" | "warn" | "error";

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
    'global'?: {
        browser?: BrowserType;
        editor?: EditorType;
        tabBehavior?: TabBehavior;
        wait?: number; // 秒単位
        reuseLogin?: boolean;
        profileBaseDir?: string;
        pidDir?: string;
        defaultApps?: string[];
        logLevel?: LogLevel;
    },
    projects: {
        [projectName: string]: ProjectConfig;
    }
}

export const CONFIG_PATHS = {
    projectsFile: path.join(process.cwd(), ".projectctl", "projects.json"),
    pidDir: path.join(os.homedir(), ".cache/projectctl"),
    profileBaseDir: path.join(os.homedir(), ".cache/projectctl")
};

export const CONFIG_DEFAULTS = {
    browser: "brave" as BrowserType,
    tabBehavior: "restore" as TabBehavior,
    wait: 30,
    reuseLogin: true
};

export class ConfigManager {
    /**
     * プロジェクト設定をロードする
     * @returns 全プロジェクトの設定
     */
    static async loadProjects(): Promise<Config> {
        try {
            const content = await fs.readFile(CONFIG_PATHS.projectsFile, "utf8");
            return JSON.parse(content);
        } catch (error) {
            console.error(`Failed to load projects: ${error}`);
            return { projects: {} };
        }
    }

    /**
     * 特定のプロジェクト設定を取得する
     * @param projectName プロジェクト名
     * @returns プロジェクト設定（存在しない場合はundefined）
     */
    static async getProject(projectName: string): Promise<ProjectConfig | undefined> {
        const projects = await this.loadProjects();
        return projects.projects[projectName];
    }

    /**
     * PIDファイルのパスを取得する
     * @param projectName プロジェクト名
     * @returns PIDファイルのパス
     */
    static getPidFilePath(projectName: string): string {
        return path.join(CONFIG_PATHS.pidDir, `${projectName}.pids`);
    }

    /**
     * プロジェクトのプロファイルディレクトリを取得する
     * @param projectName プロジェクト名
     * @returns プロファイルディレクトリのパス
     */
    static getProfileDir(projectName: string): string {
        return path.join(CONFIG_PATHS.profileBaseDir, projectName);
    }

    /**
     * PIDファイルを作成する
     * @param projectName プロジェクト名
     * @param pids PIDの配列
     */
    static async savePids(projectName: string, pids: number[]): Promise<void> {
        await fs.mkdir(CONFIG_PATHS.pidDir, { recursive: true });
        const pidFile = this.getPidFilePath(projectName);
        await fs.writeFile(pidFile, pids.join("\n"), "utf8");
    }

    /**
     * PIDファイルからPIDを読み込む
     * @param projectName プロジェクト名
     * @returns PIDの配列
     */
    static async loadPids(projectName: string): Promise<number[]> {
        try {
            const pidFile = this.getPidFilePath(projectName);
            const content = await fs.readFile(pidFile, "utf8");
            return content
                .split("\n")
                .filter(Boolean)
                .map(pid => parseInt(pid, 10));
        } catch (error) {
            return [];
        }
    }
}
