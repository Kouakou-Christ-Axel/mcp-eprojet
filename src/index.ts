import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { api } from "./client/http.js";
import { creerTacheDescription, creerTacheHandler, creerTacheShape } from "./tools/creerTache.js";
import { ping, pingShape } from "./tools/ping.js";
import { logAction } from "./utils/actionsLog.js";

const server = new McpServer({ name: "eprojet", version: "1.0.0" });

server.registerTool(
  "tester_connexion",
  {
    description: "Vérifie la connexion à E-Projet (login + lecture d'une page protégée).",
    inputSchema: pingShape,
  },
  ping,
);

server.registerTool(
  "creer_tache",
  { description: creerTacheDescription, inputSchema: creerTacheShape },
  creerTacheHandler({ api, log: logAction }),
);

await server.connect(new StdioServerTransport());
