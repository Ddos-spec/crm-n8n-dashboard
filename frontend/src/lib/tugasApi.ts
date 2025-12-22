/**
 * Tugas API Service
 * Koneksi ke n8n webhook untuk CRUD tugas/projects
 *
 * Webhook n8n akan menerima request dengan format:
 * { type: 'baca' | 'tambah' | 'edit' | 'hapus', data: {...} }
 *
 * Dan mengembalikan response dalam format:
 * { success: boolean, data?: any, error?: string }
 */

// URL webhook dari environment variable (set di Vercel)
const TUGAS_WEBHOOK_URL = import.meta.env.VITE_N8N_TUGAS_WEBHOOK || '';

// Types matching the database schema
export interface Task {
  id: string;
  name: string;
  estimatedDays: number;
  actualDays: number;
  startDate: Date;
  completed: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  tasks: Task[];
}

export type ProjectCategory = 'laser_cutting_metal' | 'laser_non_metal' | 'cnc_router' | 'ai';

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  initialDeadlineDays: number;
  actualDeadlineDays: number;
  startDate: Date;
  endDate: Date | null;
  status: 'active' | 'completed' | 'cancelled';
  teamMembers: TeamMember[];
}

// Request types untuk webhook n8n
export type WebhookRequestType = 'baca' | 'tambah' | 'edit' | 'hapus';

export interface WebhookRequest {
  type: WebhookRequestType;
  data?: unknown;
}

export interface WebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper untuk konversi date dari JSON
function parseProjectDates(project: Record<string, unknown>): Project {
  return {
    ...project,
    startDate: new Date(project.startDate as string),
    endDate: project.endDate ? new Date(project.endDate as string) : null,
    teamMembers: ((project.teamMembers as Record<string, unknown>[]) || []).map(member => ({
      ...member,
      tasks: ((member.tasks as Record<string, unknown>[]) || []).map(task => ({
        ...task,
        startDate: new Date(task.startDate as string),
      })) as Task[],
    })) as TeamMember[],
  } as Project;
}

// Helper untuk konversi project ke format database
function projectToDbFormat(project: Project) {
  return {
    id: project.id,
    name: project.name,
    category: project.category,
    initial_deadline_days: project.initialDeadlineDays,
    actual_deadline_days: project.actualDeadlineDays,
    start_date: project.startDate.toISOString(),
    end_date: project.endDate?.toISOString() || null,
    status: project.status,
    team_members: project.teamMembers.map(member => ({
      member_id: member.id,
      name: member.name,
      tasks: member.tasks.map(task => ({
        id: task.id,
        name: task.name,
        estimated_days: task.estimatedDays,
        actual_days: task.actualDays,
        start_date: task.startDate.toISOString(),
        completed: task.completed,
      })),
    })),
  };
}

// Main API call function
async function callWebhook<T>(request: WebhookRequest): Promise<WebhookResponse<T>> {
  if (!TUGAS_WEBHOOK_URL) {
    console.warn('VITE_N8N_TUGAS_WEBHOOK tidak di-set, menggunakan localStorage fallback');
    return { success: false, error: 'Webhook URL belum dikonfigurasi' };
  }

  try {
    const response = await fetch(TUGAS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result as WebhookResponse<T>;
  } catch (error) {
    console.error('Webhook call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Storage key untuk localStorage fallback
const PROJECT_STORAGE_KEY = 'tugas_projects';

// Tugas API object
export const tugasApi = {
  /**
   * Baca semua projects dari database
   */
  getAllProjects: async (): Promise<Project[]> => {
    const response = await callWebhook<Project[]>({
      type: 'baca',
      data: { action: 'get_all' },
    });

    if (response.success && response.data) {
      return response.data.map(parseProjectDates);
    }

    // Fallback ke localStorage jika webhook gagal
    console.warn('Fallback ke localStorage untuk getAllProjects');
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>[];
      return parsed.map(parseProjectDates);
    }
    return [];
  },

  /**
   * Baca single project by ID
   */
  getProjectById: async (projectId: string): Promise<Project | null> => {
    const response = await callWebhook<Project>({
      type: 'baca',
      data: { action: 'get_by_id', project_id: projectId },
    });

    if (response.success && response.data) {
      return parseProjectDates(response.data as unknown as Record<string, unknown>);
    }

    // Fallback ke localStorage
    console.warn('Fallback ke localStorage untuk getProjectById');
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>[];
      const found = parsed.find((p) => p.id === projectId);
      return found ? parseProjectDates(found) : null;
    }
    return null;
  },

  /**
   * Tambah project baru
   */
  createProject: async (project: Project): Promise<boolean> => {
    const response = await callWebhook({
      type: 'tambah',
      data: {
        action: 'create_project',
        project: projectToDbFormat(project),
      },
    });

    if (response.success) {
      return true;
    }

    // Fallback: simpan ke localStorage
    console.warn('Fallback ke localStorage untuk createProject');
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : [];
    projects.push(project);
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
    return true;
  },

  /**
   * Update project (termasuk status, team members, tasks)
   */
  updateProject: async (project: Project): Promise<boolean> => {
    const response = await callWebhook({
      type: 'edit',
      data: {
        action: 'update_project',
        project: projectToDbFormat(project),
      },
    });

    if (response.success) {
      return true;
    }

    // Fallback ke localStorage
    console.warn('Fallback ke localStorage untuk updateProject');
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const index = projects.findIndex((p) => p.id === project.id);
      if (index !== -1) {
        projects[index] = project;
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
      }
    }
    return true;
  },

  /**
   * Hapus project
   */
  deleteProject: async (projectId: string): Promise<boolean> => {
    const response = await callWebhook({
      type: 'hapus',
      data: {
        action: 'delete_project',
        project_id: projectId,
      },
    });

    if (response.success) {
      return true;
    }

    // Fallback ke localStorage
    console.warn('Fallback ke localStorage untuk deleteProject');
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const filtered = projects.filter((p) => p.id !== projectId);
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  /**
   * Tambah task ke team member
   */
  addTask: async (projectId: string, memberId: string, task: Task): Promise<boolean> => {
    const response = await callWebhook({
      type: 'tambah',
      data: {
        action: 'add_task',
        project_id: projectId,
        member_id: memberId,
        task: {
          id: task.id,
          name: task.name,
          estimated_days: task.estimatedDays,
          actual_days: task.actualDays,
          start_date: task.startDate.toISOString(),
          completed: task.completed,
        },
      },
    });

    return response.success;
  },

  /**
   * Update task (toggle completed, edit details)
   */
  updateTask: async (projectId: string, memberId: string, task: Task): Promise<boolean> => {
    const response = await callWebhook({
      type: 'edit',
      data: {
        action: 'update_task',
        project_id: projectId,
        member_id: memberId,
        task: {
          id: task.id,
          name: task.name,
          estimated_days: task.estimatedDays,
          actual_days: task.actualDays,
          start_date: task.startDate.toISOString(),
          completed: task.completed,
        },
      },
    });

    return response.success;
  },

  /**
   * Hapus task
   */
  deleteTask: async (projectId: string, memberId: string, taskId: string): Promise<boolean> => {
    const response = await callWebhook({
      type: 'hapus',
      data: {
        action: 'delete_task',
        project_id: projectId,
        member_id: memberId,
        task_id: taskId,
      },
    });

    return response.success;
  },

  /**
   * Sync semua data ke database (untuk migrasi dari localStorage)
   */
  syncAllProjects: async (projects: Project[]): Promise<boolean> => {
    const response = await callWebhook({
      type: 'tambah',
      data: {
        action: 'sync_all',
        projects: projects.map(projectToDbFormat),
      },
    });

    return response.success;
  },

  /**
   * Check apakah webhook tersedia
   */
  isWebhookAvailable: (): boolean => {
    return Boolean(TUGAS_WEBHOOK_URL);
  },
};

export default tugasApi;
