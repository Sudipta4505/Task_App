import { getCurrentUserToken } from '../firebase';

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with automatic Firebase ID Token attachment
 */
async function request(endpoint, options = {}) {
  const token = await getCurrentUserToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const taskApi = {
  // Get tasks with optional filters
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    if (filters.dueBefore) params.append('dueBefore', filters.dueBefore);
    if (filters.dueAfter) params.append('dueAfter', filters.dueAfter);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await request(`/tasks${queryString}`);
  },

  // Get task statistics for dashboard counters
  getStats: async () => {
    return await request('/tasks/stats');
  },

  // Create a new task
  createTask: async (taskData) => {
    return await request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  // Update existing task
  updateTask: async (taskId, updateData) => {
    return await request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Delete task
  deleteTask: async (taskId) => {
    return await request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  // Send message to AI Chatbot
  sendChatMessage: async (message, history = []) => {
    return await request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
  }
};
