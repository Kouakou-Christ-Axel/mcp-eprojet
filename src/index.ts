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
  supprimerTacheDescription,
  supprimerTacheHandler,
  supprimerTacheShape,
} from "./tools/supprimerTache.js";
import {
  creerTachesDescription,
  creerTachesHandler,
  creerTachesShape,
} from "./tools/creerTaches.js";
import {
  modifierTachesDescription,
  modifierTachesHandler,
  modifierTachesShape,
} from "./tools/modifierTaches.js";
import {
  listerProjetsDescription,
  listerProjetsHandler,
  listerProjetsShape,
} from "./tools/listerProjets.js";
import { lireTacheDescription, lireTacheHandler, lireTacheShape } from "./tools/lireTache.js";
import {
  lireTimesheetDescription,
  lireTimesheetHandler,
  lireTimesheetShape,
} from "./tools/lireTimesheet.js";
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
  "creer_taches",
  { description: creerTachesDescription, inputSchema: creerTachesShape },
  creerTachesHandler({ api, log: logAction }),
);

server.registerTool(
  "modifier_tache",
  { description: modifierTacheDescription, inputSchema: modifierTacheShape },
  modifierTacheHandler({ api, log: logAction }),
);

server.registerTool(
  "modifier_taches",
  { description: modifierTachesDescription, inputSchema: modifierTachesShape },
  modifierTachesHandler({ api, log: logAction }),
);

server.registerTool(
  "supprimer_tache",
  { description: supprimerTacheDescription, inputSchema: supprimerTacheShape },
  supprimerTacheHandler({ api, log: logAction }),
);

server.registerTool(
  "lister_taches",
  { description: listerTachesDescription, inputSchema: listerTachesShape },
  listerTachesHandler({ api }),
);

const aujourdhui = () => new Date().toLocaleDateString("sv-SE");

server.registerTool(
  "lister_projets",
  { description: listerProjetsDescription, inputSchema: listerProjetsShape },
  listerProjetsHandler({ api }),
);

server.registerTool(
  "lire_tache",
  { description: lireTacheDescription, inputSchema: lireTacheShape },
  lireTacheHandler({ api }),
);

server.registerTool(
  "lire_timesheet",
  { description: lireTimesheetDescription, inputSchema: lireTimesheetShape },
  lireTimesheetHandler({ api, aujourdhui }),
);

server.registerTool(
  "saisir_timesheet",
  { description: saisirTimesheetDescription, inputSchema: saisirTimesheetShape },
  saisirTimesheetHandler({ api, log: logAction, aujourdhui }),
);

await server.connect(new StdioServerTransport());
