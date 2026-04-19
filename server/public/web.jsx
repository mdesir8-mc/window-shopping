// Window Shopping — Web dashboard
function WebDashboard({ theme, initialCloset, showEmpty }) {
  const [route, setRoute] = React.useState(initialCloset ? { view: 'closet', id: initialCloset } : { view: 'home' });
  const [selectedItem, setSelectedItem] = React.useState(null);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '232px 1fr',
      minHeight: '100%', background: 'var(--ws-paper)',
      color: 'var(--ws-ink)',
    }}>
      {/* Sidebar */}
      <aside style={{
        borderRight: '1px solid var(--ws-hairline)',
        padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--ws-display)', fontSize: 20, fontWeight: 400,
            letterSpacing: -0.5, lineHeight: 1,
          }}>Window<br/>Shopping<span style={{ color: 'var(--ws-accent)' }}>.</span></div>
          <div style={{
            fontFamily: 'var(--ws-mono)', fontSize: 9, color: 'var(--ws-muted)',
            marginTop: 6, letterSpacing: 1.5,
          }}>MIRA'S WARDROBE · v2</div>
        </div>

        {/* Nav */}
        <nav>
          <window.Eyebrow style={{ marginBottom: 8 }}>Library</window.Eyebrow>
          {[
            { k: 'home', label: 'All closets', count: 4, icon: '⌂' },
            { k: 'all', label: 'Everything', count: 102, icon: '◯' },
            { k: 'recent', label: 'Recently added', count: 12, icon: '⌚' },
            { k: 'sale', label: 'Price drops', count: 3, icon: '↘', accent: true },
          ].map(n => (
            <button key={n.k} onClick={() => setRoute({ view: 'home' })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', marginBottom: 2,
              background: route.view === 'home' && n.k === 'home' ? 'var(--ws-surface)' : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-ink)',
              borderRadius: 2,
            }}>
              <span style={{
                fontSize: 12, width: 16, textAlign: 'center',
                color: n.accent ? 'var(--ws-accent)' : 'var(--ws-muted)',
              }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)' }}>{n.count}</span>
            </button>
          ))}
        </nav>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <window.Eyebrow>Closets</window.Eyebrow>
            <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)', cursor: 'pointer' }}>+</span>
          </div>
          {window.CLOSETS.map(c => (
            <button key={c.id} onClick={() => setRoute({ view: 'closet', id: c.id })} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', marginBottom: 2,
              background: route.view === 'closet' && route.id === c.id ? 'var(--ws-surface)' : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-ink)',
              borderRadius: 2,
            }}>
              <window.ProductTile tone={c.cover} size={18} style={{ flexShrink: 0, borderRadius: 2 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)' }}>{c.itemCount}</span>
            </button>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <window.Eyebrow>Seasons</window.Eyebrow>
          </div>
          {[
            { s: 'S/S 26', c: 24 },
            { s: 'F/W 25', c: 38 },
            { s: 'Spring', c: 18 },
            { s: 'Summer', c: 14 },
            { s: 'Fall', c: 22 },
            { s: 'Winter', c: 26 },
          ].map(({s,c}) => (
            <button key={s} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', background: 'transparent', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--ws-ui)', fontSize: 12, color: 'var(--ws-muted)',
            }}>
              <span style={{ width: 4, height: 4, borderRadius: 4, background: 'var(--ws-muted)' }} />
              <span style={{ flex: 1 }}>{s}</span>
              <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10 }}>{c}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--ws-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 28, background: 'var(--ws-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ws-display)', fontSize: 13, color: 'var(--ws-paper)',
            }}>M</div>
            <div>
              <div style={{ fontFamily: 'var(--ws-ui)', fontSize: 12 }}>Mira Okafor</div>
              <div style={{ fontFamily: 'var(--ws-mono)', fontSize: 9, color: 'var(--ws-muted)' }}>free plan · 102/∞</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ overflow: 'auto', position: 'relative' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '18px 32px', borderBottom: '1px solid var(--ws-hairline)',
          position: 'sticky', top: 0, background: 'var(--ws-paper)', zIndex: 5,
        }}>
          <div style={{
            flex: 1, maxWidth: 360,
            border: '1px solid var(--ws-hairline)', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--ws-mono)', fontSize: 11, color: 'var(--ws-muted)',
          }}>
            <span>⌕</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search items, brands, tags…</span>
            <span style={{ marginLeft: 'auto', padding: '1px 5px', border: '1px solid var(--ws-hairline)', fontSize: 9, flexShrink: 0 }}>⌘K</span>
          </div>
          <div style={{ flex: 1 }} />
          <button style={{
            padding: '8px 14px', background: 'transparent',
            border: '1px solid var(--ws-hairline)', cursor: 'pointer',
            fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--ws-ink)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>Manage tags</button>
          <button style={{
            padding: '8px 16px', background: 'var(--ws-ink)', color: 'var(--ws-paper)',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase', borderRadius: 2,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>+ Paste link</button>
        </div>

        {route.view === 'home' && !showEmpty && <WebHome onOpenCloset={id => setRoute({ view: 'closet', id })} onOpenItem={setSelectedItem} />}
        {route.view === 'home' && showEmpty && <WebEmpty />}
        {route.view === 'closet' && <WebCloset id={route.id} onOpenItem={setSelectedItem} onBack={() => setRoute({ view: 'home' })} />}

        {selectedItem && (
          <WebItemDrawer itemId={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </main>
    </div>
  );
}

function WebEmpty() {
  return (
    <div style={{ padding: '60px 40px', maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
      <div style={{
        padding: '80px 40px', border: '1px dashed var(--ws-hairline)', borderRadius: 4,
      }}>
        <window.Eyebrow>Empty wardrobe</window.Eyebrow>
        <window.Display size={48} style={{ marginTop: 16, marginBottom: 10 }}>
          Nothing saved, <em style={{ fontStyle: 'italic', color: 'var(--ws-accent)', fontWeight: 300 }}>yet</em>.
        </window.Display>
        <div style={{
          fontFamily: 'var(--ws-ui)', fontSize: 14, color: 'var(--ws-muted)',
          maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6,
        }}>Paste a link from any fashion site. We'll pull the image, price, brand, and materials — you fit it in a closet.</div>
        <button style={{
          padding: '14px 32px', background: 'var(--ws-ink)', color: 'var(--ws-paper)',
          border: 'none', cursor: 'pointer',
          fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.8,
          textTransform: 'uppercase', borderRadius: 2,
        }}>Paste your first link</button>
      </div>
    </div>
  );
}

function WebHome({ onOpenCloset, onOpenItem }) {
  return (
    <div style={{ padding: '32px 40px 60px' }}>
      {/* Hero */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40,
        paddingBottom: 40, borderBottom: '1px solid var(--ws-hairline)',
        marginBottom: 40,
      }}>
        <div>
          <window.Eyebrow>Spring · 2026 · Thu Apr 17</window.Eyebrow>
          <window.Display size={80} style={{ marginTop: 16, lineHeight: 0.95 }}>
            Good evening,<br/>
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ws-accent)' }}>Mira</em>.
          </window.Display>
          <div style={{
            fontFamily: 'var(--ws-ui)', fontSize: 15, color: 'var(--ws-muted)',
            marginTop: 20, lineHeight: 1.6, maxWidth: 460,
          }}>Three new drops from brands you follow. Two items on your wishlist went on sale. One grail you've been watching since October is finally back.</div>
          <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
            {[
              { n: 102, l: 'items saved' },
              { n: 4, l: 'closets' },
              { n: 38, l: 'tags' },
              { n: '$14.2k', l: 'closet value' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: 'var(--ws-display)', fontSize: 28, fontWeight: 300 }}>{s.n}</div>
                <window.Eyebrow>{s.l}</window.Eyebrow>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', minHeight: 280 }}>
          {[
            { tone: 5, top: 0, left: 0, w: 140, h: 180, label: 'Lemaire' },
            { tone: 9, top: 20, left: 160, w: 110, h: 140, label: 'Loro Piana' },
            { tone: 0, top: 170, left: 80, w: 130, h: 120, label: 'Toteme' },
            { tone: 11, top: 40, left: 290, w: 80, h: 100, label: 'Hermès' },
          ].map((t, i) => (
            <div key={i} style={{
              position: 'absolute', top: t.top, left: t.left,
              width: t.w, height: t.h,
            }}>
              <window.ProductTile tone={t.tone} size="100%" label={t.label} style={{
                width: '100%', height: '100%',
              }}/>
            </div>
          ))}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            fontFamily: 'var(--ws-mono)', fontSize: 9, color: 'var(--ws-muted)',
            letterSpacing: 1, textAlign: 'right',
          }}>FIG. 01 — RECENT<br/>SAVES</div>
        </div>
      </div>

      {/* Closet grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, gap: 20 }}>
        <window.Display size={28} style={{ whiteSpace: 'nowrap' }}>Your closets</window.Display>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1px solid var(--ws-ink)', paddingBottom: 2, cursor: 'pointer' }}>Grid</span>
          <span style={{ fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ws-muted)', cursor: 'pointer' }}>List</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {window.CLOSETS.map((c, idx) => (
          <button key={c.id} onClick={() => onOpenCloset(c.id)} style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            textAlign: 'left',
          }}>
            <div style={{ position: 'relative', aspectRatio: '3/4' }}>
              <window.ProductTile tone={c.cover} size="100%" style={{ width: '100%', height: '100%' }}/>
              <div style={{
                position: 'absolute', top: 12, left: 12,
                fontFamily: 'var(--ws-mono)', fontSize: 9, color: 'rgba(26,22,19,0.7)',
                letterSpacing: 1,
              }}>N° 0{idx+1}</div>
              <div style={{
                position: 'absolute', bottom: 10, right: 10,
                fontFamily: 'var(--ws-mono)', fontSize: 10,
                color: 'rgba(26,22,19,0.7)',
                background: 'rgba(245,241,234,0.8)',
                backdropFilter: 'blur(4px)',
                padding: '3px 8px',
              }}>{c.itemCount} items</div>
            </div>
            <div style={{ paddingTop: 12 }}>
              <window.Eyebrow>Closet</window.Eyebrow>
              <div style={{
                fontFamily: 'var(--ws-display)', fontSize: 22, fontWeight: 300,
                letterSpacing: -0.3, marginTop: 4, lineHeight: 1.1,
              }}>{c.name}</div>
              <div style={{
                fontFamily: 'var(--ws-ui)', fontSize: 12, color: 'var(--ws-muted)',
                marginTop: 4,
              }}>{c.subtitle}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                {c.tags.slice(0, 2).map(t => <window.Tag key={t} size="sm">{t}</window.Tag>)}
              </div>
            </div>
          </button>
        ))}
        <button style={{
          aspectRatio: '3/4', border: '1px dashed var(--ws-hairline)',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 8,
          fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--ws-muted)',
        }}>
          <span style={{ fontFamily: 'var(--ws-display)', fontSize: 32, fontWeight: 300 }}>+</span>
          New closet
        </button>
      </div>

      {/* Recent activity */}
      <div style={{ marginTop: 60, paddingTop: 40, borderTop: '1px solid var(--ws-hairline)' }}>
        <window.Display size={28} style={{ marginBottom: 20 }}>Recent arrivals</window.Display>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {window.ITEMS.slice(0, 6).map(item => (
            <button key={item.id} onClick={() => onOpenItem(item.id)} style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              textAlign: 'left',
            }}>
              <window.ProductTile tone={item.tone} size="100%" style={{
                width: '100%', aspectRatio: '3/4',
              }}/>
              <div style={{
                fontFamily: 'var(--ws-display)', fontSize: 11, fontStyle: 'italic',
                color: 'var(--ws-accent)', marginTop: 8,
              }}>{item.brand}</div>
              <div style={{
                fontFamily: 'var(--ws-ui)', fontSize: 12,
                marginTop: 2, lineHeight: 1.25,
              }}>{item.name}</div>
              <div style={{
                fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)',
                marginTop: 4,
              }}>{item.price} · {item.addedAt}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WebCloset({ id, onOpenItem, onBack }) {
  const closet = window.CLOSETS.find(c => c.id === id);
  const items = window.ITEMS.filter(i => i.closet === id);
  const [filter, setFilter] = React.useState(null);

  if (!closet) return null;

  const visibleItems = filter ? items.filter(i => i.section === filter) : items;

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        marginBottom: 18, fontFamily: 'var(--ws-ui)', fontSize: 11,
        color: 'var(--ws-muted)', letterSpacing: 1.5, textTransform: 'uppercase',
      }}>← All closets</button>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40,
        paddingBottom: 32, borderBottom: '1px solid var(--ws-hairline)', marginBottom: 32,
      }}>
        <div>
          <window.Eyebrow>Closet</window.Eyebrow>
          <window.Display size={68} style={{ marginTop: 12, marginBottom: 10 }}>
            {closet.name}
          </window.Display>
          <div style={{
            fontFamily: 'var(--ws-ui)', fontSize: 15, color: 'var(--ws-muted)',
            lineHeight: 1.6, maxWidth: 520,
          }}>{closet.subtitle}. An evolving, tag-indexed edit of the pieces I return to — or am quietly saving for.</div>

          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            {[
              { n: closet.itemCount, l: 'items' },
              { n: closet.sections.length, l: 'sections' },
              { n: closet.tags.length + 4, l: 'tags' },
              { n: '2h', l: 'updated' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: 'var(--ws-display)', fontSize: 22, fontWeight: 300 }}>{s.n}</div>
                <window.Eyebrow>{s.l}</window.Eyebrow>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <window.Eyebrow style={{ marginBottom: 8 }}>Closet tags</window.Eyebrow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {closet.tags.map(t => <window.Tag key={t}>{t}</window.Tag>)}
              <window.Tag style={{ borderStyle: 'dashed', color: 'var(--ws-muted)' }}>+ add tag</window.Tag>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', height: 280 }}>
          {[
            { tone: closet.cover, top: 0, left: 40, w: 180, h: 220 },
            { tone: closet.cover + 2, top: 30, left: 200, w: 100, h: 130 },
            { tone: closet.cover + 4, top: 170, left: 180, w: 110, h: 90 },
          ].map((t, i) => (
            <div key={i} style={{
              position: 'absolute', top: t.top, left: t.left,
              width: t.w, height: t.h,
            }}>
              <window.ProductTile tone={t.tone} size="100%" style={{ width: '100%', height: '100%' }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24,
        borderBottom: '1px solid var(--ws-hairline)', paddingBottom: 12,
      }}>
        <button onClick={() => setFilter(null)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--ws-display)', fontSize: 18, fontWeight: 300,
          color: filter === null ? 'var(--ws-ink)' : 'var(--ws-muted)',
          fontStyle: filter === null ? 'italic' : 'normal',
        }}>All <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, marginLeft: 4 }}>{items.length}</span></button>
        {closet.sections.map(s => (
          <button key={s.id} onClick={() => setFilter(s.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--ws-display)', fontSize: 18, fontWeight: 300,
            color: filter === s.id ? 'var(--ws-ink)' : 'var(--ws-muted)',
            fontStyle: filter === s.id ? 'italic' : 'normal',
          }}>{s.name} <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, marginLeft: 4 }}>{s.count}</span></button>
        ))}
        <button style={{
          background: 'none', border: '1px dashed var(--ws-hairline)',
          padding: '4px 10px', cursor: 'pointer',
          fontFamily: 'var(--ws-ui)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--ws-muted)',
        }}>+ Section</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 11, color: 'var(--ws-muted)' }}>Sort: Newest ↓</span>
      </div>

      {/* Items grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {visibleItems.map(item => (
          <button key={item.id} onClick={() => onOpenItem(item.id)} style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            textAlign: 'left',
          }}>
            <div style={{ position: 'relative' }}>
              <window.ProductTile tone={item.tone} size="100%" style={{
                width: '100%', aspectRatio: '3/4',
              }}/>
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(245,241,234,0.85)',
                backdropFilter: 'blur(4px)',
                padding: '3px 7px',
                fontFamily: 'var(--ws-mono)', fontSize: 9,
                color: 'var(--ws-accent)', letterSpacing: 0.5,
              }}>{item.season}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--ws-display)', fontSize: 12, fontStyle: 'italic',
                  color: 'var(--ws-accent)',
                }}>{item.brand}</div>
                <div style={{
                  fontFamily: 'var(--ws-ui)', fontSize: 13, marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{item.name}</div>
              </div>
              <div style={{
                fontFamily: 'var(--ws-mono)', fontSize: 11,
              }}>{item.price}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {item.tags.slice(0, 2).map(t => <window.Tag key={t} size="sm">{t}</window.Tag>)}
              {item.tags.length > 2 && (
                <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)' }}>+{item.tags.length - 2}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WebItemDrawer({ itemId, onClose }) {
  const item = window.ITEMS.find(i => i.id === itemId);
  if (!item) return null;
  const closet = window.CLOSETS.find(c => c.id === item.closet);
  const section = closet.sections.find(s => s.id === item.section);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,22,19,0.35)',
      backdropFilter: 'blur(4px)', zIndex: 50,
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 580, background: 'var(--ws-paper)', height: '100%',
        overflow: 'auto', boxShadow: '-20px 0 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{ position: 'relative' }}>
          <window.ProductTile tone={item.tone} size="100%" style={{
            width: '100%', aspectRatio: '4/5',
          }}/>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 32,
            background: 'rgba(245,241,234,0.9)', backdropFilter: 'blur(10px)',
            border: 'none', cursor: 'pointer', fontSize: 14,
          }}>×</button>
          <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 6 }}>
            {[0,1,2,3].map(i => (
              <window.ProductTile key={i} tone={item.tone + i} size={48} style={{
                border: i === 0 ? '2px solid var(--ws-paper)' : '2px solid transparent',
              }}/>
            ))}
          </div>
        </div>

        <div style={{ padding: '28px 32px 40px' }}>
          <window.Eyebrow>{closet.name} · {section.name}</window.Eyebrow>
          <div style={{
            fontFamily: 'var(--ws-display)', fontSize: 16, fontStyle: 'italic',
            color: 'var(--ws-accent)', marginTop: 8,
          }}>{item.brand}</div>
          <window.Display size={36} style={{ marginTop: 4 }}>{item.name}</window.Display>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 16 }}>
            <span style={{ fontFamily: 'var(--ws-display)', fontSize: 28, fontWeight: 300 }}>{item.price}</span>
            {item.originalPrice && (
              <span style={{ fontFamily: 'var(--ws-mono)', fontSize: 13, color: 'var(--ws-muted)', textDecoration: 'line-through' }}>{item.originalPrice}</span>
            )}
          </div>

          {item.desc && (
            <div style={{
              fontFamily: 'var(--ws-ui)', fontSize: 14, color: 'var(--ws-muted)',
              marginTop: 18, lineHeight: 1.6, maxWidth: 460,
            }}>{item.desc}</div>
          )}

          <window.Hairline style={{ margin: '24px 0 18px' }}/>
          <window.Eyebrow style={{ marginBottom: 10 }}>Season · required</window.Eyebrow>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {window.SEASONS.map(s => (
              <window.Tag key={s} filled={s === item.season}>{s}</window.Tag>
            ))}
          </div>

          <window.Eyebrow style={{ marginBottom: 10, marginTop: 20 }}>Tags</window.Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.tags.map(t => <window.Tag key={t} onRemove={() => {}}>{t}</window.Tag>)}
            <window.Tag style={{ borderStyle: 'dashed', color: 'var(--ws-muted)' }}>+ add tag</window.Tag>
          </div>

          <window.Hairline style={{ margin: '24px 0 18px' }}/>
          <window.Eyebrow style={{ marginBottom: 12 }}>Details</window.Eyebrow>
          <div style={{
            display: 'grid', gridTemplateColumns: '120px 1fr',
            rowGap: 10, columnGap: 16,
            fontFamily: 'var(--ws-mono)', fontSize: 12,
          }}>
            <div style={{ color: 'var(--ws-muted)' }}>SOURCE</div>
            <div>↗ {item.source}</div>
            <div style={{ color: 'var(--ws-muted)' }}>ADDED</div>
            <div>{item.addedAt}</div>
            <div style={{ color: 'var(--ws-muted)' }}>COLORS</div>
            <div>{item.colors.join(', ')}</div>
            <div style={{ color: 'var(--ws-muted)' }}>CLOSET</div>
            <div>{closet.name} / {section.name}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
            <button style={{
              flex: 1, padding: '14px', background: 'var(--ws-ink)', color: 'var(--ws-paper)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.8,
              textTransform: 'uppercase', borderRadius: 2,
            }}>Visit store ↗</button>
            <button style={{
              padding: '14px 18px', background: 'transparent',
              border: '1px solid var(--ws-hairline)', cursor: 'pointer',
              fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}>Move</button>
            <button style={{
              padding: '14px 18px', background: 'transparent',
              border: '1px solid var(--ws-hairline)', cursor: 'pointer',
              fontSize: 14,
            }}>♡</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebDashboard });
