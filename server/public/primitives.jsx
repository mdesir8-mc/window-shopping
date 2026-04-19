// Window Shopping — shared visual primitives

// Product placeholder — striped warm-toned tile with mono caption
function ProductTile({ tone = 0, label, size, style = {}, rounded = 0, theme }) {
  const [a, b] = window.PLACEHOLDER_TONES[tone % window.PLACEHOLDER_TONES.length];
  return (
    <div style={{
      width: size, height: size, position: 'relative', overflow: 'hidden',
      borderRadius: rounded,
      background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
      ...style,
    }}>
      {/* subtle diagonal stripes */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 14px)`,
      }} />
      {/* grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.25, mixBlendMode: 'overlay',
        backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.15), transparent 40%)`,
      }} />
      {label && (
        <div style={{
          position: 'absolute', bottom: 8, left: 10,
          fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
          fontSize: 9, letterSpacing: 0.5,
          color: 'rgba(26,22,19,0.55)',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
    </div>
  );
}

// Hairline label (uppercase micro text)
function Eyebrow({ children, style = {}, color }) {
  return (
    <div style={{
      fontFamily: 'var(--ws-ui)',
      fontSize: 10, fontWeight: 500,
      letterSpacing: 1.8, textTransform: 'uppercase',
      color: color || 'var(--ws-muted)',
      ...style,
    }}>{children}</div>
  );
}

// Tag chip
function Tag({ children, season, onRemove, style = {}, size = 'md', filled }) {
  const fs = size === 'sm' ? 10 : 11;
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'var(--ws-mono)',
      fontSize: fs, letterSpacing: 0.3,
      padding: pad, borderRadius: 999,
      border: '1px solid var(--ws-hairline)',
      background: filled ? 'var(--ws-ink)' : (season ? 'var(--ws-accent-bg)' : 'transparent'),
      color: filled ? 'var(--ws-paper)' : (season ? 'var(--ws-accent)' : 'var(--ws-ink)'),
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {season && <span style={{ width: 4, height: 4, borderRadius: 4, background: 'var(--ws-accent)' }} />}
      {children}
      {onRemove && (
        <button onClick={onRemove} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginLeft: 2, color: 'inherit', opacity: 0.5,
          fontSize: 12, lineHeight: 1,
        }}>×</button>
      )}
    </span>
  );
}

// Section divider with hairline
function Hairline({ style = {} }) {
  return <div style={{ height: 1, background: 'var(--ws-hairline)', ...style }} />;
}

// Serif display heading
function Display({ children, size = 48, weight = 300, style = {} }) {
  return (
    <h1 style={{
      fontFamily: 'var(--ws-display)',
      fontSize: size, fontWeight: weight,
      lineHeight: 1.02, letterSpacing: -0.02 * size,
      color: 'var(--ws-ink)', margin: 0,
      ...style,
    }}>{children}</h1>
  );
}

// Metadata row (brand · price · source) in mono
function Meta({ items, style = {} }) {
  return (
    <div style={{
      fontFamily: 'var(--ws-mono)', fontSize: 11,
      color: 'var(--ws-muted)', letterSpacing: 0.2,
      display: 'flex', gap: 8, alignItems: 'center',
      ...style,
    }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
          <span>{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { ProductTile, Eyebrow, Tag, Hairline, Display, Meta });
