#!/usr/bin/env node

/**
 * Simple JSON document server with basic CRUD operations
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fireproof } from "@jimpick/fireproof-core";
import { connect } from "@jimpick/fireproof-cloud";
import util from "node:util";

const db = fireproof("json_docs", { public: true });

await db.ready();

let cxGlobal: any = null;

const connection = await connect(db, "jim_elements_3").then((cx) => {
  // console.error("Connected", cx);
  cxGlobal = cx;
});

// console.error(connection);

const server = new Server(
  {
    name: "json-doc-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: { enabled: true },
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_json_doc",
        description: "Save a JSON document",
        inputSchema: {
          type: "object",
          properties: {
            doc: {
              type: "object",
              description: "JSON document to save",
            },
          },
          required: ["doc"],
        },
      },
      {
        name: "load_json_doc",
        description: "Load a JSON document by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of document to load",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_json_doc",
        description: "Delete a JSON document by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of document to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "query_json_docs",
        description: "Query JSON documents sorted by a field",
        inputSchema: {
          type: "object",
          properties: {
            sort_field: {
              type: "string",
              description: "Field to sort results by",
            },
          },
          required: ["sort_field"],
        },
      },
      {
        name: "dump_connection",
        description: "Dump connection info",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_dashboard_url",
        description: "Get dashboard URL",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "save_json_doc": {
      const doc = request.params.arguments?.doc;
      if (!doc) {
        throw new Error("Document is required");
      }

      const response = await db.put({
        ...doc,
        created: Date.now(),
      });

      return {
        content: [
          {
            type: "text",
            text: `Saved document with ID: ${response.id}`,
          },
        ],
      };
    }

    case "delete_json_doc": {
      const id = String(request.params.arguments?.id);
      if (!id) {
        throw new Error("ID is required");
      }

      await db.del(id);
      return {
        content: [
          {
            type: "text",
            text: `Deleted document with ID: ${id}`,
          },
        ],
      };
    }

    case "load_json_doc": {
      const id = String(request.params.arguments?.id);
      if (!id) {
        throw new Error("ID is required");
      }

      const doc = await db.get(id);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(doc),
          },
        ],
      };
    }

    case "query_json_docs": {
      const sortField = String(request.params.arguments?.sort_field);
      if (!sortField) {
        throw new Error("Sort field is required");
      }

      const results = await db.query(sortField, {
        includeDocs: true,
        descending: true,
        limit: 10,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results.rows.map((row) => row.doc)),
          },
        ],
      };
    }

    case "dump_connection": {
      // console.error("db", db);
      // console.error("cx", cxGlobal);
      return {
        content: [
          {
            type: "text",
            text: `dashboard:\n${cxGlobal.dashboardUrl}\n\ndb:\n${util.format(db)}\n\ncx:\n${util.format(cxGlobal)}`,
          },
        ],
      };
    }

    case "get_dashboard_url": {
      return {
        content: [
          {
            type: "text",
            text: cxGlobal.dashboardUrl
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
