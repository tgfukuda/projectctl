#!/usr/bin/env ts-node
import { exec, spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { setTimeout } from "timers/promises";

type Project = {
    urls: string[];
    workdir: string;
    apps: string[];
    browser?: keyof typeof BROWSERS;
    tabBehavior?: "restore" | "clean";
    wait?: number; // in seconds
};

const BROWSERS = {
    "brave": "brave-browser",
    "chrome": "google-chrome",
    "firefox": "firefox",
    "safari": "safari",
    "edge": "microsoft-edge",
    "opera": "opera",
    "vivaldi": "vivaldi"
} as const;

async function main() {
    const PID_DIR = path.join(os.homedir(), ".cache/projectctl");
    await fs.mkdir(PID_DIR, { recursive: true });

    const [,, action, projectName] = process.argv;
    if (!action || !projectName) {
        console.error("Usage: projectctl {start|stop} <project>");
        process.exit(1);
    }

    const projects: Record<string, Project> = JSON.parse(
        await fs.readFile(path.join(__dirname, "..", ".projectctl", "projects.json"), "utf8")
    );

    const project = projects[projectName];
    if (!project) {
        console.error(`Project '${projectName}' not found.`);
        process.exit(1);
    }
    const pidfile = path.join(PID_DIR, `${projectName}.pids`);

    if (action === "start") {
        const pids: number[] = [];

        if (project.workdir) {
            pids.push(
                spawn("cursor", [project.workdir.replace("~", os.homedir())], { detached: true }).pid!
            );
        }

        if (project.urls.length > 0) {
            const profileDir = path.join(os.homedir(), ".cache/projectctl", projectName);
            const browser = project.browser ?? "brave";
            
            const browserArgs = [
                browser === "brave" ? "--disable-brave-sync" : "",
                browser === "safari" ? "" : "--new-window",
                browser === "chrome" || browser === "brave" ? `--user-data-dir=${profileDir}` : "",
            ];

            const tabBehavior = project.tabBehavior ?? "restore";
            
            if (tabBehavior === "clean") {
                if (browser === "firefox") {
                    browserArgs.push("--new-instance");
                } else if (browser === "chrome" || browser === "brave" || browser === "edge") {
                    browserArgs.push("--no-restore-session-state");
                } else if (browser === "opera" || browser === "vivaldi") {
                    browserArgs.push("--no-session-restore");
                }
            } else if (tabBehavior === "restore") {
                if (browser === "firefox") {
                    browserArgs.push("--restore-last-session");
                } else if (browser === "chrome" || browser === "brave" || browser === "edge") {
                    browserArgs.push("--restore-last-session");
                } else if (browser === "opera" || browser === "vivaldi") {
                    browserArgs.push("--session-restore");
                }
            }
            
            let urlsToOpen = [...project.urls];
            try {
                const profileExists = await fs.access(profileDir).then(() => true).catch(() => false);
                
                if (tabBehavior === "restore" && profileExists) {
                    urlsToOpen = [];
                }
            } catch (error) {
                console.warn(`Failed to check profile directory: ${error}`);
            }
            
            const browserProcess = spawn(BROWSERS[browser], [...browserArgs, ...urlsToOpen], { 
                detached: true,
                stdio: 'ignore'
            });
            
            if (browserProcess.pid) {
                pids.push(browserProcess.pid);
                browserProcess.unref();
            }
        }

        if (project.apps.length > 0) {
            const appPromises = project.apps.map(appCommand => {
                return new Promise<number>((resolve, reject) => {
                    try {
                        console.log(`Starting app: ${appCommand}`);
                        const child = exec(appCommand);
                        
                        if (child.pid) {
                            pids.push(child.pid);
                            child.unref();
                            resolve(child.pid);
                        } else {
                            reject(new Error(`Failed to get PID for: ${appCommand}`));
                        }
                    } catch (error) {
                        console.error(`Failed to start app: ${appCommand}`, error);
                        reject(error);
                    }
                });
            });
            
            (await Promise.allSettled(appPromises)).forEach(result => {
                if (result.status === "fulfilled") {
                    console.log(`App started: ${result.value}`);
                } else {
                    console.error(`App failed to start: ${result.reason}`);
                }
            });
        }

        await fs.writeFile(pidfile, pids.join("\n"), "utf8");
        console.log("Started:", projectName);

        const wait = project.wait ?? 30;
        console.log("Waiting for", wait, "seconds for the app to be ready...");
        await setTimeout(wait * 1000);
        process.exit(0);
    } else if (action === "stop") {
        try {
            const data = await fs.readFile(pidfile, "utf8");
            for (const pid of data.split(/\s+/).filter(Boolean)) {
                try {
                    process.kill(Number(pid), "SIGTERM");
                } catch (killErr) {
                    if (killErr instanceof Error && killErr.message.includes('ESRCH')) {
                        console.warn(`Process ID ${pid} is already stopped`);
                    } else {
                        throw killErr;
                    }
                }
            }
            await fs.unlink(pidfile);
            console.log("Stopped:", projectName);
        } catch (err) {
            if (err instanceof Error && err.message.includes("No such file or directory")) {
                console.warn("pidfile not found; already stopped?");
            } else {
                throw err;
            }
        }
    } else {
        console.error("Action must be start or stop");
    }
}

if (require.main === module) {
    main().catch(console.error);
}
