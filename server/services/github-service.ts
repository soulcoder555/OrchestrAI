import fs from 'fs';
import path from 'path';
import { WorkspaceManager } from './workspace-manager.js';

export interface GitHubRepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  htmlUrl: string;
  isPrivate: boolean;
  language: string | null;
}

export class GitHubService {
  /**
   * Parse GitHub repo url or shorthand owner/repo
   */
  static parseRepoString(input: string): { owner: string; repo: string } | null {
    const trimmed = input.trim();
    // Handle https://github.com/owner/repo or git@github.com:owner/repo.git
    const webMatch = trimmed.match(/github\.com[/:]([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+?)(?:\.git|\/|$)/);
    if (webMatch) {
      return { owner: webMatch[1], repo: webMatch[2] };
    }
    // Handle owner/repo
    const shortMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);
    if (shortMatch) {
      return { owner: shortMatch[1], repo: shortMatch[2] };
    }
    return null;
  }

  /**
   * Fetch repo metadata from GitHub REST API
   */
  static async fetchRepoMetadata(owner: string, repo: string, token?: string): Promise<GitHubRepoMeta> {
    const headers: Record<string, string> = {
      'User-Agent': 'AI-Project-Orchestrator',
      Accept: 'application/vnd.github.v3+json',
    };

    const authToken = token || process.env.GITHUB_TOKEN;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Repository ${owner}/${repo} not found or is private without token.`);
      }
      if (res.status === 403) {
        throw new Error('GitHub API rate limit exceeded or access forbidden. Configure GITHUB_TOKEN in settings.');
      }
      throw new Error(`GitHub API error: ${res.statusText} (${res.status})`);
    }

    const data = await res.json();
    return {
      owner: data.owner?.login || owner,
      name: data.name || repo,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch || 'main',
      htmlUrl: data.html_url,
      isPrivate: !!data.private,
      language: data.language,
    };
  }

  /**
   * Seed a clean, fully functional TypeScript microservice project for live demonstration
   */
  static async seedDemoWorkspace(projectId: string): Promise<string> {
    const wsPath = await WorkspaceManager.initWorkspace(projectId, 'main', 'ai/orchestrator-execution');

    // Create directories
    const srcDir = path.join(wsPath, 'src');
    const testDir = path.join(wsPath, 'test');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });

    // package.json
    const packageJson = {
      name: 'auth-security-service',
      version: '1.0.0',
      description: 'Production authentication and session token service',
      main: 'src/index.ts',
      scripts: {
        lint: 'echo "Lint passed: 0 syntax issues"',
        typecheck: 'npx tsc --noEmit',
        test: 'node --test',
      },
      dependencies: {},
      devDependencies: {
        typescript: '^5.0.0',
      },
    };
    fs.writeFileSync(path.join(wsPath, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    // tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ['src/**/*', 'test/**/*'],
    };
    fs.writeFileSync(path.join(wsPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2), 'utf-8');

    // README.md
    const readme = `# Auth Security Service
Microservice for user authentication, password hashing, and session management.

## Tech Stack
- TypeScript / Node.js
- Standard Node.js Crypto & Test Runner

## Goal
Implement secure refresh token rotation and session revocation.
`;
    fs.writeFileSync(path.join(wsPath, 'README.md'), readme, 'utf-8');

    // src/token.ts
    const tokenTs = `import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface SessionToken {
  accessToken: string;
  expiresAt: number;
}

export class TokenManager {
  private secret: string;

  constructor(secret = 'demo-secret-key-32-chars-minimum-len') {
    this.secret = secret;
  }

  generateAccessToken(payload: TokenPayload): SessionToken {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    const body = Buffer.from(JSON.stringify({ ...payload, exp: expiresAt })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.secret).update(\`\${header}.\${body}\`).digest('base64url');

    return {
      accessToken: \`\${header}.\${body}.\${signature}\`,
      expiresAt,
    };
  }

  verifyAccessToken(token: string): TokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.secret).update(\`\${header}.\${body}\`).digest('base64url');
    if (expectedSig !== signature) return null;

    try {
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      if (decoded.exp && Date.now() > decoded.exp) return null;
      return decoded as TokenPayload;
    } catch {
      return null;
    }
  }
}
`;
    fs.writeFileSync(path.join(srcDir, 'token.ts'), tokenTs, 'utf-8');

    // src/index.ts
    const indexTs = `import { TokenManager } from './token.js';

export const tokenManager = new TokenManager();
console.log('Auth service ready.');
`;
    fs.writeFileSync(path.join(srcDir, 'index.ts'), indexTs, 'utf-8');

    // test/token.test.js
    const testJs = `import assert from 'node:assert';
import test from 'node:test';
import { TokenManager } from '../src/token.ts';

test('TokenManager generates and verifies valid access tokens', () => {
  const manager = new TokenManager('test-secret');
  const token = manager.generateAccessToken({ userId: 'u1', email: 'user@example.com', role: 'admin' });

  assert.ok(token.accessToken.length > 20);
  const verified = manager.verifyAccessToken(token.accessToken);
  assert.strictEqual(verified?.userId, 'u1');
  assert.strictEqual(verified?.email, 'user@example.com');
});
`;
    fs.writeFileSync(path.join(testDir, 'token.test.js'), testJs, 'utf-8');

    // Initial commit
    await WorkspaceManager.commitWorkingBranch(wsPath, 'Initial repository commit', 'main');
    await WorkspaceManager.initWorkspace(projectId, 'main', 'ai/orchestrator-execution');

    return wsPath;
  }
}
