import { Task } from '../models/Task.js';
import {
  getMyTasks,
  createMyTask,
  updateMyTask,
  deleteMyTask
} from '../mcp/taskTools.js';

/**
 * Controller for Task REST APIs.
 * User authorization is strictly enforced through req.user.uid.
 */

// GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const tasks = await getMyTasks(req.user.uid, req.query);
    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/tasks/stats
export const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const [total, pending, inProgress, completed, urgent] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'pending' }),
      Task.countDocuments({ userId, status: 'in_progress' }),
      Task.countDocuments({ userId, status: 'completed' }),
      Task.countDocuments({ userId, priority: 'urgent', status: { $ne: 'completed' } })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        urgent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/tasks/:id
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const task = await createMyTask(req.user.uid, req.body);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const updated = await updateMyTask(req.user.uid, {
      taskId: req.params.id,
      ...req.body
    });
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: updated
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const result = await deleteMyTask(req.user.uid, { taskId: req.params.id });
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      result
    });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
};
