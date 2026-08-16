import { Router } from "express";
import {
  GRANTABLE_SCOPES,
  RESOURCE_SCOPES,
  baseUrl,
  issuer,
  protectedResourceMetadataUrl,
  resourceUrl
} from "./config";

/** RFC 9728 protected resource metadata. */
export function protectedResourceMetadata() {
  return {
    resource: resourceUrl(),
    authorization_servers: [issuer()],
    scopes_supported: [...RESOURCE_SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: `${baseUrl()}/`
  };
}

/** RFC 8414 authorization server metadata. */
export function authorizationServerMetadata() {
  return {
    issuer: issuer(),
    authorization_endpoint: `${baseUrl()}/oauth/authorize`,
    token_endpoint: `${baseUrl()}/oauth/token`,
    registration_endpoint: `${baseUrl()}/oauth/register`,
    revocation_endpoint: `${baseUrl()}/oauth/revoke`,
    scopes_supported: [...GRANTABLE_SCOPES],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // Claude's CIMD client authenticates as a public client, so "none" must be
    // offered or Claude falls back to Dynamic Client Registration.
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post"]
  };
}

const router = Router();

// Claude reads these server-to-server and MCP Inspector reads them from a
// browser, so they are unauthenticated and CORS-open. They contain no secrets.
router.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300");
  next();
});

// RFC 9728 §3.1: clients try the path-suffixed variant first when the resource
// URL has a path component (/mcp), then fall back to the bare well-known path.
router.get("/oauth-protected-resource/mcp", (_req, res) => {
  res.json(protectedResourceMetadata());
});

router.get("/oauth-protected-resource", (_req, res) => {
  res.json(protectedResourceMetadata());
});

router.get("/oauth-authorization-server", (_req, res) => {
  res.json(authorizationServerMetadata());
});

// Some clients probe the OpenID Connect discovery path instead of RFC 8414.
router.get("/openid-configuration", (_req, res) => {
  res.json(authorizationServerMetadata());
});

export { protectedResourceMetadataUrl };
export default router;
