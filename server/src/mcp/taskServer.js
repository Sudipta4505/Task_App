import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { verifyFirebaseToken } from '../config/firebase.js';
import {
  getMyTasks,
  createMyTask,
  updateMyTask,
  deleteMyTask,
  mcpToolDefinitions
} from './taskTools.js';

dotenv.config();

/**
 * MCP Server for Task Management.
 * Exposes controlled tools to any MCP client.
 * Enforces authenticated user isolation on every single tool execution.
 */
export async function startMcpServer() {
  await connectDB();

  const server = new Server(
    {
      name: 'secure-task-management-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: mcpToolDefinitions
    };
  });

  // Call tool with strict authorization validation
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    // In MCP calls, authToken can be passed in args or process.env.MCP_AUTH_TOKEN
    const authToken = args.authToken || process.env.MCP_AUTH_TOKEN;
    let userId = args.userId;

    if (authToken) {
      try {
        const user = await verifyFirebaseToken(authToken);
        userId = user.uid;
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Security Error: Failed to authenticate token: ${err.message}`
            }
          ]
        };
      }
    }

    if (!userId) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Authorization Error: Valid user identity or authToken must be provided to execute task operations.'
          }
        ]
      };
    }

    try {
      let result;
      switch (name) {
        case 'getMyTasks':
          result = await getMyTasks(userId, args);
          break;
        case 'createMyTask':
          result = await createMyTask(userId, args);
          break;
        case 'updateMyTask':
          result = await updateMyTask(userId, args);
          break;
        case 'deleteMyTask':
          result = await deleteMyTask(userId, args);
          break;
        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${name}` }]
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool execution error: ${error.message}`
          }
        ]
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Secure Task Management MCP Server running on stdio');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('taskServer.js')) {
  startMcpServer().catch((err) => {
    console.error('[MCP Server Error]', err);
    process.exit(1);
  });
}
