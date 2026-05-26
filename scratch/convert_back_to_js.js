const fs = require('fs');
const path = require('path');

function jsonToJs(jsonFilePath, jsFilePath) {
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`JSON file does not exist: ${jsonFilePath}`);
        return;
    }
    const content = fs.readFileSync(jsonFilePath, 'utf8');
    const parsed = JSON.parse(content);
    
    // Format the JS content
    const jsContent = `// --------------------------------------------------------------
//  بيانات الورش الخاصة بصناعية ${path.basename(jsFilePath, '.js')}
// --------------------------------------------------------------
WORKSHOPS_MASTER.push(
${parsed.map(item => '  ' + JSON.stringify(item)).join(',\n')}
);
`;
    fs.writeFileSync(jsFilePath, jsContent, 'utf8');
    console.log(`Successfully converted ${jsonFilePath} to ${jsFilePath}`);
}

const publicDir = path.join(__dirname, '..');
jsonToJs(path.join(publicDir, 'js', 'data-naseem-sulay.json'), path.join(publicDir, 'js', 'data-naseem-sulay.js'));
jsonToJs(path.join(publicDir, 'js', 'data-exit18.json'), path.join(publicDir, 'js', 'data-exit18.js'));
jsonToJs(path.join(publicDir, 'js', 'data-old-industrial.json'), path.join(publicDir, 'js', 'data-old-industrial.js'));
