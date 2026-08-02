import { Sandbox } from "@vercel/sandbox";
import { Question } from '../models/questions.model.js';
import { stitchCode } from '../utils/codeStitcher.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
const exec = promisify(execCb);

// In-memory sandbox pool for reuse in a single server process
// Value shape: { sandbox: SandboxInstance, lastUsed: epochMs, createdAt: epochMs }
const sandboxPool = new Map();

// Eviction: stop sandboxes idle longer than SANDBOX_IDLE_TIMEOUT_MINUTES (default 10m)
const SANDBOX_IDLE_TIMEOUT_MINUTES = Number(process.env.SANDBOX_IDLE_TIMEOUT_MINUTES) || 10;
const SANDBOX_EVICTION_INTERVAL_MS = 60 * 1000; // run every minute

const startSandboxEviction = () => {
    setInterval(async () => {
        try {
            const now = Date.now();
            for (const [name, meta] of sandboxPool.entries()) {
                const idleMs = now - (meta.lastUsed || meta.createdAt || now);
                if (idleMs > SANDBOX_IDLE_TIMEOUT_MINUTES * 60 * 1000) {
                    try {
                        console.log(`Evicting sandbox ${name} after ${Math.round(idleMs/1000)}s idle`);
                        await meta.sandbox.stop();
                    } catch (stopErr) {
                        console.error(`Failed to stop sandbox ${name}:`, stopErr);
                    }
                    sandboxPool.delete(name);
                }
            }
        } catch (err) {
            console.error('Sandbox eviction job error:', err);
        }
    }, SANDBOX_EVICTION_INTERVAL_MS);
};

// Start eviction loop once
startSandboxEviction();

export const sendToJudge = async (questionId, userCode, languageId, langSlug, testCases = null, sessionId = null, evaluateAll = false) => {
    try {
        const question = await Question.findById(questionId);
        if (!question) throw new Error("Question not found in database.");

        const stitchedCode = stitchCode(userCode, langSlug, question.metaData);
        // file extension map for local stitched file
        const extMap = { javascript: 'js', python: 'py', python3: 'py', c: 'c', cpp: 'cpp', java: 'java' };
        
        const testCasesToRun = evaluateAll ? question.allTestCases : (Array.isArray(testCases) && testCases.length ? testCases : [question.allTestCases[0]]);

        // Dev-friendly fallback: allow running locally when USE_LOCAL_JUDGE=true
        if (process.env.USE_LOCAL_JUDGE === 'true') {
            return await runLocally(stitchedCode, langSlug, testCasesToRun[0]?.input || "", testCasesToRun[0]?.output || "");
        }

        // If not using local runner and no OIDC token is available in non-prod, fail fast
        if (!process.env.VERCEL_OIDC_TOKEN && process.env.NODE_ENV !== 'production') {
            throw new Error("Vercel OIDC token missing. Link the project (npx vercel link) and pull env (npx vercel env pull .env.local), or set USE_LOCAL_JUDGE=true for local runs.");
        }

        // Create an identifier for this execution; prefer sessionId (gameId) when provided
        const execId = crypto.randomUUID();
        const sandboxName = sessionId ? `coderush-engine-${sessionId}` : `coderush-engine-${execId}`;

        // Reuse sandbox from pool if available (avoids repeated create/delete)
        let sandbox = null;
        if (sessionId && sandboxPool.has(sandboxName)) {
            const meta = sandboxPool.get(sandboxName);
            sandbox = meta.sandbox;
            // update lastUsed
            meta.lastUsed = Date.now();
        } else {
            try {
                sandbox = await Sandbox.create({ name: sandboxName });
            } catch (err) {
                // If a sandbox with this name already exists on Vercel, try to resume it
                try {
                    if (typeof Sandbox.get === 'function') {
                        sandbox = await Sandbox.get(sandboxName);
                    } else {
                        // Fallback: try creating without throwing (some SDKs accept resume flag)
                        sandbox = await Sandbox.create({ name: sandboxName, resume: true });
                    }
                } catch (err2) {
                    // Re-throw original error if resume failed
                    throw err;
                }
            }

            if (sessionId && sandbox) sandboxPool.set(sandboxName, { sandbox, lastUsed: Date.now(), createdAt: Date.now() });
        }

        try {
            // Check if compilers are installed, install if missing
            const checkCompilers = await sandbox.runCommand({ cmd: "sh", args: ["-c", "which g++"] });
            if (checkCompilers.exitCode !== 0) {
                console.log("Installing compilers (First run only)...");
                await sandbox.runCommand({
                    cmd: "dnf",
                    args: ["install", "-y", "gcc", "gcc-c++", "java-17-amazon-corretto-devel"],
                    sudo: true
                });
            }

            // Create isolated workspace (use same execId as the sandbox name)
            const workDir = `/tmp/exec_${execId}`;
            await sandbox.runCommand({ cmd: "sh", args: ["-c", `mkdir -p ${workDir}`] });

            // Ensure inputs are strings before encoding to avoid Buffer.from(undefined)
            const safeCode = typeof stitchedCode === 'string' ? stitchedCode : String(stitchedCode);
            const encodedCode = Buffer.from(safeCode).toString("base64");

            // Write stitched code to a local temporary file for debugging/inspection
            try {
                const ext = extMap[langSlug] || 'txt';
                const localPath = path.join(os.tmpdir(), `stitched_${execId}.${ext}`);
                await fs.writeFile(localPath, safeCode, 'utf8');
                console.log(`Stitched code written to: ${localPath}`);
                // Removed console.log of preview to prevent terminal clutter
            } catch (writeErr) {
                console.error('Failed to write stitched code to local temp file:', writeErr);
            }

            const fileMap = {
                'javascript': 'main.js',
                'python': 'main.py',
                'python3': 'main.py',
                'c': 'main.c',
                'cpp': 'main.cpp',
                'java': 'Main.java'
            };

            const fileName = fileMap[langSlug];
            if (!fileName) throw new Error(`Language ${langSlug} is not supported.`);

            await sandbox.runCommand({ cmd: "sh", args: ["-c", `echo ${encodedCode} | base64 -d > ${workDir}/${fileName}`] });

            let execCmdStr = "";

            if (langSlug === 'c') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && gcc ${fileName} -o main`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), "");
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            }
            else if (langSlug === 'cpp') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && g++ ${fileName} -o main`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), "");
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            }
            else if (langSlug === 'java') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && javac ${fileName}`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), "");
                execCmdStr = `cd ${workDir} && java Main < input.txt`;
            }
            else if (langSlug === 'javascript') {
                execCmdStr = `cd ${workDir} && node ${fileName} < input.txt`;
            }
            else if (langSlug === 'python' || langSlug === 'python3') {
                execCmdStr = `cd ${workDir} && python3 ${fileName} < input.txt`;
            }

            let lastResult = null;
            for (let i = 0; i < testCasesToRun.length; i++) {
                const tc = testCasesToRun[i];
                const stdin = tc.input || "";
                const expectedOutput = tc.output || "";
                const encodedInput = Buffer.from(stdin).toString("base64");
                
                await sandbox.runCommand({ cmd: "sh", args: ["-c", `echo ${encodedInput} | base64 -d > ${workDir}/input.txt`] });
                const execCmd = await sandbox.runCommand({ cmd: "sh", args: ["-c", execCmdStr] });

                const stdout = await execCmd.stdout();
                const stderr = await execCmd.stderr();

                const actualOutput = (stdout || '').trim();
                const expectedSafe = (expectedOutput || '').trim();
                const passed = actualOutput === expectedSafe;

                const result = formatResponse(
                    passed ? "Accepted" : (execCmd.exitCode !== 0 ? "Runtime Error" : "Wrong Answer"), 
                    actualOutput, 
                    stderr.trim(), 
                    expectedOutput
                );

                if (result.status !== "Accepted") {
                    await sandbox.runCommand({ cmd: "sh", args: ["-c", `rm -rf ${workDir}`] });
                    return result;
                }
                lastResult = result;
            }

            await sandbox.runCommand({ cmd: "sh", args: ["-c", `rm -rf ${workDir}`] });
            return lastResult || formatResponse("Accepted", "", "", "");

        } finally {
            // If sandbox is pooled (per-session), don't stop it — just update lastUsed.
            try {
                if (sessionId && sandboxPool.has(sandboxName)) {
                    const meta = sandboxPool.get(sandboxName);
                    meta.lastUsed = Date.now();
                } else {
                    // Stop the sandbox to trigger the filesystem snapshot automatically
                    await sandbox.stop();
                }
            } catch (stopErr) {
                console.error('Error while finalizing sandbox:', stopErr);
            }
        }

    } catch (error) {
        console.error("Sandbox Execution Error:", error);
        throw error;
    }
};

const formatStderr = (stderr) => {
    if (!stderr || typeof stderr !== 'string') return stderr || "";
    
    let lines = stderr.split('\n');
    let filteredLines = [];
    
    for (let line of lines) {
        if (line.trim().startsWith('at ') && line.includes('node:')) continue;
        if (line.trim().startsWith('Node.js v')) continue;
        filteredLines.push(line);
    }
    
    let cleaned = filteredLines.join('\n');
    cleaned = cleaned.replace(/(?:[a-zA-Z]:)?[\\/]+(?:[\w.-]+[\\/]+)*(?:coderush_)?exec_[a-zA-Z0-9-]+[\\/]+([a-zA-Z0-9_.]+):(\d+)/g, 'Line $2');
    cleaned = cleaned.replace(/(?:[a-zA-Z]:)?[\\/]+(?:[\w.-]+[\\/]+)*(?:coderush_)?exec_[a-zA-Z0-9-]+[\\/]+([a-zA-Z0-9_.]+)/g, '$1');
    
    return cleaned.trim();
};

const formatResponse = (status, stdout, stderr, expected) => ({
    status,
    stdout,
    stderr: formatStderr(stderr),
    expected_output: expected,
});

const runLocally = async (stitchedCode, langSlug, stdin, expectedOutput) => {
    const execId = crypto.randomUUID();
    const workDir = path.join(os.tmpdir(), `coderush_exec_${execId}`);
    await fs.mkdir(workDir, { recursive: true });

    const fileMap = {
        'javascript': 'main.js',
        'python': 'main.py',
        'python3': 'main.py'
    };

    const fileName = fileMap[langSlug];
    if (!fileName) {
        await fs.rm(workDir, { recursive: true, force: true });
        return formatResponse('Error', '', `Local runner does not support language: ${langSlug}`, expectedOutput);
    }

    const filePath = path.join(workDir, fileName);
    await fs.writeFile(filePath, stitchedCode, 'utf8');
    await fs.writeFile(path.join(workDir, 'input.txt'), stdin || '', 'utf8');

    let runCmd = '';
    if (langSlug === 'javascript') runCmd = `node ${fileName} < input.txt`;
    else if (langSlug === 'python' || langSlug === 'python3') runCmd = `python3 ${fileName} < input.txt`;

    try {
        const { stdout, stderr } = await exec(runCmd, { cwd: workDir, timeout: 10000, maxBuffer: 10 * 1024 * 1024 });
        const actualOutput = (stdout || '').trim();
        const passed = actualOutput === (expectedOutput || '').trim();
        await fs.rm(workDir, { recursive: true, force: true });
        return formatResponse(passed ? 'Accepted' : 'Wrong Answer', actualOutput, (stderr || '').trim(), expectedOutput);
    } catch (err) {
        const stderr = err.stderr || err.message || '';
        await fs.rm(workDir, { recursive: true, force: true });
        return formatResponse('Execution Error', '', stderr.toString(), expectedOutput);
    }
};