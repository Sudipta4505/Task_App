import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { taskApi } from './services/api';
import Navbar from './components/Navbar';
import StatsGrid from './components/StatsGrid';
import TaskControls from './components/TaskControls';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import AiChatWidget from './components/AiChatWidget';
import AuthView from './components/AuthView';
import { CheckSquare, PlusCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    urgent: 0
  });

  const [filters, setFilters] = useState({
    status: 'all',
    priority: '',
    search: ''
  });

  const [tasksLoading, setTasksLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch tasks and statistics
  const fetchTasksAndStats = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    try {
      const [tasksRes, statsRes] = await Promise.all([
        taskApi.getTasks(filters),
        taskApi.getStats()
      ]);
      setTasks(tasksRes.tasks || []);
      if (statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Error fetching tasks/stats:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    if (user) {
      fetchTasksAndStats();
    }
  }, [user, fetchTasksAndStats]);

  // Handle task status toggle (e.g., mark completed)
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
      );
      await taskApi.updateTask(task._id, { status: nextStatus });
      fetchTasksAndStats();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchTasksAndStats();
    }
  };

  // Handle task submission (create or update)
  const handleTaskSubmit = async (taskData) => {
    if (editingTask) {
      await taskApi.updateTask(editingTask._id, taskData);
    } else {
      await taskApi.createTask(taskData);
    }
    fetchTasksAndStats();
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      await taskApi.deleteTask(taskId);
      fetchTasksAndStats();
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTasksAndStats();
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  // Loading indicator for initial auth check
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}
      >
        <div className="brand-icon" style={{ width: '48px', height: '48px' }}>
          <CheckSquare size={26} />
        </div>
        <span className="dot-flashing"></span>
      </div>
    );
  }

  // Not signed in -> Render AuthView
  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="app-container">
      {/* Navbar with Profile & Logout */}
      <Navbar user={user} />

      {/* Metrics Dashboard */}
      <StatsGrid stats={stats} />

      {/* Filter and Control Bar */}
      <TaskControls
        filters={filters}
        onFilterChange={setFilters}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {/* Tasks List / Grid */}
      {tasksLoading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <span className="dot-flashing"></span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <PlusCircle size={28} />
          </div>
          <h3>No tasks found</h3>
          <p>
            {filters.search || filters.status !== 'all' || filters.priority
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first task or ask the AI assistant!'}
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            Create a Task
          </button>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onToggleStatus={handleToggleStatus}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialData={editingTask}
      />

      {/* Floating AI Assistant with Controlled MCP Tools */}
      <AiChatWidget onTasksUpdated={fetchTasksAndStats} />
    </div>
  );
}
