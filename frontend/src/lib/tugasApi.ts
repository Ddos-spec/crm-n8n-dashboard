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
  // Handle both snake_case (from DB) and camelCase field names
  const id = (project.id as string) || '';
  const name = (project.name as string) || '';
  const category = (project.category as ProjectCategory) || 'laser_cutting_metal';
  const initialDeadlineDays = parseFloat((project.initial_deadline_days || project.initialDeadlineDays || 0) as string);
  const actualDeadlineDays = parseFloat((project.actual_deadline_days || project.actualDeadlineDays || 0) as string);
  const startDateRaw = (project.start_date || project.startDate) as string;
  const endDateRaw = (project.end_date || project.endDate) as string | null;
  const status = (project.status as 'active' | 'completed' | 'cancelled') || 'active';

  // Parse team_members if exists, otherwise create default
  const teamMembersRaw = (project.team_members || project.teamMembers || project.team_members_data) as unknown;
  let teamMembers: TeamMember[] = [];

  if (teamMembersRaw) {
    // If it's a JSON string, parse it
    const membersData = typeof teamMembersRaw === 'string' ? JSON.parse(teamMembersRaw) : teamMembersRaw;
    if (Array.isArray(membersData)) {
      teamMembers = membersData.map((member: Record<string, unknown>) => ({
        id: (member.member_id || member.id) as string,
        name: member.name as string,
        tasks: ((member.tasks as Record<string, unknown>[]) || []).map(task => ({
          id: task.id as string,
          name: task.name as string,
          estimatedDays: parseFloat((task.estimated_days || task.estimatedDays || 0) as string),
          actualDays: parseFloat((task.actual_days || task.actualDays || 0) as string),
          startDate: new Date((task.start_date || task.startDate) as string),
          completed: task.completed as boolean,
        })),
      }));
    }
  }

  // If no team members, create default based on category
  if (teamMembers.length === 0) {
    if (category === 'ai') {
      teamMembers = [{ id: 'seto', name: 'SETO', tasks: [] }];
    } else {
      teamMembers = [
        { id: '1', name: 'RUDY', tasks: [] },
        { id: '2', name: 'DOMAN', tasks: [] },
        { id: '3', name: 'KOJEK', tasks: [] }
      ];
    }
  }

  return {
    id,
    name,
    category,
    initialDeadlineDays,
    actualDeadlineDays,
    startDate: new Date(startDateRaw),
    endDate: endDateRaw ? new Date(endDateRaw) : null,
    status,
    teamMembers,
  };
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
async function callWebhook<T>(request: WebhookRequest): Promise<WebhookResponse<T> | T> {
  if (!TUGAS_WEBHOOK_URL) {
    console.warn('VITE_N8N_TUGAS_WEBHOOK tidak di-set');
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

    // If result is already an array (raw DB response), return it directly
    if (Array.isArray(result)) {
      return result as T;
    }

    // Otherwise return as WebhookResponse
    return result as WebhookResponse<T>;
  } catch (error) {
    console.error('Webhook call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

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

    // Handle both formats:
    // 1. { success: true, data: [...] } - wrapped format
    // 2. [...] - raw array from database
    if (response.success && response.data) {
      // Wrapped format
      return response.data.map(parseProjectDates);
    } else if (Array.isArray(response)) {
      // Raw array format (direct from database)
      return (response as unknown as Record<string, unknown>[]).map(parseProjectDates);
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

    return response.success;
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

    return response.success;
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

    return response.success;
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
   * Check apakah webhook tersedia
   */
  isWebhookAvailable: (): boolean => {
    return Boolean(TUGAS_WEBHOOK_URL);
  },
};

export default tugasApi;
