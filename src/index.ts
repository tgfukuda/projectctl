#!/usr/bin/env ts-node
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

type Project = {
    urls: string[];
    workdir: string;
    apps: string[];
    browser?: keyof typeof BROWSERS;
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
            const browser = project.browser ?? "brave";
            pids.push(
                spawn(BROWSERS[browser],
                    [
                        browser === "brave" ? "--disable-brave-sync" : "",
                        browser === "safari" ? "" : "--new-window",
                        ...project.urls
                    ], { detached: true }).pid!
            );
        }

        // Extra apps
        for (const app of project.apps) {
            pids.push(spawn(app, [], { detached: true }).pid!);
        }

        await fs.writeFile(pidfile, pids.join(" "));
        console.log("Started:", projectName);
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
