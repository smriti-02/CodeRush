export const stitchCode = (userCode, langSlug, metaDataStr) => {
    const metaData = JSON.parse(metaDataStr);
    const funcName = metaData.name;
    const params = metaData.params;

    if (langSlug === 'javascript') return generateJSDriver(userCode, funcName, params);
    if (langSlug === 'python' || langSlug === 'python3') return generatePythonDriver(userCode, funcName, params);
    if (langSlug === 'cpp') return generateCppDriver(userCode, funcName, params);
    if (langSlug === 'java') return generateJavaDriver(userCode, funcName, params);
    if (langSlug === 'c') return generateCDriver(userCode, funcName, params);
    
    throw new Error(`Language ${langSlug} not currently supported.`);
};

const generateJSDriver = (userCode, funcName, params) => {
    return `
const fs = require('fs');
${userCode}
function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
    if (!input.length || input[0] === '') return;
    // Basic argument parsing logic here
    const result = ${funcName}(JSON.parse(input[0]), JSON.parse(input[1]));
    console.log(JSON.stringify(result));
}
main();`;
};

const generatePythonDriver = (userCode, funcName, params) => {
    return `
import sys
import json
${userCode}
if __name__ == '__main__':
    lines = sys.stdin.read().splitlines()
    if not lines: sys.exit(0)
    # Basic argument parsing logic here
    arg1 = json.loads(lines[0])
    arg2 = json.loads(lines[1])
    sol = Solution()
    result = sol.${funcName}(arg1, arg2)
    print(json.dumps(result).replace(' ', ''))`;
};

const generateCppDriver = (userCode, funcName, params) => {
    return `
#include <iostream>
#include <vector>
#include <string>
using namespace std;
${userCode}
int main() {
    // Requires JSON parsing library (e.g., nlohmann/json) for complex inputs
    // Placeholder basic execution
    Solution sol;
    cout << "CPP Execution Ready" << endl;
    return 0;
}`;
};

const generateJavaDriver = (userCode, funcName, params) => {
    return `
import java.util.*;
public class Main {
${userCode}
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Requires basic parsing mapping
        System.out.println("Java Execution Ready");
    }
}`;
};

const generateCDriver = (userCode, funcName, params) => {
    return `
#include <stdio.h>
#include <stdlib.h>
${userCode}
int main() {
    printf("C Execution Ready\\n");
    return 0;
}`;
};