#!/usr/bin/env node

/**
 * Maintain collections of JSON document databases with basic CRUD operations
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ServerNotificationSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fireproof, Database } from "@jimpick/fireproof-core";
import { connect } from "@jimpick/fireproof-cloud";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import util from "node:util";
import { parse } from "node:path";

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

const SaveJsonDocToDbArgsSchema = z.object({
  databaseName: z.string(),
  doc: z.object({})
});

const QueryJsonDocsFromDbArgsSchema = z.object({
  databaseName: z.string(),
  sortField: z.string(),
});

const LoadJsonDocFromDbArgsSchema = z.object({
  databaseName: z.string(),
  id: z.string(),
});

const DeleteJsonDocFromDbArgsSchema = z.object({
  databaseName: z.string(),
  id: z.string(),
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
      {
        name: "save_json_doc_to_db",
        description: "Save a JSON document to a document database",
        inputSchema: {
          type: "object",
          properties: {
            doc: {
              type: "object",
              description: "JSON document to save",
            },
            databaseName: {
              type: "string",
              description: "document database to save to",
            },
          },
          required: ["doc", "databaseName"],
        },
      },
      {
        name: "query_json_docs_from_db",
        description: "Query JSON documents sorted by a field from a document database. " +
          "If no sortField is provided, use the _id field.",
        inputSchema: zodToJsonSchema(QueryJsonDocsFromDbArgsSchema) as ToolInput,
        required: ["sortField"],
      },
      {
        name: "load_json_doc_from_db",
        description: "Load a JSON document by ID from a document database",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of document to load",
            },
            databaseName: {
              type: "string",
              description: "name of document database to load from",
            },
          },
          // properties: zodToJsonSchema(LoadJsonDocFromDbArgsSchema),
          required: ["id"],
        },
      },
      {
        name: "delete_json_doc_from_db",
        description: "Delete a JSON document by ID from a document database",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of document to delete",
            },
            databaseName: {
              type: "string",
              description: "name of document database to delete from",
            },
          }
        },
      },
      /*
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


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "create_json_doc_database": {
        const parsed = CreateDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for create_json_doc_database: ${parsed.error}`);
        }
        const results = await localJsonDbCollection.query<string, JsonDocDb>(
          "name",
          {
            range: [
              parsed.data.databaseName,
              parsed.data.databaseName
            ]
          });
        if (results.rows.length > 0) {
          throw new Error(`Database already exists: ${parsed.data.databaseName}`);
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

      case "save_json_doc_to_db": {
        const parsed = SaveJsonDocToDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for save_json_doc_to_db: ${parsed.error}`);
        }
        const doc = request.params.arguments?.doc;
        if (!doc) {
          throw new Error("Document is required");
        }

        const dbName = parsed.data.databaseName;
        if (!dbs[dbName]) {
          const newDb = fireproof(dbName);
          dbs[dbName] = { db: newDb };
        }
        const db = dbs[dbName].db;
        const response = await db.put({
          ...doc,
          created: Date.now(),
        });

        return {
          content: [
            {
              type: "text",
              text: `Saved document with ID: ${response.id} to database: ${dbName}`,
            }
          ]
        }
      }

      case "query_json_docs_from_db": {
        const parsed = QueryJsonDocsFromDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for query_json_docs_from_db: ${parsed.error}`);
        }

        const dbName = parsed.data.databaseName;
        if (!dbs[dbName]) {
          const newDb = fireproof(dbName);
          dbs[dbName] = { db: newDb };
        }
        const db = dbs[dbName].db;

        const results = await db.query(parsed.data.sortField, {
          includeDocs: true,
          descending: true,
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

      case "load_json_doc_from_db": {
        const parsed = LoadJsonDocFromDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for load_json_doc_from_db: ${parsed.error}`);
        }

        const dbName = parsed.data.databaseName;
        if (!dbs[dbName]) {
          const newDb = fireproof(dbName);
          dbs[dbName] = { db: newDb };
        }
        const db = dbs[dbName].db;

        const doc = await db.get(parsed.data.id);
        console.error("doc", doc);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(doc),
            },
          ],
        };
      }

      case "delete_json_doc_from_db": {
        const parsed = DeleteJsonDocFromDbArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for delete_json_doc_from_db: ${parsed.error}`);
        }

        const dbName = parsed.data.databaseName;
        if (!dbs[dbName]) {
          const newDb = fireproof(dbName);
          dbs[dbName] = { db: newDb };
        }
        const db = dbs[dbName].db;

        await db.del(parsed.data.id);
        return {
          content: [
            {
              type: "text",
              text: `Deleted document with ID: ${parsed.data.id}`,
            },
          ],
        };
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
