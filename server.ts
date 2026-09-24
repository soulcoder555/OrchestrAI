import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/auth-routes.js';
import { projectRouter } from './server/routes/project-routes.js';
import { repoRouter } from './server/routes/repo-routes.js';
import { planRouter } from './server/routes/plan-routes.js';
import { executionRouter } from './server/routes/execution-routes.js';
import { ensureDemoUser } from './server/auth/auth.js';
import { db } from './server/db/storage.js';
import { GitHubService } from './server/services/github-service.js';
import { RepoScanner } from './server/services/repo-scanner.js';
import { WorkspaceManager } from './server/services/workspace-manager.js';

dotenv.config();

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check endpoint (unauthenticated)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasGithubToken: !!process.env.GITHUB_TOKEN,
    });
  });

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/repo', repoRouter);
  app.use('/api/plan', planRouter);
  app.use('/api', executionRouter);


  // Ensure default demo user and demo project exists
  try {
    const demoUser = await ensureDemoUser();
    const existingProjects = db.listProjectsByUserId(demoUser.id);

    if (existingProjects.length === 0) {
      const demoProj = db.createProject({
        name: 'Auth Security Service',
        description: 'Production microservice with token rotation and verification',
        goal: 'Add secure refresh token rotation and token revocation to the authentication system.',
        status: 'READY',
        userId: demoUser.id,
        activeBranch: 'ai/orchestrator-execution',
        defaultBranch: 'main',
      });

      // Seed the workspace files
      await GitHubService.seedDemoWorkspace(demoProj.id);
      const wsPath = WorkspaceManager.getWorkspacePath(demoProj.id);
      const repoMap = await RepoScanner.scanDirectory(wsPath);

      db.upsertRepository({
        projectId: demoProj.id,
        owner: 'demo-org',
        repoName: 'auth-security-service',
        githubUrl: 'https://github.com/demo-org/auth-security-service',
        defaultBranch: 'main',
        workingBranch: 'ai/orchestrator-execution',
        isLocalDemo: true,
        repoMapJson: JSON.stringify(repoMap),
        scannedAt: new Date().toISOString(),
      });

      db.upsertFact(demoProj.id, 'tech_stack', 'runtime', 'Node.js (TypeScript)');
      db.upsertFact(demoProj.id, 'architecture', 'crypto', 'Node.js built-in crypto (HMAC SHA-256)');
      db.upsertFact(demoProj.id, 'validation', 'test_runner', 'node --test');

      // Pre-seed an initial ordered task plan ready for review or execution
      db.setTasksForProject(demoProj.id, [
        {
          orderIndex: 1,
          title: 'Implement Refresh Token Generator and Storage',
          description: 'Add refresh token generation with UUIDs, expiration tracking, and revocation store in src/token.ts.',
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 2,
        },
        {
          orderIndex: 2,
          title: 'Implement Secure Token Rotation and Revocation Logic',
          description: 'Implement rotateRefreshToken() method that verifies the old token, revokes it, and issues a fresh token pair.',
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 2,
        },
        {
          orderIndex: 3,
          title: 'Add Automated Tests for Token Rotation & Revocation',
          description: 'Add comprehensive test cases in test/token.test.js to verify rotation, expiry, and replay-attack rejection.',
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 2,
        },
      ]);

      db.logActivity({
        projectId: demoProj.id,
        type: 'REPO_SCANNED',
        title: 'Demo project workspace pre-seeded',
        details: 'Auth Security Service ready for planning, execution, and validation.',
      });
    } else {
      // Ensure existing projects have stats populated
      for (const proj of existingProjects) {
        const repo = db.getRepositoryByProjectId(proj.id);
        if (repo) {
          let hasStats = false;
          try {
            if (repo.repoMapJson) {
              const parsed = JSON.parse(repo.repoMapJson);
              if (parsed.stats && parsed.stats.totalFiles > 0) hasStats = true;
            }
          } catch (e) {}

          if (!hasStats) {
            try {
              const wsPath = WorkspaceManager.getWorkspacePath(proj.id);
              if (fs.existsSync(wsPath)) {
                const repoMap = await RepoScanner.scanDirectory(wsPath);
                db.upsertRepository({
                  ...repo,
                  repoMapJson: JSON.stringify(repoMap),
                  scannedAt: new Date().toISOString(),
                });
              }
            } catch (err) {
              console.warn(`Could not refresh stats for project ${proj.id}:`, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Initial seeding note:', err);
  }

  // Frontend mounting: Vite dev middleware or static dist
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Project Orchestrator] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
