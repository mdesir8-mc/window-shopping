import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools, type ToolContext } from "./tools";

/**
 * The transport is stateless, so a server instance is built per request from the
 * access token's subject and scopes. That also means the tool list a client sees
 * always reflects exactly what its token is allowed to do.
 */
export function buildMcpServer(context: ToolContext): McpServer {
  const server = new McpServer(
    { name: "window-shopping", version: "1.0.0" },
    {
      instructions:
        "Window Shopping is a wishlist of clothing the user does not own yet, organised into closets. " +
        "Closets contain optional sections, which contain items. Items track a price, an optional target " +
        "price, stock status, and a price history scraped from the retailer's page. " +
        "Call list_closets first to discover closet ids before creating or moving items."
    }
  );

  registerTools(server, context);

  return server;
}
