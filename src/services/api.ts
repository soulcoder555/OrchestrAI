import {
  User,
  Project,
  ProjectDetails,
  Task,
  TaskRun,
  CommitRecord,
  RepoMap,
} from '../types';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('orchestrator_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('orchestrator_token', token);
    } else {
      localStorage.removeItem('orchestrator_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signup(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // Projects
  async listProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>('/api/projects');
  }

  async createProject(name: string, description?: string): Promise<{ project: Project }> {
    return this.request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getProject(id: string): Promise<ProjectDetails> {
    return this.request<ProjectDetails>(`/api/projects/${id}`);
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Repositories
  async connectRepository(
    projectId: string,
    payload: { repoUrl?: string; isDemo?: boolean; githubToken?: string }
  ): Promise<{ repository: any }> {
    return this.request<{ repository: any }>(`/api/repo/${projectId}/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async scanRepository(projectId: string): Promise<{ repository: any; repoMap: RepoMap }> {
    return this.request<{ repository: any; repoMap: RepoMap }>(`/api/repo/${projectId}/scan`, {
      method: 'POST',
    });
  }

  // Planning
  async generatePlan(projectId: string, goal: string): Promise<{ tasks: Task[] }> {
    return this.request<{ tasks: Task[] }>(`/api/plan/${projectId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
  }

  async updateTasks(projectId: string, tasks: Partial<Task>[]): Promise<{ tasks: Task[] }> {
    return this.request<{ tasks: Task[] }>(`/api/plan/${projectId}/tasks`, {
      method: 'PUT',
      body: JSON.stringify({ tasks }),
    });
  }

  async approvePlan(projectId: string): Promise<{ success: boolean; project: Project }> {
    return this.request<{ success: boolean; project: Project }>(`/api/plan/${projectId}/plan/approve`, {
      method: 'POST',
    });
  }

  // Execution
  async executeTask(taskId: string): Promise<{ result: any; task: Task; taskRun: TaskRun }> {
    return this.request<{ result: any; task: Task; taskRun: TaskRun }>(`/api/tasks/${taskId}/execute`, {
      method: 'POST',
    });
  }

  async approveTask(
    taskId: string,
    commitMessage?: string
  ): Promise<{ success: boolean; approvalResult: any; task: Task; project: Project }> {
    return this.request<{ success: boolean; approvalResult: any; task: Task; project: Project }>(
      `/api/tasks/${taskId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ commitMessage }),
      }
    );
  }

  async rejectTask(taskId: string, feedback?: string): Promise<{ task: Task }> {
    return this.request<{ task: Task }>(`/api/tasks/${taskId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  }

  async getTaskRuns(taskId: string): Promise<{ runs: TaskRun[] }> {
    return this.request<{ runs: TaskRun[] }>(`/api/tasks/${taskId}/runs`);
  }

  async getCommits(projectId: string): Promise<{ commits: CommitRecord[] }> {
    return this.request<{ commits: CommitRecord[] }>(`/api/projects/${projectId}/commits`);
  }

  async checkHealth(): Promise<{ status: string; hasGeminiKey: boolean; hasGithubToken: boolean }> {
    return this.request<{ status: string; hasGeminiKey: boolean; hasGithubToken: boolean }>('/api/health');
  }
}

export const api = new ApiClient();
