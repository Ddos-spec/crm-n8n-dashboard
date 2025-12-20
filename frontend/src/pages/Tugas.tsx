import { useState, useMemo, useEffect } from 'react';
import { Plus, Clock, CheckCircle, XCircle, Users, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import './Tugas.css';

interface TeamMember {
  id: string;
  name: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  estimatedDays: number;
  actualDays: number;
  startDate: Date;
  completed: boolean;
}

type ProjectCategory = 'laser_cutting_metal' | 'laser_non_metal' | 'cnc_router' | 'ai';

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

const PROJECT_STORAGE_KEY = 'tugas_projects';

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

export default function Tugas() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<ProjectCategory>(PROJECT_CATEGORIES[0].value);
  const [newProjectDeadlineUnit, setNewProjectDeadlineUnit] = useState<'hours' | 'days'>('days');
  const [newProjectStartDate, setNewProjectStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newProjectEndDate, setNewProjectEndDate] = useState('');
  const [newProjectStartTime, setNewProjectStartTime] = useState('08:00');
  const [newProjectEndTime, setNewProjectEndTime] = useState('17:00');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Load projects from localStorage on mount
  useEffect(() => {
    const storedProjects = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (storedProjects) {
      const parsedProjects: Project[] = JSON.parse(storedProjects);
      // Convert date strings back to Date objects
      const normalized = parsedProjects.map(project => {
        const withCategory = project.category ? project : { ...project, category: PROJECT_CATEGORIES[0].value };
        withCategory.startDate = new Date(withCategory.startDate);
        if (withCategory.endDate) withCategory.endDate = new Date(withCategory.endDate);
        withCategory.teamMembers.forEach(member => {
          member.tasks.forEach(task => {
            task.startDate = new Date(task.startDate);
          });
        });

        return ensureAiTeam(withCategory);
      });
      setProjects(normalized);
    }
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status === 'active'),
    [projects]
  );

  const historyProjects = useMemo(
    () => projects.filter(p => p.status === 'completed' || p.status === 'cancelled'),
    [projects]
  );

  const buildTeamMembers = (category: ProjectCategory): TeamMember[] => {
    if (category === 'ai') {
      return [
        { id: 'seto', name: 'SETO', tasks: [] }
      ];
    }

    return [
      { id: '1', name: 'RUDY', tasks: [] },
      { id: '2', name: 'DOMAN', tasks: [] },
      { id: '3', name: 'KOJEK', tasks: [] }
    ];
  };

  const ensureAiTeam = (project: Project): Project => {
    if (project.category !== 'ai') return project;

    const allTasks = project.teamMembers.flatMap(member => member.tasks || []);

    return {
      ...project,
      teamMembers: [
        { id: 'seto', name: 'SETO', tasks: allTasks }
      ]
    };
  };

  const handleCreateProject = () => {
    if (!newProjectName) return;

    const isDayMode = newProjectDeadlineUnit === 'days';

    if (isDayMode && (!newProjectStartDate || !newProjectEndDate)) return;
    if (!isDayMode && (!newProjectStartTime || !newProjectEndTime)) return;

    let startDate: Date;
    let endDate: Date;
    let deadlineDays = 0;

    if (isDayMode) {
      startDate = new Date(`${newProjectStartDate}T00:00:00`);
      endDate = new Date(`${newProjectEndDate}T23:59:59`);

      if (endDate < startDate) {
        alert('Tanggal selesai harus setelah tanggal mulai.');
        return;
      }

      deadlineDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      const today = new Date();
      const [startHour, startMinute] = newProjectStartTime.split(':').map(Number);
      const [endHour, endMinute] = newProjectEndTime.split(':').map(Number);

      startDate = new Date(today);
      startDate.setHours(startHour, startMinute, 0, 0);

      endDate = new Date(today);
      endDate.setHours(endHour, endMinute, 0, 0);

      if (endDate <= startDate) {
        alert('Jam selesai harus setelah jam mulai.');
        return;
      }

      deadlineDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      category: newProjectCategory,
      initialDeadlineDays: deadlineDays,
      actualDeadlineDays: deadlineDays,
      startDate,
      endDate,
      status: 'active',
      teamMembers: buildTeamMembers(newProjectCategory)
    };

    setProjects([...projects, newProject]);
    setShowNewProjectModal(false);
    setNewProjectName('');
    setNewProjectCategory(PROJECT_CATEGORIES[0].value);
    setNewProjectDeadlineUnit('days');
    setNewProjectStartDate(new Date().toISOString().split('T')[0]);
    setNewProjectEndDate('');
    setNewProjectStartTime('08:00');
    setNewProjectEndTime('17:00');
  };

  const handleFinishProject = (projectId: string) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, status: 'completed' as const, endDate: new Date() }
        : p
    ));
  };

  const handleCancelProject = (projectId: string) => {
    setProjects(projects.map(p =>
      p.id === projectId
        ? { ...p, status: 'cancelled' as const, endDate: new Date() }
        : p
    ));
  };

  const handlePenugasan = (projectId: string) => {
    navigate(`/tugas/penugasan/${projectId}`);
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

  const getProjectProgress = (project: Project) => {
    const totalTasks = project.teamMembers.reduce((sum, member) => sum + member.tasks.length, 0);
    const completedTasks = project.teamMembers.reduce(
      (sum, member) => sum + member.tasks.filter(t => t.completed).length,
      0
    );
    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  };

  const getCategoryDisplay = (category: ProjectCategory) =>
    PROJECT_CATEGORIES.find(item => item.value === category) ?? PROJECT_CATEGORIES[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Tugas</h1>
          <p className="page-subtitle">Kelola proyek dan penugasan tim</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowNewProjectModal(true)}
          className="new-project-button"
        >
          New Project
        </Button>
      </div>

      <div className="tugas-tabs">
        <button
          className={`tugas-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Proyek Aktif ({activeProjects.length})
        </button>
        <button
          className={`tugas-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History ({historyProjects.length})
        </button>
      </div>

      <div className="projects-grid">
        {activeTab === 'active' ? (
          activeProjects.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>Belum ada proyek aktif</p>
              <p className="empty-state-subtitle">Klik tombol "New Project" untuk memulai</p>
            </div>
          ) : (
            activeProjects.map(project => (
              <Card key={project.id}>
                <CardBody>
                  <div className="project-card">
                    <div className="project-header">
                      <h3 className="project-name">{project.name}</h3>
                      <div className="project-badges">
                        <Badge variant={getCategoryDisplay(project.category).variant}>
                          {getCategoryDisplay(project.category).label}
                        </Badge>
                        <Badge variant="blue" dot>Aktif</Badge>
                      </div>
                    </div>

                    <div className="project-info">
                      <div className="project-info-item">
                        <Calendar size={16} />
                        <span>Mulai: {formatDate(project.startDate)}</span>
                      </div>
                      <div className="project-info-item">
                        <Clock size={16} />
                        <span>Target: {formatDuration(project.initialDeadlineDays)}</span>
                      </div>
                      <div className="project-info-item">
                        <ArrowRight size={16} />
                        <span>Deadline: {project.endDate ? formatDate(project.endDate) : '-'}</span>
                      </div>
                      <div className="project-info-item">
                        <Users size={16} />
                        <span>{project.teamMembers.reduce((sum, m) => sum + m.tasks.length, 0)} tugas</span>
                      </div>
                    </div>

                    <div className="project-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${getProjectProgress(project)}%` }}
                        />
                      </div>
                      <span className="progress-text">{getProjectProgress(project)}%</span>
                    </div>

                    {project.actualDeadlineDays !== project.initialDeadlineDays && (
                      <div className="project-alert">
                        <Clock size={14} />
                        <span>
                          Durasi disesuaikan: {formatDuration(project.initialDeadlineDays)} → {formatDuration(project.actualDeadlineDays)}
                        </span>
                      </div>
                    )}

                    <div className="project-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Users size={16} />}
                        onClick={() => handlePenugasan(project.id)}
                      >
                        Penugasan
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<CheckCircle size={16} />}
                        onClick={() => handleFinishProject(project.id)}
                      >
                        Finish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<XCircle size={16} />}
                        onClick={() => handleCancelProject(project.id)}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )
        ) : (
          historyProjects.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>Belum ada history proyek</p>
              <p className="empty-state-subtitle">Proyek yang selesai atau dibatalkan akan muncul di sini</p>
            </div>
          ) : (
            historyProjects.map(project => (
              <Card key={project.id}>
                <CardBody>
                  <div className="project-card">
                    <div className="project-header">
                      <h3 className="project-name">{project.name}</h3>
                      <div className="project-badges">
                        <Badge variant={getCategoryDisplay(project.category).variant}>
                          {getCategoryDisplay(project.category).label}
                        </Badge>
                        <Badge
                          variant={project.status === 'completed' ? 'green' : 'red'}
                          dot
                        >
                          {project.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                        </Badge>
                      </div>
                    </div>

                    <div className="project-info">
                      <div className="project-info-item">
                        <Calendar size={16} />
                        <span>Mulai: {formatDate(project.startDate)}</span>
                      </div>
                      <div className="project-info-item">
                        <Clock size={16} />
                        <span>Selesai: {project.endDate ? formatDate(project.endDate) : '-'}</span>
                      </div>
                      <div className="project-info-item">
                        <ArrowRight size={16} />
                        <span>Durasi: {formatDuration(project.actualDeadlineDays)}</span>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <>
          <div
            className="modal-backdrop"
            onClick={() => setShowNewProjectModal(false)}
          />
          <div className="modal">
            <div className="modal-header">
              <h2>Buat Proyek Baru</h2>
              <button
                className="modal-close"
                onClick={() => setShowNewProjectModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="project-name">Nama Proyek</label>
                <Input
                  id="project-name"
                  type="text"
                  placeholder="Masukkan nama proyek..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-category">Kategori</label>
                <select
                  id="project-category"
                  className="deadline-unit-select"
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value as ProjectCategory)}
                >
                  {PROJECT_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="project-deadline">Deadline</label>
                <div className="deadline-input-group">
                  <select
                    className="deadline-unit-select"
                    value={newProjectDeadlineUnit}
                    onChange={(e) => setNewProjectDeadlineUnit(e.target.value as 'hours' | 'days')}
                  >
                    <option value="days">Hari</option>
                    <option value="hours">Jam</option>
                  </select>
                </div>

                {newProjectDeadlineUnit === 'days' ? (
                  <div className="deadline-range">
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Mulai</span>
                      <Input
                        type="date"
                        value={newProjectStartDate}
                        onChange={(e) => setNewProjectStartDate(e.target.value)}
                      />
                    </div>
                    <span className="range-separator">→</span>
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Selesai</span>
                      <Input
                        type="date"
                        value={newProjectEndDate}
                        min={newProjectStartDate}
                        onChange={(e) => setNewProjectEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="deadline-range">
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Mulai</span>
                      <Input
                        type="time"
                        value={newProjectStartTime}
                        onChange={(e) => setNewProjectStartTime(e.target.value)}
                      />
                    </div>
                    <span className="range-separator">→</span>
                    <div className="deadline-range-field">
                      <span className="deadline-range-label">Selesai</span>
                      <Input
                        type="time"
                        value={newProjectEndTime}
                        onChange={(e) => setNewProjectEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={() => setShowNewProjectModal(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateProject}
                disabled={!newProjectName || (
                  newProjectDeadlineUnit === 'days'
                    ? !newProjectStartDate || !newProjectEndDate
                    : !newProjectStartTime || !newProjectEndTime
                )}
              >
                Buat Proyek
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
