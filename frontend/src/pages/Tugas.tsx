import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  ArrowRight,
  Search,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  AlertCircle,
  TrendingUp,
  PieChart,
  RefreshCw,
  Cloud,
  CloudOff
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { tugasApi, type Project, type TeamMember, type Task, type ProjectCategory } from '../lib/tugasApi';
import './Tugas.css';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(tugasApi.isWebhookAvailable());

  // Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<ProjectCategory>(PROJECT_CATEGORIES[0].value);
  const [newProjectDeadlineUnit, setNewProjectDeadlineUnit] = useState<'hours' | 'days'>('days');
  const [newProjectStartDate, setNewProjectStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newProjectEndDate, setNewProjectEndDate] = useState('');
  const [newProjectStartTime, setNewProjectStartTime] = useState('08:00');
  const [newProjectEndTime, setNewProjectEndTime] = useState('17:00');

  // Filter & View State
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load projects from API
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedProjects = await tugasApi.getAllProjects();
      const normalized = loadedProjects.map(project => {
        const withCategory = project.category ? project : { ...project, category: PROJECT_CATEGORIES[0].value as ProjectCategory };
        return ensureAiTeam(withCategory);
      });
      setProjects(normalized);
      setIsOnline(tugasApi.isWebhookAvailable());
    } catch (error) {
      console.error('Failed to load projects:', error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Refresh/sync handler
  const handleRefresh = async () => {
    setIsSyncing(true);
    await loadProjects();
    setIsSyncing(false);
  };

  const buildTeamMembers = (category: ProjectCategory): TeamMember[] => {
    if (category === 'ai') return [{ id: 'seto', name: 'SETO', tasks: [] }];
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
      teamMembers: [{ id: 'seto', name: 'SETO', tasks: allTasks }]
    };
  };

  // Stats Logic
  const stats = useMemo(() => {
    const active = projects.filter(p => p.status === 'active');
    const completed = projects.filter(p => p.status === 'completed');
    
    // Logic "At Risk": Deadline < 2 days & progress < 80%
    const atRisk = active.filter(p => {
      if (!p.endDate) return false;
      const now = new Date();
      const diffTime = p.endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const totalTasks = p.teamMembers.reduce((sum, m) => sum + m.tasks.length, 0);
      const completedTasks = p.teamMembers.reduce((sum, m) => sum + m.tasks.filter(t => t.completed).length, 0);
      const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks);

      return diffDays <= 2 && progress < 0.8 && diffDays >= 0;
    });

    return {
      active: active.length,
      completed: completed.length,
      atRisk: atRisk.length
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    // Tab Filter
    if (activeTab === 'active') {
      result = result.filter(p => p.status === 'active');
    } else {
      result = result.filter(p => p.status === 'completed' || p.status === 'cancelled');
    }

    // Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lowerQuery));
    }

    // Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    return result;
  }, [projects, activeTab, searchQuery, categoryFilter]);

  const handleCreateProject = async () => {
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

    // Save to API
    await tugasApi.createProject(newProject);

    setProjects([...projects, newProject]);
    setShowNewProjectModal(false);
    setNewProjectName('');
    setNewProjectCategory(PROJECT_CATEGORIES[0].value);
    setNewProjectDeadlineUnit('days');
  };

  const handleFinishProject = async (projectId: string) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? { ...p, status: 'completed' as const, endDate: new Date() }
        : p
    );
    setProjects(updatedProjects);

    // Update to API
    const updatedProject = updatedProjects.find(p => p.id === projectId);
    if (updatedProject) {
      await tugasApi.updateProject(updatedProject);
    }
  };

  const handleCancelProject = async (projectId: string) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId
        ? { ...p, status: 'cancelled' as const, endDate: new Date() }
        : p
    );
    setProjects(updatedProjects);

    // Update to API
    const updatedProject = updatedProjects.find(p => p.id === projectId);
    if (updatedProject) {
      await tugasApi.updateProject(updatedProject);
    }
  };

  const handlePenugasan = (projectId: string) => {
    navigate(`/tugas/penugasan/${projectId}`);
  };

  // Helpers
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
      year: 'numeric'
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

  const getAvatarGradient = (name: string) => {
    const hash = name.charCodeAt(0);
    const gradients = [
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      'linear-gradient(135deg, #f59e0b, #ec4899)',
    ];
    return gradients[hash % gradients.length];
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="page">
        <div className="empty-state">
          <RefreshCw size={48} className="spin" />
          <h3>Memuat data...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Tugas</h1>
          <p className="page-subtitle">
            Monitoring dan pengelolaan proyek tim
            <span
              className={`sync-status ${isOnline ? 'online' : 'offline'}`}
              title={isOnline ? 'Tersinkronisasi dengan database' : 'Mode offline (localStorage)'}
              style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85em' }}
            >
              {isOnline ? <Cloud size={14} /> : <CloudOff size={14} />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            icon={<RefreshCw size={18} className={isSyncing ? 'spin' : ''} />}
            onClick={handleRefresh}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => setShowNewProjectModal(true)}
          >
            Project Baru
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card-mini">
          <div className="stat-icon-wrapper blue">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="stat-label">Project Aktif</span>
            <div className="stat-value">{stats.active}</div>
          </div>
        </div>
        <div className="stat-card-mini">
          <div className="stat-icon-wrapper green">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="stat-label">Selesai</span>
            <div className="stat-value">{stats.completed}</div>
          </div>
        </div>
        <div className="stat-card-mini">
          <div className="stat-icon-wrapper orange">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="stat-label">Perlu Perhatian</span>
            <div className="stat-value">{stats.atRisk}</div>
          </div>
        </div>
      </div>

      {/* Controls Bar (Filter & Search) */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari project..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-wrapper">
          <select 
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Semua Kategori</option>
            {PROJECT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tugas-tabs">
        <button
          className={`tugas-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Sedang Berjalan
        </button>
        <button
          className={`tugas-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Riwayat
        </button>
      </div>

      {/* Projects Grid/List */}
      <div className={`projects-container ${viewMode}`}>
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <PieChart size={64} />
            <h3>Tidak ada project ditemukan</h3>
            <p>Coba sesuaikan filter pencarian atau buat project baru.</p>
          </div>
        ) : (
          filteredProjects.map(project => {
            const progress = getProjectProgress(project);
            const catDisplay = getCategoryDisplay(project.category);
            
            return (
              <Card key={project.id} className="modern-card">
                <CardBody className="modern-card-body">
                  <div className="card-top">
                    <div className="card-header-row">
                      <Badge variant={catDisplay.variant}>{catDisplay.label}</Badge>
                      <button className="more-options-btn">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    <h3 className="modern-project-title">{project.name}</h3>
                    <div className="card-dates">
                      <Calendar size={14} />
                      <span>{formatDate(project.startDate)} — {project.endDate ? formatDate(project.endDate) : 'ongoing'}</span>
                    </div>
                  </div>

                  <div className="card-middle">
                    <div className="stacked-avatars">
                      {project.teamMembers.slice(0, 4).map((member, i) => (
                        <div 
                          key={member.id} 
                          className="avatar-circle"
                          style={{ 
                            background: getAvatarGradient(member.name),
                            zIndex: 4 - i,
                            marginLeft: i > 0 ? '-10px' : 0
                          }}
                          title={member.name}
                        >
                          {getInitials(member.name)}
                        </div>
                      ))}
                      {project.teamMembers.length > 4 && (
                        <div className="avatar-circle more">+{project.teamMembers.length - 4}</div>
                      )}
                    </div>
                    <div className={`status-indicator ${progress === 100 ? 'done' : 'active'}`}>
                      {progress === 100 ? 'Selesai' : `${progress}%`}
                    </div>
                  </div>

                  <div className="card-progress-section">
                    <div className="progress-track">
                      <div className="progress-fill-modern" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <div className="card-footer-actions">
                     {activeTab === 'active' ? (
                       <>
                         <Button 
                           variant="primary" 
                           size="sm" 
                           className="action-btn-full"
                           onClick={() => handlePenugasan(project.id)}
                         >
                           Buka Tugas
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="action-btn-icon"
                           onClick={() => handleFinishProject(project.id)}
                           title="Selesaikan"
                         >
                           <CheckCircle size={18} />
                         </Button>
                       </>
                     ) : (
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="action-btn-full"
                        onClick={() => handlePenugasan(project.id)}
                       >
                         Lihat Detail
                       </Button>
                     )}
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowNewProjectModal(false)} />
          <div className="modal">
            <div className="modal-header">
              <h2>Buat Proyek Baru</h2>
              <button className="modal-close" onClick={() => setShowNewProjectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Proyek</label>
                <Input
                  type="text"
                  placeholder="Contoh: Laser Cutting Pagar Pak Budi"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <select
                  className="modern-select"
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
                <label>Estimasi Waktu</label>
                <div className="deadline-input-group">
                  <select
                    className="modern-select"
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
              <Button variant="ghost" onClick={() => setShowNewProjectModal(false)}>Batal</Button>
              <Button variant="primary" onClick={handleCreateProject}>Buat Project</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}