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
// Ensure function expression/const declarations are reachable on globalThis
try {
    if (typeof ${funcName} !== 'undefined' && typeof globalThis['${funcName}'] !== 'function') {
        try { globalThis['${funcName}'] = ${funcName}; } catch(e) {}
    }
} catch(e) {}
    async function main() {
        const raw = fs.readFileSync(0, 'utf-8');
        if (!raw || !raw.trim()) return;
        const lines = raw.trim().split('\\n').map(l => l.trim()).filter(Boolean);
        let parsed;
        try {
            // If single line that's JSON, parse it; if multiple lines try to parse each
            if (lines.length === 1) parsed = JSON.parse(lines[0]);
            else parsed = lines.map(l => JSON.parse(l));
        } catch (e) {
            // Fallback: treat lines as raw strings
            parsed = lines.length === 1 ? lines[0] : lines;
        }

        const args = Array.isArray(parsed) ? parsed : [parsed];
        let result;
        try {
            if (typeof globalThis['${funcName}'] === 'function') {
                result = await globalThis['${funcName}'](...args);
            } else if (typeof globalThis['Solution'] === 'function' && typeof (new globalThis['Solution']())['${funcName}'] === 'function') {
                result = await (new globalThis['Solution']())['${funcName}'](...args);
            } else {
                // Try calling as property on exports (module.exports = { funcName })
                const maybe = module.exports && module.exports['${funcName}'];
                if (typeof maybe === 'function') result = await maybe(...args);
                else result = null;
            }
        } catch (err) {
            console.error('Driver execution error:', err && err.stack ? err.stack : err);
            throw err;
        }
        console.log(JSON.stringify(result));
    }
    main();`;
};

const generatePythonDriver = (userCode, funcName, params) => {
    return `
import sys
import json
from typing import *
${userCode}
def _parse_input():
    raw = sys.stdin.read().strip()
    if not raw:
        return []
    lines = [l for l in raw.splitlines() if l.strip()]
    parsed = []
    # try parsing entire input as JSON
    try:
        whole = json.loads(raw)
        if isinstance(whole, list):
            return whole
        return [whole]
    except Exception:
        pass
    for l in lines:
        try:
            parsed.append(json.loads(l))
        except Exception:
            parsed.append(l)
    return parsed

if __name__ == '__main__':
    args = _parse_input()
    try:
        # prefer a free function
        if '${funcName}' in globals() and callable(globals()['${funcName}']):
            result = globals()['${funcName}'](*args)
        elif 'Solution' in globals() and callable(globals()['Solution']):
            sol = Solution()
            if hasattr(sol, '${funcName}'):
                result = getattr(sol, '${funcName}')(*args)
            else:
                raise Exception("Method ${funcName} not found in Solution class")
        else:
            raise Exception("Function ${funcName} or Solution class not found")
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    print(json.dumps(result, separators=(',', ':')))`;
};

const generateCppDriver = (userCode, funcName, params) => {
    let argsCode = '';
    let callArgs = [];
    if (params && Array.isArray(params)) {
        params.forEach((param, i) => {
            const varName = `arg${i}`;
            callArgs.push(varName);
            argsCode += `    getline(cin, line);\n`;
            if (param.type === 'integer') {
                argsCode += `    int ${varName} = parseInteger(line);\n`;
            } else if (param.type === 'string') {
                argsCode += `    string ${varName} = parseString(line);\n`;
            } else if (param.type === 'integer[]') {
                argsCode += `    vector<int> ${varName} = parseIntegerArray(line);\n`;
            } else if (param.type === 'string[]') {
                argsCode += `    vector<string> ${varName} = parseStringArray(line);\n`;
            } else if (param.type === 'boolean') {
                argsCode += `    bool ${varName} = (trimString(line) == "true");\n`;
            } else if (param.type === 'long') {
                argsCode += `    long long ${varName} = stoll(trimString(line));\n`;
            } else if (param.type === 'double') {
                argsCode += `    double ${varName} = stod(trimString(line));\n`;
            } else if (param.type === 'character') {
                argsCode += `    char ${varName} = parseString(line)[0];\n`;
            } else if (param.type === 'list<integer>') {
                argsCode += `    vector<int> ${varName} = parseListInteger(line);\n`;
            } else if (param.type === 'list<string>') {
                argsCode += `    vector<string> ${varName} = parseListString(line);\n`;
            } else if (param.type === 'list<list<integer>>') {
                argsCode += `    vector<vector<int>> ${varName} = parseListListInteger(line);\n`;
            } else if (param.type === 'list<list<string>>') {
                argsCode += `    vector<vector<string>> ${varName} = parseListListString(line);\n`;
            } else {
                argsCode += `    // Unsupported type ${param.type}\n`;
            }
        });
    }

    return `
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <map>
#include <unordered_set>
#include <set>
#include <queue>
#include <stack>
#include <algorithm>
#include <cmath>
using namespace std;

string trimString(const string& s) {
    size_t start = 0;
    while(start < s.length() && isspace(s[start])) start++;
    size_t end = s.length();
    while(end > start && isspace(s[end-1])) end--;
    return s.substr(start, end - start);
}

vector<int> parseIntegerArray(const string& str) {
    vector<int> res;
    string s = trimString(str);
    if(s.length() < 2 || s.front() != '[' || s.back() != ']') return res;
    string inner = s.substr(1, s.length() - 2);
    size_t pos = 0;
    while (pos < inner.length()) {
        while(pos < inner.length() && (isspace(inner[pos]) || inner[pos] == ',')) pos++;
        if (pos >= inner.length()) break;
        size_t nextPos = pos;
        while(nextPos < inner.length() && inner[nextPos] != ',') nextPos++;
        string numStr = inner.substr(pos, nextPos - pos);
        res.push_back(stoi(numStr));
        pos = nextPos;
    }
    return res;
}

vector<string> parseStringArray(const string& str) {
    vector<string> res;
    string s = trimString(str);
    if(s.length() < 2 || s.front() != '[' || s.back() != ']') return res;
    string inner = s.substr(1, s.length() - 2);
    size_t pos = 0;
    while (pos < inner.length()) {
        while(pos < inner.length() && (isspace(inner[pos]) || inner[pos] == ',')) pos++;
        if (pos >= inner.length()) break;
        if (inner[pos] == '"') {
            size_t nextPos = pos + 1;
            while(nextPos < inner.length() && inner[nextPos] != '"') {
                if (inner[nextPos] == '\\\\') nextPos += 2;
                else nextPos++;
            }
            res.push_back(inner.substr(pos + 1, nextPos - pos - 1));
            pos = nextPos + 1;
        } else {
            size_t nextPos = pos;
            while(nextPos < inner.length() && inner[nextPos] != ',') nextPos++;
            res.push_back(inner.substr(pos, nextPos - pos));
            pos = nextPos;
        }
    }
    return res;
}

int parseInteger(const string& str) {
    return stoi(trimString(str));
}

string parseString(const string& str) {
    string s = trimString(str);
    if(s.length() >= 2 && s.front() == '"' && s.back() == '"') {
        return s.substr(1, s.length() - 2);
    }
    return s;
}

vector<int> parseListInteger(const string& str) { return parseIntegerArray(str); }
vector<string> parseListString(const string& str) { return parseStringArray(str); }

vector<vector<int>> parseListListInteger(const string& str) {
    vector<vector<int>> res;
    string s = trimString(str);
    if(s.length() < 2 || s.front() != '[' || s.back() != ']') return res;
    string inner = s.substr(1, s.length() - 2);
    size_t pos = 0;
    while(pos < inner.length()) {
        while(pos < inner.length() && (isspace(inner[pos]) || inner[pos] == ',')) pos++;
        if (pos >= inner.length()) break;
        size_t start = pos;
        int depth = 0;
        while(pos < inner.length()) {
            if (inner[pos] == '[') depth++;
            else if (inner[pos] == ']') depth--;
            pos++;
            if (depth == 0) break;
        }
        res.push_back(parseIntegerArray(inner.substr(start, pos - start)));
    }
    return res;
}

vector<vector<string>> parseListListString(const string& str) {
    vector<vector<string>> res;
    string s = trimString(str);
    if(s.length() < 2 || s.front() != '[' || s.back() != ']') return res;
    string inner = s.substr(1, s.length() - 2);
    size_t pos = 0;
    while(pos < inner.length()) {
        while(pos < inner.length() && (isspace(inner[pos]) || inner[pos] == ',')) pos++;
        if (pos >= inner.length()) break;
        size_t start = pos;
        int depth = 0;
        while(pos < inner.length()) {
            if (inner[pos] == '[') depth++;
            else if (inner[pos] == ']') depth--;
            pos++;
            if (depth == 0) break;
        }
        res.push_back(parseStringArray(inner.substr(start, pos - start)));
    }
    return res;
}

// Forward declarations for printing
void printResult(int val);
void printResult(long long val);
void printResult(double val);
void printResult(bool val);
void printResult(const string& val);
void printResult(const vector<int>& val);
void printResult(const vector<string>& val);
void printResult(const vector<vector<int>>& val);
void printResult(const vector<vector<string>>& val);
void printResult(const vector<bool>& val);

void printResult(int val) { cout << val; }
void printResult(long long val) { cout << val; }
void printResult(double val) { cout << val; }
void printResult(bool val) { cout << (val ? "true" : "false"); }
void printResult(const string& val) { cout << "\"" << val << "\""; }
void printResult(const vector<int>& val) {
    cout << "[";
    for (size_t i = 0; i < val.size(); i++) {
        printResult(val[i]);
        if (i != val.size() - 1) cout << ",";
    }
    cout << "]";
}
void printResult(const vector<string>& val) {
    cout << "[";
    for (size_t i = 0; i < val.size(); i++) {
        printResult(val[i]);
        if (i != val.size() - 1) cout << ",";
    }
    cout << "]";
}
void printResult(const vector<vector<int>>& val) {
    cout << "[";
    for(size_t i=0; i<val.size(); i++) {
        printResult(val[i]);
        if(i != val.size()-1) cout << ",";
    }
    cout << "]";
}
void printResult(const vector<vector<string>>& val) {
    cout << "[";
    for(size_t i=0; i<val.size(); i++) {
        printResult(val[i]);
        if(i != val.size()-1) cout << ",";
    }
    cout << "]";
}
void printResult(const vector<bool>& val) {
    cout << "[";
    for (size_t i = 0; i < val.size(); i++) {
        printResult((bool)val[i]);
        if (i != val.size() - 1) cout << ",";
    }
    cout << "]";
}

${userCode}

int main() {
    Solution sol;
    string line;
${argsCode}
    auto result = sol.${funcName}(${callArgs.join(', ')});
    printResult(result);
    cout << endl;
    return 0;
}
`;
};

const generateJavaDriver = (userCode, funcName, params) => {
    let argsCode = '';
    let callArgs = [];
    if (params && Array.isArray(params)) {
        params.forEach((param, i) => {
            const varName = `arg${i}`;
            callArgs.push(varName);
            argsCode += `        String line${i} = scanner.hasNextLine() ? scanner.nextLine() : "";\n`;
            if (param.type === 'integer') {
                argsCode += `        int ${varName} = parseInteger(line${i});\n`;
            } else if (param.type === 'string') {
                argsCode += `        String ${varName} = parseString(line${i});\n`;
            } else if (param.type === 'integer[]') {
                argsCode += `        int[] ${varName} = parseIntegerArray(line${i});\n`;
            } else if (param.type === 'string[]') {
                argsCode += `        String[] ${varName} = parseStringArray(line${i});\n`;
            } else if (param.type === 'boolean') {
                argsCode += `        boolean ${varName} = line${i}.trim().equals("true");\n`;
            } else if (param.type === 'long') {
                argsCode += `        long ${varName} = Long.parseLong(line${i}.trim());\n`;
            } else if (param.type === 'double') {
                argsCode += `        double ${varName} = Double.parseDouble(line${i}.trim());\n`;
            } else if (param.type === 'character') {
                argsCode += `        char ${varName} = parseString(line${i}).charAt(0);\n`;
            } else if (param.type === 'list<integer>') {
                argsCode += `        List<Integer> ${varName} = parseListInteger(line${i});\n`;
            } else if (param.type === 'list<string>') {
                argsCode += `        List<String> ${varName} = parseListString(line${i});\n`;
            } else if (param.type === 'list<list<integer>>') {
                argsCode += `        List<List<Integer>> ${varName} = parseListListInteger(line${i});\n`;
            } else if (param.type === 'list<list<string>>') {
                argsCode += `        List<List<String>> ${varName} = parseListListString(line${i});\n`;
            } else {
                argsCode += `        // Unsupported type ${param.type}\n`;
            }
        });
    }

    return `
import java.util.*;
import java.io.*;
import java.math.*;

${userCode}

public class Main {
    public static int[] parseIntegerArray(String s) {
        s = s.trim();
        if (s.length() < 2 || !s.startsWith("[") || !s.endsWith("]")) return new int[0];
        String inner = s.substring(1, s.length() - 1).trim();
        if (inner.isEmpty()) return new int[0];
        String[] parts = inner.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Integer.parseInt(parts[i].trim());
        }
        return res;
    }

    public static String[] parseStringArray(String s) {
        s = s.trim();
        if (s.length() < 2 || !s.startsWith("[") || !s.endsWith("]")) return new String[0];
        String inner = s.substring(1, s.length() - 1).trim();
        if (inner.isEmpty()) return new String[0];
        String[] parts = inner.split("\\",\\s*\\"");
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i].trim();
            if (p.startsWith("\\\"")) p = p.substring(1);
            if (p.endsWith("\\\"")) p = p.substring(0, p.length() - 1);
            parts[i] = p;
        }
        return parts;
    }

    public static int parseInteger(String s) {
        return Integer.parseInt(s.trim());
    }

    public static String parseString(String s) {
        s = s.trim();
        if (s.length() >= 2 && s.startsWith("\\\"") && s.endsWith("\\\"")) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

    public static List<Integer> parseListInteger(String s) {
        s = s.trim();
        List<Integer> list = new ArrayList<>();
        if (s.length() < 2 || !s.startsWith("[") || !s.endsWith("]")) return list;
        String inner = s.substring(1, s.length() - 1).trim();
        if (inner.isEmpty()) return list;
        String[] parts = inner.split(",");
        for (String p : parts) {
            list.add(Integer.parseInt(p.trim()));
        }
        return list;
    }

    public static List<String> parseListString(String s) {
        return new ArrayList<>(Arrays.asList(parseStringArray(s)));
    }

    public static List<List<Integer>> parseListListInteger(String s) {
        s = s.trim();
        List<List<Integer>> res = new ArrayList<>();
        if (s.length() < 2 || !s.startsWith("[") || !s.endsWith("]")) return res;
        String inner = s.substring(1, s.length() - 1).trim();
        if (inner.isEmpty()) return res;
        if (inner.startsWith("[")) inner = inner.substring(1);
        if (inner.endsWith("]")) inner = inner.substring(0, inner.length() - 1);
        String[] parts = inner.split("\\\\\]\\\\s*,\\\\s*\\\\\[");
        for (String p : parts) {
            if(!p.startsWith("[")) p = "[" + p;
            if(!p.endsWith("]")) p = p + "]";
            res.add(parseListInteger(p));
        }
        return res;
    }

    public static List<List<String>> parseListListString(String s) {
        s = s.trim();
        List<List<String>> res = new ArrayList<>();
        if (s.length() < 2 || !s.startsWith("[") || !s.endsWith("]")) return res;
        String inner = s.substring(1, s.length() - 1).trim();
        if (inner.isEmpty()) return res;
        if (inner.startsWith("[")) inner = inner.substring(1);
        if (inner.endsWith("]")) inner = inner.substring(0, inner.length() - 1);
        String[] parts = inner.split("\\\\\]\\\\s*,\\\\s*\\\\\[");
        for (String p : parts) {
            if(!p.startsWith("[")) p = "[" + p;
            if(!p.endsWith("]")) p = p + "]";
            res.add(parseListString(p));
        }
        return res;
    }
    
    public static void printResult(Object obj) {
        if (obj == null) {
            System.out.print("null");
        } else if (obj instanceof int[]) {
            int[] arr = (int[]) obj;
            System.out.print("[");
            for (int i = 0; i < arr.length; i++) {
                printResult(arr[i]);
                if (i != arr.length - 1) System.out.print(",");
            }
            System.out.print("]");
        } else if (obj instanceof String[]) {
            String[] arr = (String[]) obj;
            System.out.print("[");
            for (int i = 0; i < arr.length; i++) {
                printResult(arr[i]);
                if (i != arr.length - 1) System.out.print(",");
            }
            System.out.print("]");
        } else if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            System.out.print("[");
            for (int i = 0; i < list.size(); i++) {
                printResult(list.get(i));
                if (i != list.size() - 1) System.out.print(",");
            }
            System.out.print("]");
        } else if (obj instanceof String) {
            System.out.print("\\"" + obj + "\\"");
        } else {
            System.out.print(obj.toString());
        }
    }


    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution sol = new Solution();
${argsCode}
        Object result = sol.${funcName}(${callArgs.join(', ')});
        printResult(result);
        System.out.println();
    }
}
`;
};

const generateCDriver = (userCode, funcName, params) => {
    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>
#include <limits.h>
${userCode}
int main() {
    printf("C Execution Ready\\n");
    return 0;
}`;
};