import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, CheckCircle, Calendar, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { tugasApi, type Project, type TeamMember, type Task, type ProjectCategory } from '../lib/tugasApi';
import './Penugasan.css';

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

export default function Penugasan() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDurationUnit, setTaskDurationUnit] = useState<'hours' | 'days'>('days');
  const [taskStartDate, setTaskStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taskEndDate, setTaskEndDate] = useState('');
  const [taskStartTime, setTaskStartTime] = useState('08:00');
  const [taskEndTime, setTaskEndTime] = useState('17:00');

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

  // Load project from API
  const loadProject = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const loadedProject = await tugasApi.getProjectById(projectId);
      if (loadedProject) {
        setProject(normalizeAiTeam(loadedProject));
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project) {
      setTaskStartDate(project.startDate.toISOString().split('T')[0]);
      setTaskEndDate('');
      setTaskStartTime('08:00');
      setTaskEndTime('17:00');
    }
  }, [project]);

  const saveProject = async (updatedProject: Project) => {
    const normalizedProject = normalizeAiTeam(updatedProject);
    setProject(normalizedProject);

    // Save to API
    await tugasApi.updateProject(normalizedProject);
  };

  const handleAddTask = () => {
    if (!project || !selectedMember || !taskName) return;

    const isDayMode = taskDurationUnit === 'days';

    if (isDayMode && (!taskStartDate || !taskEndDate)) return;
    if (!isDayMode && (!taskStartTime || !taskEndTime)) return;

    let startDate: Date;
    let endDate: Date;
    let durationDays = 0;

    if (isDayMode) {
      startDate = new Date(`${taskStartDate}T00:00:00`);
      endDate = new Date(`${taskEndDate}T23:59:59`);

      if (endDate < startDate) {
        alert('Tanggal selesai harus setelah tanggal mulai.');
        return;
      }

      durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      const today = new Date();
      const [startHour, startMinute] = taskStartTime.split(':').map(Number);
      const [endHour, endMinute] = taskEndTime.split(':').map(Number);

      startDate = new Date(today);
      startDate.setHours(startHour, startMinute, 0, 0);

      endDate = new Date(today);
      endDate.setHours(endHour, endMinute, 0, 0);

      if (endDate <= startDate) {
        alert('Jam selesai harus setelah jam mulai.');
        return;
      }

      durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    }

    if (Number.isNaN(durationDays) || durationDays <= 0) return;

    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      estimatedDays: durationDays,
      actualDays: durationDays,
      startDate,
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
    setTaskDurationUnit('days');
    setSelectedMember(null);
    setTaskStartDate(project.startDate.toISOString().split('T')[0]);
    setTaskEndDate('');
    setTaskStartTime('08:00');
    setTaskEndTime('17:00');
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

  const getTaskEndDate = (startDate: Date, days: number) => {
    const end = new Date(startDate);
    end.setTime(end.getTime() + days * 24 * 60 * 60 * 1000);
    return end;
  };

  if (isLoading) {
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
          <RefreshCw size={48} className="spin" />
          <p>Memuat data proyek...</p>
        </div>
      </div>
    );
  }

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
                            <span>Mulai: {formatDate(task.startDate)}</span>
                          </div>
                          <div className="task-detail">
                            <ArrowRight size={14} />
                            <span>
                              Selesai: {formatDate(getTaskEndDate(task.startDate, task.actualDays))}
                              {task.actualDays !== task.estimatedDays && (
                                <span className="task-extended" style={{ marginLeft: '4px', fontSize: '0.85em' }}>
                                  (Ex: {formatDuration(task.actualDays - task.estimatedDays)})
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
                  <select
                    className="deadline-unit-select"
                    value={taskDurationUnit}
                    onChange={(e) => setTaskDurationUnit(e.target.value as 'hours' | 'days')}
                  >
                    <option value="days">Hari</option>
                    <option value="hours">Jam</option>
                  </select>
                </div>

                {taskDurationUnit === 'days' ? (
                  <div className="deadline-range">
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Mulai</span>
                      <Input
                        type="date"
                        value={taskStartDate}
                        onChange={(e) => setTaskStartDate(e.target.value)}
                      />
                    </div>
                    <span className="range-separator">→</span>
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Selesai</span>
                      <Input
                        type="date"
                        value={taskEndDate}
                        min={taskStartDate}
                        onChange={(e) => setTaskEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="deadline-range">
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Mulai</span>
                      <Input
                        type="time"
                        value={taskStartTime}
                        onChange={(e) => setTaskStartTime(e.target.value)}
                      />
                    </div>
                    <span className="range-separator">→</span>
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Selesai</span>
                      <Input
                        type="time"
                        value={taskEndTime}
                        onChange={(e) => setTaskEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
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
                disabled={!taskName || (
                  taskDurationUnit === 'days'
                    ? !taskStartDate || !taskEndDate
                    : !taskStartTime || !taskEndTime
                )}
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
