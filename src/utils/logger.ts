// stdout = protocole MCP : tout part sur stderr, jamais de mot de passe ni de cookie.
export const log = (...args: unknown[]) => console.error("[eprojet]", ...args);
