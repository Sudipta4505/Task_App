import React from 'react';
import { Search, Plus, Filter } from 'lucide-react';

export default function TaskControls({
  filters,
  onFilterChange,
  onOpenCreateModal
}) {
  const statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' }
  ];

  return (
    <div className="controls-bar">
      <div className="search-box">
        <Search size={18} color="#64748b" />
        <input
          type="text"
          placeholder="Search tasks, descriptions, tags..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="filter-group">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            className={`filter-pill ${filters.status === opt.value ? 'active' : ''}`}
            onClick={() => onFilterChange({ ...filters, status: opt.value })}
          >
            {opt.label}
          </button>
        ))}

        <select
          className="select-dropdown"
          value={filters.priority || ''}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
        >
          <option value="">All Priorities</option>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>

        <button className="btn btn-primary" onClick={onOpenCreateModal}>
          <Plus size={18} />
          <span>New Task</span>
        </button>
      </div>
    </div>
  );
}
