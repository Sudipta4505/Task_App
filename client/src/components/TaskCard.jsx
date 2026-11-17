import React from 'react';
import {
  Check,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  Tag,
  AlertTriangle
} from 'lucide-react';

export default function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDelete
}) {
  const isCompleted = task.status === 'completed';

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const isOverdue =
    task.dueDate &&
    !isCompleted &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  const formattedDue = formatDueDate(task.dueDate);

  return (
    <div className={`task-card priority-${task.priority} ${isCompleted ? 'completed' : ''}`}>
      <div>
        <div className="task-header">
          <button
            className={`task-toggle-btn ${isCompleted ? 'checked' : ''}`}
            onClick={() => onToggleStatus(task)}
            title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
          >
            {isCompleted && <Check size={14} strokeWidth={3} />}
          </button>

          <div className="task-title-area">
            <h3 className="task-title">{task.title}</h3>
            {task.description && <p className="task-desc">{task.description}</p>}
          </div>
        </div>

        <div className="task-meta" style={{ marginTop: '0.85rem' }}>
          <span className={`badge badge-${task.status}`}>
            {task.status.replace('_', ' ')}
          </span>

          <span className={`badge badge-${task.priority}`}>
            {task.priority}
          </span>

          {formattedDue && (
            <span className={`due-indicator ${isOverdue ? 'overdue' : ''}`}>
              {isOverdue ? <AlertTriangle size={13} /> : <Calendar size={13} />}
              <span>{isOverdue ? `Overdue: ${formattedDue}` : formattedDue}</span>
            </span>
          )}
        </div>
      </div>

      <div className="task-footer">
        <div className="tag-list">
          {task.tags && task.tags.length > 0 ? (
            task.tags.map((tag, i) => (
              <span key={i} className="tag-chip">
                #{tag}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              No tags
            </span>
          )}
        </div>

        <div className="task-actions">
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title="Edit Task"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="btn-icon"
            onClick={() => onDelete(task._id)}
            title="Delete Task"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
