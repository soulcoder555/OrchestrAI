import fs from 'fs';
import path from 'path';
import { RepoMap, CodebaseStats, LanguageStat, ExtensionStat, CategoryStat } from '../db/types.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.data',
  '.cache',
  'vendor',
]);

const SENSITIVE_FILE_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'id_rsa',
  'id_ed25519',
  'secrets.json',
  'credentials.json',
]);

const LANGUAGE_MAP: Record<string, { name: string; color: string }> = {
  '.ts': { name: 'TypeScript', color: '#3178c6' },
  '.tsx': { name: 'TypeScript', color: '#3178c6' },
  '.js': { name: 'JavaScript', color: '#f7df1e' },
  '.jsx': { name: 'JavaScript', color: '#f7df1e' },
  '.mjs': { name: 'JavaScript', color: '#f7df1e' },
  '.cjs': { name: 'JavaScript', color: '#f7df1e' },
  '.json': { name: 'JSON', color: '#cbcb41' },
  '.md': { name: 'Markdown', color: '#083fa1' },
  '.markdown': { name: 'Markdown', color: '#083fa1' },
  '.py': { name: 'Python', color: '#3572A5' },
  '.go': { name: 'Go', color: '#00ADD8' },
  '.rs': { name: 'Rust', color: '#dea584' },
  '.html': { name: 'HTML', color: '#e34c26' },
  '.htm': { name: 'HTML', color: '#e34c26' },
  '.css': { name: 'CSS', color: '#563d7c' },
  '.scss': { name: 'SCSS', color: '#c6538c' },
  '.yaml': { name: 'YAML', color: '#cb171e' },
  '.yml': { name: 'YAML', color: '#cb171e' },
  '.sh': { name: 'Shell', color: '#89e051' },
  '.bash': { name: 'Shell', color: '#89e051' },
  '.sql': { name: 'SQL', color: '#e38c00' },
  '.toml': { name: 'TOML', color: '#9c4221' },
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface ScannedFileInfo {
  relPath: string;
  size: number;
  lines: number;
  extension: string;
  language: { name: string; color: string };
  category: 'source' | 'tests' | 'config' | 'documentation';
}

export class RepoScanner {
  /**
   * Scans a workspace directory to create a comprehensive repository map and codebase statistics.
   */
  static async scanDirectory(workspacePath: string): Promise<RepoMap> {
    if (!fs.existsSync(workspacePath)) {
      throw new Error(`Workspace path does not exist: ${workspacePath}`);
    }

    const files: string[] = [];
    const scannedFiles: ScannedFileInfo[] = [];
    const importantConfigs: string[] = [];
    const entryPoints: string[] = [];
    const testLocations: string[] = [];
    let manifest: RepoMap['manifest'] = undefined;
    let readmeSummary: string | undefined = undefined;

    // Walk file tree
    const walk = (dir: string, relativeRoot = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            walk(path.join(dir, entry.name), path.join(relativeRoot, entry.name));
          }
        } else if (entry.isFile()) {
          const relPath = path.join(relativeRoot, entry.name);
          const fullPath = path.join(dir, entry.name);
          files.push(relPath);

          const lowerName = entry.name.toLowerCase();
          const ext = path.extname(entry.name).toLowerCase() || lowerName;

          // File stats
          let size = 0;
          let lines = 0;
          try {
            const stat = fs.statSync(fullPath);
            size = stat.size;
            // Read lines for text files under 2MB
            if (size < 2 * 1024 * 1024) {
              const content = fs.readFileSync(fullPath, 'utf-8');
              lines = content.split('\n').length;
            }
          } catch (e) {
            // ignore
          }

          // Language determination
          const langInfo = LANGUAGE_MAP[ext] || {
            name: ext.startsWith('.') ? ext.slice(1).toUpperCase() : 'Plain Text',
            color: '#6e7681',
          };

          // Categorization
          let category: 'source' | 'tests' | 'config' | 'documentation' = 'source';
          if (
            relPath.includes('test') ||
            relPath.includes('spec') ||
            relPath.endsWith('.test.ts') ||
            relPath.endsWith('.test.js') ||
            relPath.endsWith('.spec.ts')
          ) {
            category = 'tests';
            testLocations.push(relPath);
          } else if (
            lowerName.startsWith('readme') ||
            lowerName === 'license' ||
            ext === '.md' ||
            relPath.startsWith('docs/')
          ) {
            category = 'documentation';
          } else if (
            lowerName === 'package.json' ||
            lowerName === 'tsconfig.json' ||
            lowerName === 'vite.config.ts' ||
            lowerName === 'next.config.js' ||
            lowerName === 'next.config.mjs' ||
            lowerName === 'tailwind.config.js' ||
            lowerName === 'eslint.config.js' ||
            lowerName === '.eslintrc.json' ||
            lowerName === 'cargo.toml' ||
            lowerName === 'pyproject.toml' ||
            lowerName === 'go.mod' ||
            ext === '.json'
          ) {
            category = 'config';
          }

          scannedFiles.push({
            relPath,
            size,
            lines,
            extension: ext,
            language: langInfo,
            category,
          });

          // Important configs
          if (
            lowerName === 'package.json' ||
            lowerName === 'tsconfig.json' ||
            lowerName === 'vite.config.ts' ||
            lowerName === 'next.config.js' ||
            lowerName === 'next.config.mjs' ||
            lowerName === 'tailwind.config.js' ||
            lowerName === 'eslint.config.js' ||
            lowerName === '.eslintrc.json' ||
            lowerName === 'cargo.toml' ||
            lowerName === 'pyproject.toml' ||
            lowerName === 'go.mod'
          ) {
            importantConfigs.push(relPath);
          }

          // Entry points
          if (
            relPath === 'src/index.ts' ||
            relPath === 'src/main.ts' ||
            relPath === 'src/main.tsx' ||
            relPath === 'src/App.tsx' ||
            relPath === 'server.ts' ||
            relPath === 'index.ts' ||
            relPath === 'app/page.tsx' ||
            relPath === 'app/layout.tsx'
          ) {
            entryPoints.push(relPath);
          }

          // Readme summary
          if (lowerName === 'readme.md' && !readmeSummary) {
            try {
              const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
              readmeSummary = content.slice(0, 800).replace(/(\r\n|\n|\r)/gm, ' ');
            } catch (e) {
              // ignore
            }
          }
        }
      }
    };

    walk(workspacePath);

    // Read package.json if available
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgRaw);
        manifest = {
          name: pkg.name,
          version: pkg.version,
          dependencies: pkg.dependencies || {},
          devDependencies: pkg.devDependencies || {},
          scripts: pkg.scripts || {},
        };
      } catch (e) {
        console.warn('Could not parse package.json during scan:', e);
      }
    }

    // Compute aggregate stats
    const totalFiles = scannedFiles.length;
    let totalSizeBytes = 0;
    let totalLines = 0;

    const langAgg: Record<string, { filesCount: number; linesCount: number; bytes: number; color: string }> = {};
    const extAgg: Record<string, { count: number; bytes: number }> = {};
    const categories: CodebaseStats['categories'] = {
      source: { files: 0, bytes: 0, lines: 0 },
      tests: { files: 0, bytes: 0, lines: 0 },
      config: { files: 0, bytes: 0, lines: 0 },
      documentation: { files: 0, bytes: 0, lines: 0 },
    };

    for (const f of scannedFiles) {
      totalSizeBytes += f.size;
      totalLines += f.lines;

      // Category counts
      categories[f.category].files += 1;
      categories[f.category].bytes += f.size;
      categories[f.category].lines += f.lines;

      // Language counts
      const lName = f.language.name;
      if (!langAgg[lName]) {
        langAgg[lName] = { filesCount: 0, linesCount: 0, bytes: 0, color: f.language.color };
      }
      langAgg[lName].filesCount += 1;
      langAgg[lName].linesCount += f.lines;
      langAgg[lName].bytes += f.size;

      // Extension counts
      const eName = f.extension || 'other';
      if (!extAgg[eName]) {
        extAgg[eName] = { count: 0, bytes: 0 };
      }
      extAgg[eName].count += 1;
      extAgg[eName].bytes += f.size;
    }

    // Calculate language percentages
    const languages: LanguageStat[] = Object.entries(langAgg)
      .map(([name, data]) => {
        const percentage = totalSizeBytes > 0 ? Number(((data.bytes / totalSizeBytes) * 100).toFixed(1)) : 0;
        return {
          name,
          filesCount: data.filesCount,
          linesCount: data.linesCount,
          bytes: data.bytes,
          percentage,
          color: data.color,
        };
      })
      .sort((a, b) => b.bytes - a.bytes);

    const fileExtensions: ExtensionStat[] = Object.entries(extAgg)
      .map(([extension, data]) => ({
        extension,
        count: data.count,
        bytes: data.bytes,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    const primaryLanguage = languages[0]?.name || 'TypeScript';

    const stats: CodebaseStats = {
      totalFiles,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      totalLines,
      avgFileSizeFormatted: formatBytes(totalFiles > 0 ? Math.round(totalSizeBytes / totalFiles) : 0),
      primaryLanguage,
      languages,
      categories,
      fileExtensions,
    };

    // Framework detection
    let detectedFramework = 'Unknown';
    if (manifest?.dependencies?.['next'] || manifest?.devDependencies?.['next']) {
      detectedFramework = 'Next.js';
    } else if (manifest?.dependencies?.['express']) {
      detectedFramework = manifest?.dependencies?.['react'] ? 'Express + React' : 'Express (Node.js)';
    } else if (manifest?.dependencies?.['react'] || manifest?.devDependencies?.['react']) {
      detectedFramework = 'React (SPA)';
    } else if (manifest?.dependencies?.['vue']) {
      detectedFramework = 'Vue.js';
    } else if (fs.existsSync(path.join(workspacePath, 'pyproject.toml'))) {
      detectedFramework = 'Python';
    } else if (fs.existsSync(path.join(workspacePath, 'Cargo.toml'))) {
      detectedFramework = 'Rust';
    }

    // Detected primary language from stats or fallback
    const detectedLanguage = primaryLanguage || (files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx')) ? 'TypeScript' : 'JavaScript');

    // Available scripts detection
    const availableScripts: RepoMap['availableScripts'] = {};
    if (manifest?.scripts) {
      if (manifest.scripts['lint']) availableScripts.lint = 'npm run lint';
      if (manifest.scripts['typecheck']) {
        availableScripts.typecheck = 'npm run typecheck';
      } else if (files.includes('tsconfig.json')) {
        availableScripts.typecheck = 'npx tsc --noEmit';
      }
      if (manifest.scripts['test']) availableScripts.test = 'npm test';
      if (manifest.scripts['build']) availableScripts.build = 'npm run build';
    } else {
      if (files.includes('tsconfig.json')) {
        availableScripts.typecheck = 'npx tsc --noEmit';
      }
    }

    return {
      files: files.slice(0, 200), // bounded
      importantConfigs,
      manifest,
      detectedFramework,
      detectedLanguage,
      entryPoints,
      testLocations,
      availableScripts,
      readmeSummary,
      stats,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Sanitizes file content before sending to AI or UI (never exposes secret values).
   */
  static sanitizeFileContent(filePath: string, content: string): string {
    const baseName = path.basename(filePath).toLowerCase();
    if (SENSITIVE_FILE_NAMES.has(baseName)) {
      // Mask secret values in .env files
      return content.replace(/^([A-Z0-9_]+)=(.+)$/gm, '$1="[REDACTED_SECRET]"');
    }
    // Mask typical high-entropy tokens
    return content
      .replace(/(ghp_[a-zA-Z0-9]{36})/g, '[REDACTED_GH_TOKEN]')
      .replace(/(AIzaSy[a-zA-Z0-9_-]{33})/g, '[REDACTED_API_KEY]')
      .replace(/("password":\s*)"[^"]+"/g, '$1"***"');
  }
}
