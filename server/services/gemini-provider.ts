import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  PlanRequest,
  PlanOutput,
  PlanOutputSchema,
  CodeChangeRequest,
  CodeChangeOutput,
  CodeChangeOutputSchema,
} from './ai-provider.interface.js';

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  model = 'gemini-3.8-flash';
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error(
          'GEMINI_API_KEY is not configured in the environment. Please set GEMINI_API_KEY in your environment or Secrets panel.'
        );
      }
      this.ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.ai;
  }

  async generatePlan(request: PlanRequest): Promise<PlanOutput> {
    const client = this.getClient();

    const systemInstruction = `You are a senior software architect and project planner for AI Project Orchestrator.
Your goal is to inspect a repository map, tech stack, and user goal, then create an ordered, actionable, non-overlapping task list for implementation.

CRITICAL RULES:
1. Each task must be specific, granular, actionable, and testable independently.
2. Order tasks logically: dependencies first (e.g. models/schemas, core services, endpoints, integration, tests).
3. Do NOT invent a DAG or parallel steps. Provide a sequential list of 3-8 tasks.
4. Adhere strictly to the detected language, frameworks, and conventions in the repo map.
5. Return ONLY a valid JSON object matching the requested schema. No markdown backticks or commentary outside JSON.`;

    const prompt = `Repository Tech Stack:
- Detected Language: ${request.repoMap.detectedLanguage}
- Detected Framework: ${request.repoMap.detectedFramework}
- Key Files: ${request.repoMap.files.slice(0, 40).join(', ')}
- Config Files: ${request.repoMap.importantConfigs.join(', ')}
- Available Validation Scripts: ${JSON.stringify(request.repoMap.availableScripts)}
${request.repoMap.manifest ? `- Manifest Scripts: ${JSON.stringify(request.repoMap.manifest.scripts || {})}` : ''}
${request.repoMap.readmeSummary ? `- README Summary: ${request.repoMap.readmeSummary}` : ''}

Project Facts:
${(request.projectFacts || []).map((f) => `- [${f.category}] ${f.key}: ${f.value}`).join('\n') || 'None'}

User Goal:
"${request.goal}"

Generate an ordered implementation plan in valid JSON with this exact shape:
{
  "planSummary": "Short explanation of overall strategy",
  "detectedStackSummary": "Summary of repo architecture",
  "tasks": [
    {
      "title": "Clear concise task title",
      "description": "Precise instruction on what files to touch and what to implement or verify"
    }
  ]
}`;

    const response = await client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch (err) {
      // Strip potential markdown markers if model wrapped in ```json ... ```
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const validated = PlanOutputSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`AI generated plan failed schema validation: ${validated.error.message}`);
    }

    return validated.data;
  }

  async generateCodeChange(request: CodeChangeRequest): Promise<CodeChangeOutput> {
    const client = this.getClient();

    const isRetry = !!request.retryContext;
    const systemInstruction = `You are a staff software engineer in the AI Project Orchestrator execution loop.
Your job is to generate a structured code change for a single task within an isolated Git workspace.

RULES:
1. ONLY modify or create files that are directly necessary for this specific task.
2. Return complete, syntactically correct file contents for new or modified files, or precise full updated file content in "diffOrContent".
3. For each file in "filesChanged":
   - "filePath": relative path from repo root (no leading slash, no '..').
   - "changeType": "create" | "modify" | "delete"
   - "diffOrContent": the full updated content of the file (preferred for reliability) or complete replacement code.
   - "explanation": brief note on why this change was made.
4. Output MUST be valid JSON conforming to the schema.
${
  isRetry
    ? `IMPORTANT: This is RETRY attempt #${request.retryContext?.attemptNumber}. The previous change failed validation. You MUST inspect the raw validation errors provided and fix the exact syntax, type, or test errors.`
    : ''
}`;

    let contextFilesText = '';
    for (const f of request.relevantContext.files) {
      contextFilesText += `\n--- File: ${f.path} ---\n${f.content.slice(0, 5000)}\n`;
    }

    let retryPromptSection = '';
    if (request.retryContext) {
      retryPromptSection = `
⚠️ PREVIOUS ATTEMPT FAILED VALIDATION (Attempt #${request.retryContext.attemptNumber}):
Raw Validation Output / Errors:
${request.retryContext.rawValidationErrors}

Please analyze the validation error output carefully. Fix the compilation errors, type mismatches, or test failures.
`;
    }

    const prompt = `Project Goal: "${request.goal}"
Current Task (${request.task.orderIndex}): "${request.task.title}"
Task Description: ${request.task.description}

Repository Stack: ${request.relevantContext.techStack}
${(request.relevantContext.projectFacts || []).length > 0 ? `Project Facts:\n${request.relevantContext.projectFacts.map((f) => `- ${f.key}: ${f.value}`).join('\n')}` : ''}

Relevant File Context:
${contextFilesText || 'No source files provided; create files as needed.'}
${retryPromptSection}

Generate the structured code change proposal in JSON with this exact schema:
{
  "summary": "Brief summary of code modifications",
  "reasoningSummary": "Technical justification of the changes",
  "filesChanged": [
    {
      "filePath": "src/example.ts",
      "changeType": "modify", // "create" | "modify" | "delete"
      "diffOrContent": "FULL_UPDATED_CONTENT_OF_THE_FILE",
      "explanation": "Why this file was created/updated"
    }
  ],
  "testsExpected": ["auth.test.ts passes", "lint passes with 0 errors"],
  "warnings": [],
  "assumptions": []
}`;

    const response = await client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch (err) {
      const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const validated = CodeChangeOutputSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`AI generated code change failed schema validation: ${validated.error.message}`);
    }

    return validated.data;
  }
}

export const defaultAIProvider = new GeminiProvider();
