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
const SANDBOX_NAME = process.env.SANDBOX_NAME || 'coderush-engine-v5';

// Eviction: stop sandboxes idle longer than SANDBOX_IDLE_TIMEOUT_MINUTES (default 10m)
const SANDBOX_IDLE_TIMEOUT_MINUTES = Number(process.env.SANDBOX_IDLE_TIMEOUT_MINUTES) || 10;
const SANDBOX_EVICTION_INTERVAL_MS = 60 * 1000; // run every minute

const startSandboxEviction = () => {
    const timer = setInterval(async () => {
        try {
            const now = Date.now();
            for (const [name, meta] of sandboxPool.entries()) {
                const idleMs = now - (meta.lastUsed || meta.createdAt || now);
                if (idleMs > SANDBOX_IDLE_TIMEOUT_MINUTES * 60 * 1000) {
                    try {
                        console.log(`[Judge Eviction] Evicting sandbox ${name} after ${Math.round(idleMs/1000)}s idle`);
                        await meta.sandbox.stop();
                    } catch (stopErr) {
                        console.error(`[Judge Eviction] Failed to stop sandbox ${name}:`, stopErr);
                    }
                    sandboxPool.delete(name);
                }
            }
        } catch (err) {
            console.error('[Judge Eviction] Sandbox eviction job error:', err);
        }
    }, SANDBOX_EVICTION_INTERVAL_MS);

    if (timer.unref) timer.unref();
};

// Start eviction loop once
startSandboxEviction();

/**
 * Resolves credentials for Vercel Sandbox.
 * For external platforms (like Render), VERCEL_TOKEN + VERCEL_PROJECT_ID + VERCEL_TEAM_ID
 * are used to bypass the 12-hour OIDC token expiry.
 */
export const getVercelCredentials = () => {
    const token = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN || process.env.VERCEL_OIDC_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID || 'prj_aZ92AAYfrwSTXrk6K6RIVxobfRri';
    const teamId = process.env.VERCEL_TEAM_ID || 'team_qZOxn38WtTNRKCnsynpJv9sK';

    if (token) {
        console.log(`[Judge Sandbox] Vercel token detected (prefix: ${token.slice(0, 6)}...). Project: ${projectId}, Team: ${teamId}`);
        return { token, projectId, teamId };
    }
    console.warn("[Judge Sandbox] No Vercel token found in environment!");
    return {};
};

/**
 * Installs GCC, G++, and Java JDK inside the sandbox container.
 * Uses direct shell scripts with root privileges, non-interactive flags, and symlink verification.
 */
const installCompilers = async (sbx) => {
    try {
        console.log("[Judge Sandbox] === Starting compiler installation ===");
        
        // Log environment & OS details
        try {
            const osCmd = await sbx.runCommand({ cmd: "sh", args: ["-c", "cat /etc/os-release | grep PRETTY_NAME || uname -a"] });
            console.log(`[Judge Sandbox] Target container OS: ${(await osCmd.stdout()).trim()}`);
        } catch (_) {}

        // Check package manager using POSIX standard 'command -v'
        const checkApt = await sbx.runCommand({ cmd: "sh", args: ["-c", "command -v apt-get"] });
        const hasApt = checkApt.exitCode === 0;

        if (hasApt) {
            console.log("[Judge Sandbox] Ubuntu/Debian detected. Running non-interactive apt-get update & install...");
            const script = `
                export DEBIAN_FRONTEND=noninteractive
                mkdir -p /usr/share/man/man1
                apt-get update -y
                apt-get install -y --no-install-recommends gcc g++ default-jdk-headless || \\
                apt-get install -y --no-install-recommends gcc g++ openjdk-21-jdk-headless || \\
                apt-get install -y --no-install-recommends gcc g++ openjdk-17-jdk-headless || \\
                apt-get install -y gcc g++ default-jdk

                JAVAC_BIN=$(find /usr -name javac -type f 2>/dev/null | head -n 1)
                JAVA_BIN=$(find /usr -name java -type f 2>/dev/null | head -n 1)
                if [ -n "$JAVAC_BIN" ]; then
                    ln -sf "$JAVAC_BIN" /usr/local/bin/javac
                    ln -sf "$JAVAC_BIN" /usr/bin/javac
                fi
                if [ -n "$JAVA_BIN" ]; then
                    ln -sf "$JAVA_BIN" /usr/local/bin/java
                    ln -sf "$JAVA_BIN" /usr/bin/java
                fi
            `;

            const installRes = await sbx.runCommand({
                cmd: "sh",
                args: ["-c", script],
                sudo: true,
                timeoutMs: 240000,
                env: { DEBIAN_FRONTEND: "noninteractive" }
            });

            console.log(`[Judge Sandbox] apt-get installation finished with exitCode: ${installRes.exitCode}`);
            if (installRes.exitCode !== 0) {
                console.error("[Judge Sandbox] apt-get script stderr:", await installRes.stderr());
            }
        } else {
            console.log("[Judge Sandbox] Non-Debian system. Running dnf install (Amazon Linux / Fedora)...");
            const dnfScript = `
                dnf install -y gcc gcc-c++ java-17-amazon-corretto-devel || dnf install -y gcc gcc-c++ java-devel
                JAVAC_BIN=$(find /usr -name javac -type f 2>/dev/null | head -n 1)
                JAVA_BIN=$(find /usr -name java -type f 2>/dev/null | head -n 1)
                if [ -n "$JAVAC_BIN" ]; then
                    ln -sf "$JAVAC_BIN" /usr/local/bin/javac
                    ln -sf "$JAVAC_BIN" /usr/bin/javac
                fi
                if [ -n "$JAVA_BIN" ]; then
                    ln -sf "$JAVA_BIN" /usr/local/bin/java
                    ln -sf "$JAVA_BIN" /usr/bin/java
                fi
            `;

            const installRes = await sbx.runCommand({
                cmd: "sh",
                args: ["-c", dnfScript],
                sudo: true,
                timeoutMs: 240000
            });
            console.log(`[Judge Sandbox] dnf install finished with exitCode: ${installRes.exitCode}`);
            if (installRes.exitCode !== 0) {
                console.error("[Judge Sandbox] dnf install stderr:", await installRes.stderr());
            }
        }

        // Verify installations directly
        const javacTest = await sbx.runCommand({ cmd: "sh", args: ["-c", "command -v javac || find /usr -name javac -type f 2>/dev/null | head -n 1"] });
        const gppTest = await sbx.runCommand({ cmd: "sh", args: ["-c", "command -v g++ || find /usr -name g++ -type f 2>/dev/null | head -n 1"] });

        const javacOut = (await javacTest.stdout()).trim();
        const gppOut = (await gppTest.stdout()).trim();

        console.log(`[Judge Sandbox Verification] javac path: "${javacOut}" (exitCode: ${javacTest.exitCode})`);
        console.log(`[Judge Sandbox Verification] g++ path:   "${gppOut}" (exitCode: ${gppTest.exitCode})`);
        console.log("[Judge Sandbox] === Compiler installation sequence finished ===");
    } catch (installErr) {
        console.error("[Judge Sandbox] Unexpected error during compiler installation:", installErr);
    }
};

/**
 * Gets an active sandbox from the local pool or resumes/creates coderush-engine-v5
 * using Sandbox.getOrCreate so compilers are saved in the snapshot.
 */
export const getOrInitSandbox = async () => {
    if (sandboxPool.has(SANDBOX_NAME)) {
        const meta = sandboxPool.get(SANDBOX_NAME);
        meta.lastUsed = Date.now();
        return meta.sandbox;
    }

    const credentials = getVercelCredentials();
    let sandbox = null;

    try {
        console.log(`[Judge Sandbox] Initializing/resuming named sandbox "${SANDBOX_NAME}"...`);
        sandbox = await Sandbox.getOrCreate({
            name: SANDBOX_NAME,
            ...credentials,
            onCreate: async (sbx) => {
                console.log("[Judge Sandbox] First-time setup: Installing compilers into snapshot...");
                await installCompilers(sbx);
            }
        });
    } catch (err) {
        console.warn("[Judge Sandbox] Sandbox.getOrCreate failed:", err.message);
        try {
            if (typeof Sandbox.get === 'function') {
                sandbox = await Sandbox.get({ name: SANDBOX_NAME, ...credentials });
            } else {
                sandbox = await Sandbox.create({ name: SANDBOX_NAME, ...credentials });
            }
        } catch (err2) {
            console.warn("[Judge Sandbox] Named sandbox fallback failed, trying ephemeral sandbox:", err2.message);
            sandbox = await Sandbox.create({ persistent: false, ...credentials });
        }
    }

    // Verify compilers are ready in the running sandbox instance
    try {
        const check = await sandbox.runCommand({ cmd: "sh", args: ["-c", "(command -v g++ || find /usr -name g++ -type f 2>/dev/null) && (command -v javac || find /usr -name javac -type f 2>/dev/null)"] });
        if (check.exitCode !== 0) {
            console.log("[Judge Sandbox] Compilers not ready in active sandbox. Installing now...");
            await installCompilers(sandbox);
        } else {
            console.log("[Judge Sandbox] Compilers (g++, javac) verified and ready in active sandbox.");
        }
    } catch (checkErr) {
        console.error("[Judge Sandbox] Compiler verification check failed:", checkErr);
    }

    sandboxPool.set(SANDBOX_NAME, { sandbox, lastUsed: Date.now(), createdAt: Date.now() });
    return sandbox;
};

/**
 * Pre-warms the sandbox engine in the background on server boot.
 */
export const warmUpJudgeEngine = async () => {
    if (process.env.USE_LOCAL_JUDGE === 'true') return;
    try {
        console.log("[Judge Sandbox] Starting background warmup for sandbox engine...");
        const sbx = await getOrInitSandbox();
        console.log(`[Judge Sandbox] Engine ready (ID/Name: ${sbx.name || SANDBOX_NAME})`);
    } catch (err) {
        console.warn("[Judge Sandbox] Warmup failed (will retry on first submission):", err.message);
    }
};

export const sendToJudge = async (questionId, userCode, languageId, langSlug, testCases = null, sessionId = null, evaluateAll = false) => {
    try {
        const question = await Question.findById(questionId);
        if (!question) throw new Error("Question not found in database.");

        const stitchedCode = stitchCode(userCode, langSlug, question.metaData);
        const extMap = { javascript: 'js', python: 'py', python3: 'py', c: 'c', cpp: 'cpp', java: 'java' };
        
        const testCasesToRun = evaluateAll ? question.allTestCases : (Array.isArray(testCases) && testCases.length ? testCases : [question.allTestCases[0]]);

        // Dev-friendly fallback: allow running locally when USE_LOCAL_JUDGE=true
        if (process.env.USE_LOCAL_JUDGE === 'true') {
            return await runLocally(stitchedCode, langSlug, testCasesToRun[0]?.input || "", testCasesToRun[0]?.output || "");
        }

        const credentials = getVercelCredentials();
        if (!credentials.token && process.env.NODE_ENV !== 'production') {
            throw new Error("Vercel token missing. Set VERCEL_TOKEN, VERCEL_API_TOKEN, or VERCEL_OIDC_TOKEN, or set USE_LOCAL_JUDGE=true for local runs.");
        }

        const execId = crypto.randomUUID();
        const sandbox = await getOrInitSandbox();

        // Create isolated workspace for this execution
        const workDir = `/tmp/exec_${execId}`;
        await sandbox.runCommand({ cmd: "sh", args: ["-c", `mkdir -p ${workDir}`] });

        try {
            const safeCode = typeof stitchedCode === 'string' ? stitchedCode : String(stitchedCode);
            const encodedCode = Buffer.from(safeCode).toString("base64");

            // Write stitched code to local temp for inspection if in dev
            if (process.env.NODE_ENV !== 'production') {
                try {
                    const ext = extMap[langSlug] || 'txt';
                    const localPath = path.join(os.tmpdir(), `stitched_${execId}.${ext}`);
                    await fs.writeFile(localPath, safeCode, 'utf8');
                } catch (_) {}
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
                const checkGcc = await sandbox.runCommand({ cmd: "sh", args: ["-c", "command -v gcc"] });
                if (checkGcc.exitCode !== 0) {
                    console.warn("[Judge Sandbox] 'gcc' missing at compile time! Running emergency install...");
                    await installCompilers(sandbox);
                }
                const compile = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", `cd ${workDir} && gcc ${fileName} -o main`],
                    timeoutMs: 15000 
                });
                if (compile.exitCode !== 0) {
                    const err = await compile.stderr();
                    console.error("[Judge Sandbox] C compilation failed:", err);
                    return formatResponse("Compilation Error", "", err, "");
                }
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            }
            else if (langSlug === 'cpp') {
                const checkGpp = await sandbox.runCommand({ cmd: "sh", args: ["-c", "command -v g++"] });
                if (checkGpp.exitCode !== 0) {
                    console.warn("[Judge Sandbox] 'g++' missing at compile time! Running emergency install...");
                    await installCompilers(sandbox);
                }
                const compile = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", `cd ${workDir} && g++ ${fileName} -o main`],
                    timeoutMs: 15000 
                });
                if (compile.exitCode !== 0) {
                    const err = await compile.stderr();
                    console.error("[Judge Sandbox] C++ compilation failed:", err);
                    return formatResponse("Compilation Error", "", err, "");
                }
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            }
            else if (langSlug === 'java') {
                console.log(`[Judge Sandbox] Compiling Java (${fileName}) in ${workDir}...`);
                let checkJavac = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", "command -v javac || find /usr -name javac -type f 2>/dev/null | head -n 1"] 
                });
                let javacBin = (await checkJavac.stdout()).trim();

                if (!javacBin) {
                    console.warn("[Judge Sandbox] 'javac' missing at compile time! Running emergency install...");
                    await installCompilers(sandbox);
                    checkJavac = await sandbox.runCommand({ 
                        cmd: "sh", 
                        args: ["-c", "command -v javac || find /usr -name javac -type f 2>/dev/null | head -n 1"] 
                    });
                    javacBin = (await checkJavac.stdout()).trim();
                }

                if (!javacBin) {
                    return formatResponse("Compilation Error", "", "javac: Java compiler binary not found in sandbox environment.", "");
                }

                console.log(`[Judge Sandbox] Using javac binary: "${javacBin}"`);
                const compile = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", `cd ${workDir} && "${javacBin}" ${fileName}`],
                    timeoutMs: 25000 
                });
                if (compile.exitCode !== 0) {
                    const err = await compile.stderr();
                    console.error("[Judge Sandbox] Java compilation failed:", err);
                    return formatResponse("Compilation Error", "", err, "");
                }
                console.log("[Judge Sandbox] Java compiled successfully.");

                let checkJava = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", "command -v java || find /usr -name java -type f 2>/dev/null | head -n 1"] 
                });
                let javaBin = (await checkJava.stdout()).trim() || "java";
                execCmdStr = `cd ${workDir} && "${javaBin}" Main < input.txt`;
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
                const execCmd = await sandbox.runCommand({ 
                    cmd: "sh", 
                    args: ["-c", execCmdStr],
                    timeoutMs: 10000 
                });

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
                    return result;
                }
                lastResult = result;
            }

            return lastResult || formatResponse("Accepted", "", "", "");

        } finally {
            // Clean up isolated execution directory
            try {
                await sandbox.runCommand({ cmd: "sh", args: ["-c", `rm -rf ${workDir}`] });
            } catch (_) {}

            // Keep sandbox alive in pool; update lastUsed time
            if (sandboxPool.has(SANDBOX_NAME)) {
                const meta = sandboxPool.get(SANDBOX_NAME);
                meta.lastUsed = Date.now();
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
        'python3': 'main.py',
        'java': 'Main.java',
        'cpp': 'main.cpp',
        'c': 'main.c'
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
    
    try {
        if (langSlug === 'java') {
            await exec(`javac ${fileName}`, { cwd: workDir });
            runCmd = `java Main < input.txt`;
        } else if (langSlug === 'cpp') {
            await exec(`g++ ${fileName} -o main`, { cwd: workDir });
            runCmd = `./main < input.txt`;
        } else if (langSlug === 'c') {
            await exec(`gcc ${fileName} -o main`, { cwd: workDir });
            runCmd = `./main < input.txt`;
        } else if (langSlug === 'javascript') {
            runCmd = `node ${fileName} < input.txt`;
        } else if (langSlug === 'python' || langSlug === 'python3') {
            runCmd = `python3 ${fileName} < input.txt`;
        }

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