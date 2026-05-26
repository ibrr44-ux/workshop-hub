import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const jsDir = path.join(root, 'js');

const files = [
  {
    src: 'app.js',
    reservedNames: ['WORKSHOPS_MASTER', 'INDUSTRIAL_AREAS', 'enterIndustrialArea', 'goToWelcomeScreen', 'shareWorkshop'],
    options: {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      renameGlobals: false,
      selfDefending: true,
      disableConsoleOutput: false,
    }
  },
  {
    src: 'data-areas.js',
    reservedNames: ['WORKSHOPS_MASTER', 'INDUSTRIAL_AREAS'],
    options: {
      compact: true,
      renameGlobals: false,
    }
  },
  {
    src: 'data-naseem-sulay.js',
    reservedNames: ['WORKSHOPS_MASTER'],
    options: {
      compact: true,
      renameGlobals: false,
    }
  },
  {
    src: 'data-exit18.js',
    reservedNames: ['WORKSHOPS_MASTER'],
    options: {
      compact: true,
      renameGlobals: false,
    }
  },
  {
    src: 'data-old-industrial.js',
    reservedNames: ['WORKSHOPS_MASTER'],
    options: {
      compact: true,
      renameGlobals: false,
    }
  },
];

for (const file of files) {
  const inputPath = path.join(jsDir, file.src);
  const outputName = file.src.replace('.js', '.min.js');
  const outputPath = path.join(jsDir, outputName);

  console.log(`🔧 Obfuscating: ${file.src} → ${outputName}`);

  const code = fs.readFileSync(inputPath, 'utf8');
  const options = {
    ...file.options,
    reservedNames: file.reservedNames,
  };

  const result = JavaScriptObfuscator.obfuscate(code, options);
  fs.writeFileSync(outputPath, result.getObfuscatedCode());

  const originalSize = (Buffer.byteLength(code) / 1024).toFixed(1);
  const obfuscatedSize = (Buffer.byteLength(result.getObfuscatedCode()) / 1024).toFixed(1);
  console.log(`   ✔ ${originalSize}KB → ${obfuscatedSize}KB`);
}

console.log('\n✅ All files obfuscated successfully!');
