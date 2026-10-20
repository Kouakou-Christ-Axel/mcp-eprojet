import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { api } from "./client/http.js";
import { creerTacheDescription, creerTacheHandler, creerTacheShape } from "./tools/creerTache.js";
import {
  listerTachesDescription,
  listerTachesHandler,
  listerTachesShape,
} from "./tools/listerTaches.js";
import {
  modifierTacheDescription,
  modifierTacheHandler,
  modifierTacheShape,
} from "./tools/modifierTache.js";
import {
  saisirTimesheetDescription,
  saisirTimesheetHandler,
  saisirTimesheetShape,
} from "./tools/saisirTimesheet.js";
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

server.registerTool(
  "modifier_tache",
  { description: modifierTacheDescription, inputSchema: modifierTacheShape },
  modifierTacheHandler({ api, log: logAction }),
);

server.registerTool(
  "lister_taches",
  { description: listerTachesDescription, inputSchema: listerTachesShape },
  listerTachesHandler({ api }),
);

server.registerTool(
  "saisir_timesheet",
  { description: saisirTimesheetDescription, inputSchema: saisirTimesheetShape },
  saisirTimesheetHandler({
    api,
    log: logAction,
    aujourdhui: () => new Date().toLocaleDateString("sv-SE"),
  }),
);

await server.connect(new StdioServerTransport());
