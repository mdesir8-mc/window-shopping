import { useVersion } from "../../hooks/useVersion";

interface VersionTagProps {
  align?: "left" | "center" | "right";
}

function formatVersion(version?: string) {
  if (!version || version === "development") {
    return "beta";
  }

  return version.startsWith("v") ? version : `v${version}`;
}

function formatSha(sha?: string) {
  if (!sha || sha === "local") {
    return null;
  }

  return sha.slice(0, 7);
}

export default function VersionTag({ align = "left" }: VersionTagProps) {
  const versionQuery = useVersion();
  const version = formatVersion(versionQuery.data?.version);
  const sha = formatSha(versionQuery.data?.sha);

  return (
    <div
      aria-label={`Application version ${version}`}
      title={sha ? `${version} (${sha})` : version}
      style={{
        color: "var(--ws-muted)",
        fontSize: 10,
        letterSpacing: 1.4,
        textAlign: align,
        textTransform: "uppercase"
      }}
    >
      {version}
      {sha ? <span style={{ opacity: 0.7 }}> · {sha}</span> : null}
    </div>
  );
}
