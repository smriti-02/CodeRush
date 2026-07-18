import { Sandbox } from "@vercel/sandbox";
import { Question } from '../models/questions.model.js';
import { stitchCode } from '../utils/codeStitcher.js';
import crypto from 'crypto';

export const sendToJudge = async (questionId, userCode, languageId, langSlug) => {
    try {
        const question = await Question.findById(questionId);
        if (!question) throw new Error("Question not found in database.");

        const stitchedCode = stitchCode(userCode, langSlug, question.metaData);
        const testCase = question.allTestCases[0]; 
        const stdin = testCase ? testCase.input : "";
        const expectedOutput = testCase ? testCase.output : "";

        // Connect to the persistent engine
        const sandbox = await Sandbox.create({ name: "coderush-engine" });

        try {
            // Check if compilers are installed, install if missing
            const checkCompilers = await sandbox.runCommand({ cmd: "sh", args: ["-c", "which g++"] });
            if (checkCompilers.exitCode !== 0) {
                console.log("Installing compilers (First run only)...");
                await sandbox.runCommand({ 
                    cmd: "dnf", 
                    args: ["install", "-y", "gcc", "gcc-c++", "java-17-amazon-corretto"], 
                    sudo: true 
                });
            }

            // Create isolated workspace
            const execId = crypto.randomUUID();
            const workDir = `/tmp/exec_${execId}`;
            await sandbox.runCommand({ cmd: "sh", args: ["-c", `mkdir -p ${workDir}`] });

            const encodedCode = Buffer.from(stitchedCode).toString('base64');
            const encodedInput = Buffer.from(stdin).toString('base64');

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
            await sandbox.runCommand({ cmd: "sh", args: ["-c", `echo ${encodedInput} | base64 -d > ${workDir}/input.txt`] });

            let execCmdStr = "";

            if (langSlug === 'c') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && gcc ${fileName} -o main`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), expectedOutput);
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            } 
            else if (langSlug === 'cpp') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && g++ ${fileName} -o main`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), expectedOutput);
                execCmdStr = `cd ${workDir} && ./main < input.txt`;
            } 
            else if (langSlug === 'java') {
                const compile = await sandbox.runCommand({ cmd: "sh", args: ["-c", `cd ${workDir} && javac ${fileName}`] });
                if (compile.exitCode !== 0) return formatResponse("Compilation Error", "", await compile.stderr(), expectedOutput);
                execCmdStr = `cd ${workDir} && java Main < input.txt`;
            } 
            else if (langSlug === 'javascript') {
                execCmdStr = `cd ${workDir} && node ${fileName} < input.txt`;
            } 
            else if (langSlug === 'python' || langSlug === 'python3') {
                execCmdStr = `cd ${workDir} && python3 ${fileName} < input.txt`;
            }

            const execCmd = await sandbox.runCommand({ cmd: "sh", args: ["-c", execCmdStr] });
            
            const stdout = await execCmd.stdout();
            const stderr = await execCmd.stderr();
            
            const actualOutput = stdout.trim();
            const passed = actualOutput === expectedOutput.trim();

            await sandbox.runCommand({ cmd: "sh", args: ["-c", `rm -rf ${workDir}`] });

            return formatResponse(passed ? "Accepted" : "Wrong Answer", actualOutput, stderr.trim(), expectedOutput);

        } finally {
            // Stop the sandbox to trigger the filesystem snapshot automatically
            await sandbox.stop();
        }

    } catch (error) {
        console.error("Sandbox Execution Error:", error);
        throw error;
    }
};

const formatResponse = (status, stdout, stderr, expected) => ({
    status,
    stdout,
    stderr,
    expected_output: expected,
});