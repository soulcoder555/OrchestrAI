import { z } from 'zod';

// --- Plan Schema & Types ---
export const PlannedTaskSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(500),
});

export const PlanOutputSchema = z.object({
  planSummary: z.string().min(5),
  detectedStackSummary: z.string().optional(),
  tasks: z.array(PlannedTaskSchema).min(1).max(20),
});

export type PlannedTask = z.infer<typeof PlannedTaskSchema>;
export type PlanOutput = z.infer<typeof PlanOutputSchema>;

export interface PlanRequest {
  goal: string;
  repoMap: {
    files: string[];
    importantConfigs: string[];
    detectedFramework: string;
    detectedLanguage: string;
    entryPoints: string[];
    testLocations: string[];
    availableScripts: {
      lint?: string;
      typecheck?: string;
      test?: string;
      build?: string;
    };
    manifest?: Record<string, any>;
    readmeSummary?: string;
  };
  projectFacts?: Array<{ category: string; key: string; value: string }>;
}

// --- Code Change Schema & Types ---
export const FileChangeProposalSchema = z.object({
  filePath: z.string().min(1),
  changeType: z.enum(['create', 'modify', 'delete']),
  diffOrContent: z.string(), // complete new content for created files, or unified diff/patch or updated file content
  explanation: z.string(),
});

export const CodeChangeOutputSchema = z.object({
  summary: z.string().min(3),
  reasoningSummary: z.string().min(5),
  filesChanged: z.array(FileChangeProposalSchema).min(1),
  testsExpected: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
});

export type FileChangeProposal = z.infer<typeof FileChangeProposalSchema>;
export type CodeChangeOutput = z.infer<typeof CodeChangeOutputSchema>;

export interface CodeChangeRequest {
  task: {
    id: string;
    title: string;
    description: string;
    orderIndex: number;
  };
  goal: string;
  relevantContext: {
    files: Array<{ path: string; content: string }>;
    projectFacts: Array<{ category: string; key: string; value: string }>;
    packageScripts?: Record<string, string>;
    techStack: string;
  };
  retryContext?: {
    attemptNumber: number;
    previousProposal?: CodeChangeOutput;
    rawValidationErrors: string;
  };
}

export interface AIProvider {
  name: string;
  model: string;
  generatePlan(request: PlanRequest): Promise<PlanOutput>;
  generateCodeChange(request: CodeChangeRequest): Promise<CodeChangeOutput>;
}
