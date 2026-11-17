import mongoose from 'mongoose';
import { Task } from '../models/Task.js';

/**
 * Controlled Task Tools for MCP and AI Assistant.
 * CRITICAL SECURITY GUARANTEE:
 * Every function requires and enforces the authenticated `userId`.
 * MongoDB queries are strictly scoped by `userId`.
 * The AI cannot pass a custom `userId` to bypass authorization.
 */

export const getMyTasks = async (userId, filter = {}) => {
  if (!userId) {
    throw new Error('Unauthorized: User identity is required to retrieve tasks.');
  }

  const query = { userId };

  if (filter.status && filter.status !== 'all') {
    query.status = filter.status;
  }

  if (filter.priority) {
    query.priority = filter.priority;
  }

  if (filter.search) {
    const searchRegex = new RegExp(filter.search, 'i');
    query.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
  }

  if (filter.dueBefore || filter.dueAfter) {
    query.dueDate = {};
    if (filter.dueBefore) {
      query.dueDate.$lte = new Date(filter.dueBefore);
    }
    if (filter.dueAfter) {
      query.dueDate.$gte = new Date(filter.dueAfter);
    }
  }

  const limit = Math.min(Number(filter.limit) || 50, 100);
  const tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(limit).lean();

  return tasks;
};

export const createMyTask = async (userId, taskData = {}) => {
  if (!userId) {
    throw new Error('Unauthorized: User identity is required to create a task.');
  }

  if (!taskData.title || typeof taskData.title !== 'string' || !taskData.title.trim()) {
    throw new Error('Task title is required.');
  }

  const allowedPriorities = ['low', 'medium', 'high', 'urgent'];
  const priority = allowedPriorities.includes(taskData.priority) ? taskData.priority : 'medium';

  const allowedStatuses = ['pending', 'in_progress', 'completed'];
  const status = allowedStatuses.includes(taskData.status) ? taskData.status : 'pending';

  let dueDate = null;
  if (taskData.dueDate) {
    const parsedDate = new Date(taskData.dueDate);
    if (!isNaN(parsedDate.getTime())) {
      dueDate = parsedDate;
    }
  }

  let tags = [];
  if (Array.isArray(taskData.tags)) {
    tags = taskData.tags.map((t) => String(t).trim()).filter(Boolean);
  }

  const task = new Task({
    title: taskData.title.trim(),
    description: (taskData.description || '').trim(),
    status,
    priority,
    dueDate,
    tags,
    userId // Enforced from authenticated user context
  });

  const savedTask = await task.save();
  return savedTask.toObject();
};

export const updateMyTask = async (userId, updateData = {}) => {
  if (!userId) {
    throw new Error('Unauthorized: User identity is required to update a task.');
  }

  let taskToUpdate = null;

  // Attempt to find by ID
  if (updateData.taskId && mongoose.Types.ObjectId.isValid(updateData.taskId)) {
    taskToUpdate = await Task.findOne({ _id: updateData.taskId, userId });
  }

  // If not found by ID or if user provided title to match (natural language commands like "mark Learn React as completed")
  if (!taskToUpdate && updateData.searchTitle) {
    taskToUpdate = await Task.findOne({
      userId,
      title: new RegExp(updateData.searchTitle.trim(), 'i')
    }).sort({ createdAt: -1 });
  }

  if (!taskToUpdate) {
    throw new Error('Task not found or you do not have permission to modify it.');
  }

  // Apply allowed field updates
  if (updateData.title !== undefined) {
    taskToUpdate.title = updateData.title.trim();
  }
  if (updateData.description !== undefined) {
    taskToUpdate.description = updateData.description.trim();
  }
  if (updateData.status && ['pending', 'in_progress', 'completed'].includes(updateData.status)) {
    taskToUpdate.status = updateData.status;
  }
  if (updateData.priority && ['low', 'medium', 'high', 'urgent'].includes(updateData.priority)) {
    taskToUpdate.priority = updateData.priority;
  }
  if (updateData.dueDate !== undefined) {
    if (updateData.dueDate === null || updateData.dueDate === '') {
      taskToUpdate.dueDate = null;
    } else {
      const parsedDate = new Date(updateData.dueDate);
      if (!isNaN(parsedDate.getTime())) {
        taskToUpdate.dueDate = parsedDate;
      }
    }
  }
  if (Array.isArray(updateData.tags)) {
    taskToUpdate.tags = updateData.tags.map((t) => String(t).trim()).filter(Boolean);
  }

  const updated = await taskToUpdate.save();
  return updated.toObject();
};

export const deleteMyTask = async (userId, deleteData = {}) => {
  if (!userId) {
    throw new Error('Unauthorized: User identity is required to delete a task.');
  }

  let taskToDelete = null;

  if (deleteData.taskId && mongoose.Types.ObjectId.isValid(deleteData.taskId)) {
    taskToDelete = await Task.findOne({ _id: deleteData.taskId, userId });
  }

  if (!taskToDelete && deleteData.searchTitle) {
    taskToDelete = await Task.findOne({
      userId,
      title: new RegExp(deleteData.searchTitle.trim(), 'i')
    }).sort({ createdAt: -1 });
  }

  if (!taskToDelete) {
    throw new Error('Task not found or you do not have permission to delete it.');
  }

  await Task.deleteOne({ _id: taskToDelete._id, userId });

  return {
    deletedTaskId: taskToDelete._id,
    deletedTitle: taskToDelete.title,
    success: true
  };
};

/**
 * MCP Tool definitions conforming to Model Context Protocol specification.
 */
export const mcpToolDefinitions = [
  {
    name: 'getMyTasks',
    description: 'Retrieve tasks belonging to the authenticated user with optional filtering by status, priority, due date range, or keyword search.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'all'],
          description: 'Filter by task status. Use "all" or omit to view all tasks.'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filter by task priority.'
        },
        search: {
          type: 'string',
          description: 'Search string matching title, description, or tags.'
        },
        dueBefore: {
          type: 'string',
          description: 'ISO-8601 date string. Tasks due on or before this date.'
        },
        dueAfter: {
          type: 'string',
          description: 'ISO-8601 date string. Tasks due on or after this date.'
        }
      }
    }
  },
  {
    name: 'createMyTask',
    description: 'Create a new task for the authenticated user.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the task to create (required).'
        },
        description: {
          type: 'string',
          description: 'Detailed description or notes for the task.'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority level for the task. Defaults to "medium".'
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed'],
          description: 'Status of the task. Defaults to "pending".'
        },
        dueDate: {
          type: 'string',
          description: 'ISO-8601 date string for when the task is due (e.g. 2026-09-26T18:00:00.000Z).'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tags/categories for the task.'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'updateMyTask',
    description: 'Update an existing task belonging to the authenticated user. Can specify taskId or searchTitle to find the task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the task to update.'
        },
        searchTitle: {
          type: 'string',
          description: 'The title or keywords of the task to update if taskId is unknown.'
        },
        title: {
          type: 'string',
          description: 'Updated title for the task.'
        },
        description: {
          type: 'string',
          description: 'Updated description for the task.'
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed'],
          description: 'Updated status of the task.'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Updated priority.'
        },
        dueDate: {
          type: 'string',
          description: 'Updated ISO-8601 due date or empty string to clear.'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated tags list.'
        }
      }
    }
  },
  {
    name: 'deleteMyTask',
    description: 'Delete a task belonging to the authenticated user by taskId or searchTitle.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The MongoDB ObjectId of the task to delete.'
        },
        searchTitle: {
          type: 'string',
          description: 'The title of the task to delete if taskId is unknown.'
        }
      }
    }
  }
];
