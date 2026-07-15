export const stitchCode = (userCode, langSlug, metaDataStr) => {
    const metaData = JSON.parse(metaDataStr);
    const funcName = metaData.name;
    const params = metaData.params;

    if (langSlug === 'javascript') {
        return generateJSDriver(userCode, funcName, params);
    }
    
    // We will add Python, Java, C++ here later
    throw new Error(`Language ${langSlug} not currently supported by the stitcher.`);
};

const generateJSDriver = (userCode, funcName, params) => {
    let driverCode = `
const fs = require('fs');

${userCode} // <-- User's submitted code gets injected here

function main() {
    const input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');
    if (input.length === 0 || input[0] === '') return;
`;

    // Dynamically parse the inputs based on metadata
    params.forEach((param, index) => {
        if (param.type === 'integer') {
            driverCode += `    const ${param.name} = parseInt(input[${index}]);\n`;
        } else if (param.type === 'integer[]') {
            driverCode += `    const ${param.name} = JSON.parse(input[${index}]);\n`;
        } else if (param.type === 'string') {
            // Strip quotes if they exist in the input string, otherwise keep raw
            driverCode += `    let rawStr${index} = input[${index}];\n`;
            driverCode += `    if (rawStr${index}.startsWith('"') && rawStr${index}.endsWith('"')) { rawStr${index} = rawStr${index}.slice(1, -1); }\n`;
            driverCode += `    const ${param.name} = rawStr${index};\n`;
        } else {
            // Fallback for strings, booleans, etc.
            driverCode += `    const ${param.name} = JSON.parse(input[${index}]);\n`;
        }
    });

    // Call the user's function and print the result
    const paramNames = params.map(p => p.name).join(', ');
    driverCode += `
    const result = ${funcName}(${paramNames});
    console.log(JSON.stringify(result));
}

main();
`;

    return driverCode;
};