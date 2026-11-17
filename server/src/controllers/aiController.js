import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getMyTasks,
  createMyTask,
  updateMyTask,
  deleteMyTask,
  mcpToolDefinitions
} from '../mcp/taskTools.js';

// Format MCP tools for Google Gemini Function Calling
const geminiFunctionDeclarations = mcpToolDefinitions.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.inputSchema
}));

/**
 * Execute a controlled tool on behalf of the authenticated user.
 * SECURITY: userId is ALWAYS injected from verified session req.user.uid.
 */
async function executeControlledTool(toolName, toolArgs, userId) {
  switch (toolName) {
    case 'getMyTasks':
      return await getMyTasks(userId, toolArgs);
    case 'createMyTask':
      return await createMyTask(userId, toolArgs);
    case 'updateMyTask':
      return await updateMyTask(userId, toolArgs);
    case 'deleteMyTask':
      return await deleteMyTask(userId, toolArgs);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Intelligent deterministic NLP fallback when GEMINI_API_KEY is not configured yet.
 * Ensures the chatbot immediately handles requested natural language queries!
 */
async function fallbackNlpProcessor(message, userId) {
  const text = message.trim();
  const lower = text.toLowerCase();
  const executedTools = [];
  const now = new Date();

  // 1. "Show my pending tasks" / "Show tasks" / "Show completed tasks" / "Show tasks for tomorrow"
  if (lower.startsWith('show') || lower.startsWith('list') || lower.startsWith('get') || lower.startsWith('view') || lower.includes('what are my tasks')) {
    let filter = {};

    if (lower.includes('pending')) {
      filter.status = 'pending';
    } else if (lower.includes('completed')) {
      filter.status = 'completed';
    } else if (lower.includes('in progress')) {
      filter.status = 'in_progress';
    }

    if (lower.includes('tomorrow')) {
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(now);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      filter.dueAfter = tomorrowStart.toISOString();
      filter.dueBefore = tomorrowEnd.toISOString();
    } else if (lower.includes('today')) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      filter.dueAfter = todayStart.toISOString();
      filter.dueBefore = todayEnd.toISOString();
    }

    const tasks = await getMyTasks(userId, filter);
    executedTools.push({ name: 'getMyTasks', args: filter, result: tasks });

    if (tasks.length === 0) {
      return {
        reply: `You don't have any tasks matching that criteria right now.`,
        executedTools
      };
    }

    const taskList = tasks.map((t, idx) => `${idx + 1}. **${t.title}** [${t.status}] (Priority: ${t.priority})`).join('\n');
    return {
      reply: `Here are your tasks (${tasks.length} found):\n\n${taskList}`,
      executedTools
    };
  }

  // 2. "Create a task called Learn React" / "Add task ..."
  const createMatch = text.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(?:called\s+|named\s+|titled\s+)?["']?([^"'\n]+?)["']?(?:\s+(?:by|due|with priority)\s+.*)?$/i);
  if (createMatch) {
    let title = createMatch[1].trim();
    // remove common prefixes
    title = title.replace(/^(called|named)\s+/i, '');

    let priority = 'medium';
    if (lower.includes('urgent')) priority = 'urgent';
    else if (lower.includes('high priority')) priority = 'high';
    else if (lower.includes('low priority')) priority = 'low';

    let dueDate = null;
    if (lower.includes('tomorrow')) {
      const tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      tom.setHours(18, 0, 0, 0);
      dueDate = tom.toISOString();
    }

    const task = await createMyTask(userId, { title, priority, dueDate });
    executedTools.push({ name: 'createMyTask', args: { title, priority, dueDate }, result: task });

    return {
      reply: `I've created your task: **"${task.title}"** (Priority: ${task.priority}).`,
      executedTools
    };
  }

  // 3. "Mark my Learn React task as completed" / "Complete task Learn React"
  const markCompleteMatch = text.match(/mark\s+(?:my\s+)?["']?([^"'\n]+?)["']?\s+(?:task\s+)?as\s+(completed|in progress|pending)/i) ||
    text.match(/(?:complete|finish)\s+(?:my\s+)?(?:task\s+)?["']?([^"'\n]+?)["']?$/i);

  if (markCompleteMatch) {
    const searchTitle = markCompleteMatch[1].trim();
    const status = markCompleteMatch[2] ? markCompleteMatch[2].replace(' ', '_') : 'completed';

    try {
      const updated = await updateMyTask(userId, { searchTitle, status });
      executedTools.push({ name: 'updateMyTask', args: { searchTitle, status }, result: updated });
      return {
        reply: `I've updated **"${updated.title}"** to **${updated.status}**!`,
        executedTools
      };
    } catch (err) {
      return {
        reply: `Could not find a task matching "${searchTitle}" to update.`,
        executedTools
      };
    }
  }

  // 4. "Delete my old task" / "Delete task Learn React"
  const deleteMatch = text.match(/delete\s+(?:my\s+)?(?:task\s+)?["']?([^"'\n]+?)["']?$/i);
  if (deleteMatch) {
    const searchTitle = deleteMatch[1].trim();
    try {
      const result = await deleteMyTask(userId, { searchTitle });
      executedTools.push({ name: 'deleteMyTask', args: { searchTitle }, result });
      return {
        reply: `Deleted task **"${result.deletedTitle}"**.`,
        executedTools
      };
    } catch (err) {
      return {
        reply: `Could not find a task matching "${searchTitle}" to delete.`,
        executedTools
      };
    }
  }

  // General helpful response
  return {
    reply: `I can help you manage your tasks! You can say:\n- "Show my pending tasks"\n- "Create a task called Learn React"\n- "Mark my Learn React task as completed"\n- "Show my tasks for tomorrow"\n- "Delete task Learn React"`,
    executedTools: []
  };
}

// POST /api/ai/chat
export const handleAiChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user.uid;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message string is required.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API key is missing or blank, use fallback natural language processor
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      const fallbackResult = await fallbackNlpProcessor(message, userId);
      return res.status(200).json({
        success: true,
        reply: fallbackResult.reply,
        executedTools: fallbackResult.executedTools,
        provider: 'nlp_rule_engine'
      });
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const currentDate = new Date().toISOString();

    const systemInstruction = `You are a helpful, proactive AI Task Management Assistant.
You have access to controlled tools to view, create, update, and delete tasks for the authenticated user.
Today's date and current time is: ${currentDate}.
CRITICAL RULES:
1. Always use the appropriate tools to inspect or modify the user's tasks.
2. For dates like "tomorrow", "next Monday", calculate the exact ISO-8601 date string relative to ${currentDate}.
3. All operations are strictly executed for the authenticated user.
4. When a user asks you to mark a task as completed or delete a task, use the searchTitle parameter if you don't know the exact taskId.
5. Be concise, friendly, and confirm actions clearly.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      tools: [{ functionDeclarations: geminiFunctionDeclarations }]
    });

    const chat = model.startChat({
      history: history
        .filter((h) => h.role && h.content)
        .slice(-10)
        .map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const functionCalls = response.functionCalls();

    const executedTools = [];

    if (functionCalls && functionCalls.length > 0) {
      const toolResults = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        try {
          // Strictly execute tool with authenticated userId
          const toolOutput = await executeControlledTool(name, args, userId);
          executedTools.push({
            name,
            args,
            result: toolOutput
          });
          toolResults.push({
            functionResponse: {
              name,
              response: { output: toolOutput }
            }
          });
        } catch (toolError) {
          executedTools.push({
            name,
            args,
            error: toolError.message
          });
          toolResults.push({
            functionResponse: {
              name,
              response: { error: toolError.message }
            }
          });
        }
      }

      // Send tool results back to Gemini for conversational final reply
      const followUp = await chat.sendMessage(toolResults);
      const finalReply = followUp.response.text();

      return res.status(200).json({
        success: true,
        reply: finalReply,
        executedTools,
        provider: 'gemini-1.5-flash'
      });
    }

    return res.status(200).json({
      success: true,
      reply: response.text(),
      executedTools: [],
      provider: 'gemini-1.5-flash'
    });
  } catch (error) {
    console.error('[AI Controller Error]', error);
    // Graceful fallback to NLP engine in case of Gemini quota/network issues
    try {
      const fallback = await fallbackNlpProcessor(req.body.message, req.user.uid);
      return res.status(200).json({
        success: true,
        reply: fallback.reply,
        executedTools: fallback.executedTools,
        provider: 'fallback_after_gemini_error'
      });
    } catch (innerError) {
      return res.status(500).json({
        success: false,
        message: `Failed to process AI chat: ${error.message}`
      });
    }
  }
};
