import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import './Penugasan.css';

interface Task {
  id: string;
  name: string;
  estimatedDays: number;
  actualDays: number;
  startDate: Date;
  completed: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  tasks: Task[];
}

type ProjectCategory = 'laser_cutting_metal' | 'laser_non_metal' | 'cnc_router' | 'ai';

const PROJECT_CATEGORIES: {
  value: ProjectCategory;
  label: string;
  variant: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray';
}[] = [
  { value: 'laser_cutting_metal', label: 'Laser Cutting Metal', variant: 'red' },
  { value: 'laser_non_metal', label: 'Laser Non Metal', variant: 'yellow' },
  { value: 'cnc_router', label: 'CNC Router', variant: 'blue' },
  { value: 'ai', label: 'AI', variant: 'purple' }
];

interface Project {
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

// Temporary storage for demo purposes
const PROJECT_STORAGE_KEY = 'tugas_projects';

export default function Penugasan() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDuration, setTaskDuration] = useState('');
  const [taskDurationUnit, setTaskDurationUnit] = useState<'hours' | 'days'>('days');

  const getCategoryDisplay = (category: ProjectCategory) =>
    PROJECT_CATEGORIES.find(item => item.value === category) ?? PROJECT_CATEGORIES[0];

  const normalizeAiTeam = (loadedProject: Project): Project => {
    if (loadedProject.category !== 'ai') return loadedProject;

    const collectedTasks = loadedProject.teamMembers.flatMap(member => member.tasks || []);

    return {
      ...loadedProject,
      teamMembers: [
        { id: 'seto', name: 'SETO', tasks: collectedTasks }
      ]
    };
  };

  const updateTimeline = (baseProject: Project, members: TeamMember[]) => {
    const totalTaskDuration = members.reduce(
      (total, member) => total + member.tasks.reduce((sum, task) => sum + task.actualDays, 0),
      0
    );

    const newDeadline = Math.max(baseProject.initialDeadlineDays, totalTaskDuration);
    const newEndDate = new Date(baseProject.startDate);
    newEndDate.setTime(newEndDate.getTime() + newDeadline * 24 * 60 * 60 * 1000);

    return { newDeadline, newEndDate };
  };

  useEffect(() => {
    // Load project from localStorage (for demo)
    const storedProjects = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (storedProjects) {
      const projects: Project[] = JSON.parse(storedProjects).map((proj: Project) => ({
        ...proj,
        category: proj.category || PROJECT_CATEGORIES[0].value
      }));
      const foundProject = projects.find(p => p.id === projectId);
      if (foundProject) {
        // Convert date strings back to Date objects
        foundProject.startDate = new Date(foundProject.startDate);
        if (foundProject.endDate) foundProject.endDate = new Date(foundProject.endDate);
        foundProject.teamMembers.forEach(member => {
          member.tasks.forEach(task => {
            task.startDate = new Date(task.startDate);
          });
        });
        setProject(normalizeAiTeam(foundProject));
      }
    }
  }, [projectId]);

  const saveProject = (updatedProject: Project) => {
    const normalizedProject = normalizeAiTeam(updatedProject);
    setProject(normalizedProject);

    // Save to localStorage
    const storedProjects = localStorage.getItem(PROJECT_STORAGE_KEY);
    const projects: Project[] = storedProjects ? JSON.parse(storedProjects) : [];
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex >= 0) {
      projects[projectIndex] = normalizedProject;
    } else {
      projects.push(normalizedProject);
    }

    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  };

  const handleAddTask = () => {
    if (!project || !selectedMember || !taskName || !taskDuration) return;

    const durationDays = taskDurationUnit === 'hours'
      ? parseFloat(taskDuration) / 24
      : parseFloat(taskDuration);

    if (Number.isNaN(durationDays) || durationDays <= 0) return;

    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      estimatedDays: durationDays,
      actualDays: durationDays,
      startDate: new Date(),
      completed: false
    };

    const updatedMembers = project.teamMembers.map(member =>
      member.id === selectedMember
        ? { ...member, tasks: [...member.tasks, newTask] }
        : member
    );

    const { newDeadline, newEndDate } = updateTimeline(project, updatedMembers);

    const updatedProject = {
      ...project,
      teamMembers: updatedMembers,
      actualDeadlineDays: newDeadline,
      endDate: newEndDate
    };

    saveProject(updatedProject);

    setShowTaskModal(false);
    setTaskName('');
    setTaskDuration('');
    setTaskDurationUnit('days');
    setSelectedMember(null);
  };

  const handleAddDay = (memberId: string, taskId: string) => {
    if (!project) return;

    const updatedMembers = project.teamMembers.map(member => {
      if (member.id === memberId) {
        const updatedTasks = member.tasks.map(task =>
          task.id === taskId
            ? { ...task, actualDays: task.actualDays + 1 }
            : task
        );
        return { ...member, tasks: updatedTasks };
      }
      return member;
    });

    const { newDeadline, newEndDate } = updateTimeline(project, updatedMembers);

    const updatedProject = {
      ...project,
      teamMembers: updatedMembers,
      actualDeadlineDays: newDeadline,
      endDate: newEndDate
    };

    saveProject(updatedProject);
  };

  const handleCompleteTask = (memberId: string, taskId: string) => {
    if (!project) return;

    const updatedMembers = project.teamMembers.map(member => {
      if (member.id === memberId) {
        const updatedTasks = member.tasks.map(task =>
          task.id === taskId
            ? { ...task, completed: true }
            : task
        );
        return { ...member, tasks: updatedTasks };
      }
      return member;
    });

    const updatedProject = {
      ...project,
      teamMembers: updatedMembers
    };

    saveProject(updatedProject);
  };

  const formatDuration = (days: number) => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} jam`;
    }
    return `${Math.round(days * 10) / 10} hari`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getMemberWorkload = (member: TeamMember) => {
    return member.tasks.reduce((sum, task) => sum + task.actualDays, 0);
  };

  if (!project) {
    return (
      <div className="page">
        <div className="page-header">
          <Button
            variant="ghost"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/tugas')}
          >
            Kembali
          </Button>
        </div>
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>Proyek tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            variant="ghost"
            icon={<ArrowLeft size={18} />}
            onClick={() => navigate('/tugas')}
          >
            Kembali
          </Button>
          <div>
            <h1 className="page-title">{project.name}</h1>
            <div className="project-badges" style={{ justifyContent: 'flex-start' }}>
              <Badge variant={getCategoryDisplay(project.category).variant}>
                {getCategoryDisplay(project.category).label}
              </Badge>
              <p className="page-subtitle" style={{ margin: 0 }}>Penugasan Tim</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="project-summary">
            <div className="summary-item">
              <span className="summary-label">Tanggal Mulai</span>
              <span className="summary-value">{formatDate(project.startDate)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Target Awal</span>
              <span className="summary-value">{formatDuration(project.initialDeadlineDays)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Deadline Aktual</span>
              <span className="summary-value">{formatDuration(project.actualDeadlineDays)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Target Selesai</span>
              <span className="summary-value">{project.endDate ? formatDate(project.endDate) : '-'}</span>
            </div>
            {project.actualDeadlineDays !== project.initialDeadlineDays && (
              <div className="summary-alert">
                <AlertCircle size={16} />
                <span>Deadline diperpanjang {formatDuration(project.actualDeadlineDays - project.initialDeadlineDays)} dari estimasi awal</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="team-grid">
        {project.teamMembers.map(member => (
          <Card key={member.id}>
            <CardHeader
              title={member.name}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setSelectedMember(member.id);
                    setShowTaskModal(true);
                  }}
                >
                  Tambah Tugas
                </Button>
              }
            />
            <CardBody>
              <div className="member-stats">
                <div className="member-stat">
                  <span className="stat-label">Total Tugas</span>
                  <span className="stat-value">{member.tasks.length}</span>
                </div>
                <div className="member-stat">
                  <span className="stat-label">Selesai</span>
                  <span className="stat-value">{member.tasks.filter(t => t.completed).length}</span>
                </div>
                <div className="member-stat">
                  <span className="stat-label">Total Waktu</span>
                  <span className="stat-value">{formatDuration(getMemberWorkload(member))}</span>
                </div>
              </div>

              <div className="tasks-list">
                {member.tasks.length === 0 ? (
                  <div className="empty-tasks">
                    <p>Belum ada tugas</p>
                  </div>
                ) : (
                  member.tasks.map(task => (
                    <div
                      key={task.id}
                      className={`task-item ${task.completed ? 'completed' : ''}`}
                    >
                      <div className="task-info">
                        <div className="task-header">
                          <h4 className="task-name">{task.name}</h4>
                          {task.completed && (
                            <Badge variant="green" dot>Selesai</Badge>
                          )}
                        </div>
                        <div className="task-details">
                          <div className="task-detail">
                            <Calendar size={14} />
                            <span>{formatDate(task.startDate)}</span>
                          </div>
                          <div className="task-detail">
                            <Clock size={14} />
                            <span>
                              {formatDuration(task.actualDays)}
                              {task.actualDays !== task.estimatedDays && (
                                <span className="task-extended">
                                  {' '}(+{formatDuration(task.actualDays - task.estimatedDays)})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!task.completed && (
                        <div className="task-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddDay(member.id, task.id)}
                          >
                            +1 Hari
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<CheckCircle size={16} />}
                            onClick={() => handleCompleteTask(member.id, task.id)}
                          >
                            Selesai
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <>
          <div
            className="modal-backdrop"
            onClick={() => {
              setShowTaskModal(false);
              setSelectedMember(null);
            }}
          />
          <div className="modal">
            <div className="modal-header">
              <h2>Tambah Tugas Baru</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedMember(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Untuk</label>
                <div className="assigned-member">
                  {project.teamMembers.find(m => m.id === selectedMember)?.name}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="task-name">Nama Tugas</label>
                <Input
                  id="task-name"
                  type="text"
                  placeholder="Apa yang dikerjakan?"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-duration">Estimasi Waktu</label>
                <div className="deadline-input-group">
                  <Input
                    id="task-duration"
                    type="number"
                    placeholder="Berapa lama?"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(e.target.value)}
                    min="0"
                    step="0.5"
                  />
                  <select
                    className="deadline-unit-select"
                    value={taskDurationUnit}
                    onChange={(e) => setTaskDurationUnit(e.target.value as 'hours' | 'days')}
                  >
                    <option value="hours">Jam</option>
                    <option value="days">Hari</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedMember(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTask}
                disabled={!taskName || !taskDuration}
              >
                Tambah Tugas
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
