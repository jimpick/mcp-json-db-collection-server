#!/usr/bin/env node

/**
 * Maintain collections of JSON document databases with basic CRUD operations
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fireproof, Database } from "@jimpick/fireproof-core";
import { connect } from "@jimpick/fireproof-cloud";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import util from "node:util";

interface JsonDocDb {
  readonly name: string;
  readonly created: number;
}

interface DbInfo {
  db: Database;
}

const dbs: Record<string, DbInfo> = {};

const localJsonDbCollection = fireproof("local_json_db_collection");

/*()
let cxGlobal: any = null;

const connection = await connect(db, "jim_elements_3").then((cx) => {
  // console.error("Connected", cx);
  cxGlobal = cx;
});
*/

// console.error(connection);

const server = new Server(
  {
    name: "json-db-collection",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: { enabled: true },
    },
  }
);

// Schema definitions
const CreateDbArgsSchema = z.object({
  databaseName: z.string(),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_json_doc_database",
        description: "Create a JSON document database",
        inputSchema: zodToJsonSchema(CreateDbArgsSchema) as ToolInput,
      },
      {
        name: "list_json_doc_databases",
        description:
          "Returns the list of JSON document databases. " +
          "Use this to understand which databases are available before trying to access JSON documents.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      /*
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
      */

    ],
  };
});

/*
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
  */
/*
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
*/

/*
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
*/

/*
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
*/

/*
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
*/

/*
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
*/

/*
default:
  throw new Error("Unknown tool");
}
});
*/

/*
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
 
    switch (name) {
      case "read_file": {
      }
 
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});
*/


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "create_json_doc_database": {
        const parsed = CreateDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for create_json_doc_database: ${parsed.error}`);
        }

        const newDb = fireproof(parsed.data.databaseName);
        dbs[parsed.data.databaseName] = { db: newDb };
        await localJsonDbCollection.put<JsonDocDb>({
          name: parsed.data.databaseName,
          created: Date.now(),
        });

        return {
          content: [
            {
              type: "text",
              text: `Created JSON document database: ${parsed.data.databaseName}`,
            }
          ]
        }
      }

      case "list_json_doc_databases": {
        const results = await localJsonDbCollection.query<string, JsonDocDb>("name", {
          includeDocs: true,
          descending: true,
        })
        const dbNames = results.rows.flatMap(row => row.doc ? [row.doc.name] : []);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(dbNames)
            }
          ]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
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
