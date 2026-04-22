// Window Shopping — Mobile screens (iOS hero)
// Screens: Home (all closets), Closet detail (sections + items), Item detail, Add link, Tag picker

function MobileHome({ theme, onOpenCloset, onAdd, showEmpty }) {
  const closets = window.CLOSETS;

  if (showEmpty) {
    return (
      <div style={{ padding: '68px 24px 120px', background: 'var(--ws-paper)', minHeight: '100%' }}>
        <div style={{ paddingTop: 8 }}>
          <window.Eyebrow>Your wardrobe</window.Eyebrow>
          <window.Display size={42} style={{ marginTop: 12, marginBottom: 4 }}>
            Window<br/>Shopping.
          </window.Display>
          <div style={{ fontFamily: 'var(--ws-ui)', color: 'var(--ws-muted)', fontSize: 14, marginTop: 10 }}>
            Save the things you love, organize them like a boutique.
          </div>
        </div>
        <div style={{
          marginTop: 40, padding: '48px 28px',
          border: '1px dashed var(--ws-hairline)', borderRadius: 4,
          textAlign: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 44,
            border: '1px solid var(--ws-hairline)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--ws-display)', fontSize: 24, fontWeight: 300,
            color: 'var(--ws-muted)',
          }}>+</div>
          <div style={{
            fontFamily: 'var(--ws-display)', fontSize: 22, fontWeight: 300,
            marginTop: 16, color: 'var(--ws-ink)',
          }}>Your first closet</div>
          <div style={{
            fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-muted)',
            marginTop: 6, lineHeight: 1.5,
          }}>Paste a link to anything you've been<br/>eyeing and we'll handle the rest.</div>
          <button onClick={onAdd} style={{
            marginTop: 22, padding: '12px 28px',
            background: 'var(--ws-ink)', color: 'var(--ws-paper)',
            fontFamily: 'var(--ws-ui)', fontSize: 12, letterSpacing: 1.5,
            textTransform: 'uppercase', border: 'none', cursor: 'pointer',
            borderRadius: 2,
          }}>Paste a link</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ws-paper)', minHeight: '100%', paddingBottom: 140 }}>
      {/* Header */}
      <div style={{ padding: '68px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <window.Eyebrow>Apr · 2026</window.Eyebrow>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--ws-mono)', fontSize: 11, color: 'var(--ws-muted)' }}>
            <span>102 items</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>4 closets</span>
          </div>
        </div>
        <window.Display size={44} style={{ letterSpacing: -1 }}>
          Good evening,<br/>
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ws-accent)' }}>Mira</em>.
        </window.Display>
        <div style={{
          fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-muted)',
          marginTop: 12, lineHeight: 1.5,
        }}>3 new drops from your saved brands. 2 items<br/>on your wishlist went on sale.</div>
      </div>

      {/* Season chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 24px 20px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        <window.Eyebrow style={{ alignSelf: 'center', marginRight: 4 }}>Season</window.Eyebrow>
        {['All', 'S/S 26', 'F/W 25', 'Spring', 'Summer'].map((s, i) => (
          <button key={s} style={{
            flexShrink: 0,
            padding: '6px 14px', borderRadius: 999,
            fontFamily: 'var(--ws-mono)', fontSize: 11, letterSpacing: 0.3,
            border: '1px solid var(--ws-hairline)',
            background: i === 0 ? 'var(--ws-ink)' : 'transparent',
            color: i === 0 ? 'var(--ws-paper)' : 'var(--ws-ink)',
            cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      <window.Hairline style={{ margin: '0 24px' }} />

      {/* Closets list — editorial stack */}
      <div style={{ padding: '4px 0' }}>
        {closets.map((closet, idx) => (
          <button key={closet.id}
            onClick={() => onOpenCloset(closet.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '24px 24px', background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--ws-hairline)',
              cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Cover collage */}
              <div style={{
                width: 88, height: 112, position: 'relative', flexShrink: 0,
              }}>
                <window.ProductTile tone={closet.cover} size="100%" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                }} />
                <div style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 42, height: 52,
                }}>
                  <window.ProductTile tone={closet.cover + 1} size="100%" style={{
                    width: '100%', height: '100%',
                    outline: '3px solid var(--ws-paper)',
                  }}/>
                </div>
              </div>
              {/* Text */}
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6,
                }}>
                  <window.Eyebrow>Closet · {String(idx + 1).padStart(2,'0')}</window.Eyebrow>
                  <span style={{
                    fontFamily: 'var(--ws-mono)', fontSize: 10,
                    color: 'var(--ws-muted)',
                  }}>{closet.itemCount} items</span>
                </div>
                <div style={{
                  fontFamily: 'var(--ws-display)', fontSize: 24, fontWeight: 300,
                  color: 'var(--ws-ink)', lineHeight: 1.1, marginBottom: 4,
                  letterSpacing: -0.5,
                }}>{closet.name}</div>
                <div style={{
                  fontFamily: 'var(--ws-ui)', fontSize: 12, color: 'var(--ws-muted)',
                  marginBottom: 10,
                }}>{closet.subtitle}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {closet.tags.slice(0, 3).map(t => (
                    <window.Tag key={t} size="sm">{t}</window.Tag>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* New closet button */}
      <div style={{ padding: '20px 24px' }}>
        <button style={{
          width: '100%', padding: '14px',
          border: '1px dashed var(--ws-hairline)',
          background: 'transparent',
          fontFamily: 'var(--ws-ui)', fontSize: 12, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--ws-muted)',
          cursor: 'pointer', borderRadius: 2,
        }}>+ New closet</button>
      </div>
    </div>
  );
}

function MobileCloset({ closetId, theme, onBack, onOpenItem }) {
  const closet = window.CLOSETS.find(c => c.id === closetId) || window.CLOSETS[0];
  const items = window.ITEMS.filter(i => i.closet === closetId);
  const [view, setView] = React.useState('sections');
  const [activeSection, setActiveSection] = React.useState(null);

  const visibleItems = activeSection
    ? items.filter(i => i.section === activeSection)
    : items;

  return (
    <div style={{ background: 'var(--ws-paper)', minHeight: '100%', paddingBottom: 120 }}>
      {/* Hero */}
      <div style={{ padding: '68px 24px 20px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--ws-ui)', fontSize: 12, color: 'var(--ws-muted)',
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}>
          <span style={{ fontSize: 16 }}>←</span> All closets
        </button>
        <window.Eyebrow>Closet</window.Eyebrow>
        <window.Display size={40} style={{ marginTop: 8, marginBottom: 6 }}>
          {closet.name}
        </window.Display>
        <div style={{
          fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-muted)',
          lineHeight: 1.5,
        }}>{closet.subtitle}</div>
        <div style={{
          display: 'flex', gap: 16, marginTop: 16,
          fontFamily: 'var(--ws-mono)', fontSize: 11, color: 'var(--ws-muted)',
        }}>
          <span>{closet.itemCount} items</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{closet.sections.length} sections</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Updated 2h ago</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          {closet.tags.map(t => <window.Tag key={t} size="sm">{t}</window.Tag>)}
          <window.Tag size="sm" style={{ borderStyle: 'dashed', color: 'var(--ws-muted)' }}>+ tag</window.Tag>
        </div>
      </div>

      <window.Hairline style={{ margin: '0 24px' }} />

      {/* View switcher */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {['sections', 'grid'].map(v => (
            <button key={v} onClick={() => { setView(v); setActiveSection(null); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: view === v ? 'var(--ws-ink)' : 'var(--ws-muted)',
                borderBottom: view === v ? '1px solid var(--ws-ink)' : '1px solid transparent',
                paddingBottom: 2,
              }}>{v === 'sections' ? 'By Section' : 'All Items'}</button>
          ))}
        </div>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--ws-ui)', fontSize: 11, color: 'var(--ws-muted)',
          letterSpacing: 0.5,
        }}>⇅ Sort</button>
      </div>

      {view === 'sections' ? (
        <div>
          {closet.sections.map(sec => {
            const secItems = items.filter(i => i.section === sec.id);
            return (
              <div key={sec.id} style={{ marginBottom: 28 }}>
                <div style={{
                  padding: '0 24px', display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--ws-display)', fontSize: 22, fontWeight: 300,
                      color: 'var(--ws-ink)', letterSpacing: -0.3,
                    }}>{sec.name}</div>
                    <div style={{
                      fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)',
                      marginTop: 2, letterSpacing: 0.3,
                    }}>{sec.count} items · {sec.tags.join(' · ') || 'no tags'}</div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--ws-ui)', fontSize: 11, color: 'var(--ws-muted)',
                  }}>See all →</span>
                </div>
                <div style={{
                  display: 'flex', gap: 10, padding: '0 24px',
                  overflowX: 'auto', scrollbarWidth: 'none',
                }}>
                  {secItems.length > 0 ? secItems.map(item => (
                    <button key={item.id} onClick={() => onOpenItem(item.id)} style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      flexShrink: 0, textAlign: 'left',
                    }}>
                      <window.ProductTile
                        tone={item.tone} size={140}
                        label={item.colors[0]}
                      />
                      <div style={{
                        fontFamily: 'var(--ws-ui)', fontSize: 11, fontWeight: 500,
                        marginTop: 8, color: 'var(--ws-ink)',
                      }}>{item.brand}</div>
                      <div style={{
                        fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)',
                        marginTop: 2,
                      }}>{item.price}</div>
                    </button>
                  )) : (
                    <div style={{
                      width: 140, height: 140,
                      border: '1px dashed var(--ws-hairline)', borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)',
                      flexShrink: 0,
                    }}>+ add item</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
          padding: '0 24px',
        }}>
          {items.map(item => (
            <button key={item.id} onClick={() => onOpenItem(item.id)} style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              textAlign: 'left',
            }}>
              <window.ProductTile tone={item.tone} size="100%" style={{
                width: '100%', aspectRatio: '3/4',
              }}/>
              <div style={{
                fontFamily: 'var(--ws-ui)', fontSize: 11, fontWeight: 500,
                marginTop: 6, color: 'var(--ws-ink)',
              }}>{item.brand}</div>
              <div style={{
                fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)',
                marginBottom: 12,
              }}>{item.price} · {item.season}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileItem({ itemId, theme, onBack }) {
  const item = window.ITEMS.find(i => i.id === itemId) || window.ITEMS[0];
  const closet = window.CLOSETS.find(c => c.id === item.closet);

  return (
    <div style={{ background: 'var(--ws-paper)', minHeight: '100%', paddingBottom: 160 }}>
      {/* full bleed image */}
      <div style={{ position: 'relative' }}>
        <window.ProductTile tone={item.tone} size="100%" style={{
          width: '100%', aspectRatio: '4/5',
        }}/>
        <button onClick={onBack} style={{
          position: 'absolute', top: 70, left: 20,
          width: 36, height: 36, borderRadius: 36,
          background: 'rgba(245,241,234,0.9)',
          backdropFilter: 'blur(10px)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>←</button>
        <button style={{
          position: 'absolute', top: 70, right: 20,
          width: 36, height: 36, borderRadius: 36,
          background: 'rgba(245,241,234,0.9)',
          backdropFilter: 'blur(10px)',
          border: 'none', cursor: 'pointer',
          fontSize: 14,
        }}>⋯</button>
        {/* thumbnails */}
        <div style={{
          position: 'absolute', bottom: 20, left: 20,
          display: 'flex', gap: 6,
        }}>
          {[0, 1, 2, 3].map(i => (
            <window.ProductTile key={i} tone={item.tone + i} size={40} style={{
              border: i === 0 ? '2px solid var(--ws-paper)' : '2px solid transparent',
            }}/>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <window.Eyebrow>{closet.name} · {closet.sections.find(s => s.id === item.section)?.name}</window.Eyebrow>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginTop: 8,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--ws-display)', fontSize: 14, fontWeight: 400,
              fontStyle: 'italic', color: 'var(--ws-accent)',
            }}>{item.brand}</div>
            <window.Display size={28} style={{ marginTop: 4 }}>
              {item.name}
            </window.Display>
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14,
        }}>
          <span style={{
            fontFamily: 'var(--ws-display)', fontSize: 22, fontWeight: 300,
            color: 'var(--ws-ink)',
          }}>{item.price}</span>
          {item.originalPrice && (
            <span style={{
              fontFamily: 'var(--ws-mono)', fontSize: 12, color: 'var(--ws-muted)',
              textDecoration: 'line-through',
            }}>{item.originalPrice}</span>
          )}
        </div>

        {item.desc && (
          <div style={{
            fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-muted)',
            marginTop: 18, lineHeight: 1.6,
          }}>{item.desc}</div>
        )}

        <window.Hairline style={{ margin: '22px 0 16px' }}/>

        <window.Eyebrow style={{ marginBottom: 10 }}>Season</window.Eyebrow>
        <window.Tag season filled>{item.season}</window.Tag>

        <window.Eyebrow style={{ marginBottom: 10, marginTop: 20 }}>Tags · {item.tags.length}</window.Eyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {item.tags.map(t => <window.Tag key={t}>{t}</window.Tag>)}
          <window.Tag style={{ borderStyle: 'dashed', color: 'var(--ws-muted)' }}>+ add</window.Tag>
        </div>

        <window.Hairline style={{ margin: '22px 0 16px' }}/>

        <window.Eyebrow style={{ marginBottom: 12 }}>Details</window.Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: 8, columnGap: 16,
          fontFamily: 'var(--ws-mono)', fontSize: 11,
        }}>
          <div style={{ color: 'var(--ws-muted)' }}>SOURCE</div>
          <div style={{ color: 'var(--ws-ink)' }}>↗ {item.source}</div>
          <div style={{ color: 'var(--ws-muted)' }}>ADDED</div>
          <div style={{ color: 'var(--ws-ink)' }}>{item.addedAt}</div>
          <div style={{ color: 'var(--ws-muted)' }}>COLORS</div>
          <div style={{ color: 'var(--ws-ink)' }}>{item.colors.join(', ')}</div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 32px',
        background: 'linear-gradient(to top, var(--ws-paper) 70%, transparent)',
        display: 'flex', gap: 10,
      }}>
        <button style={{
          flex: 1, padding: '14px', background: 'var(--ws-ink)',
          color: 'var(--ws-paper)', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.8,
          textTransform: 'uppercase', borderRadius: 2,
        }}>Visit store</button>
        <button style={{
          width: 54, background: 'transparent', border: '1px solid var(--ws-hairline)',
          cursor: 'pointer', fontSize: 18, borderRadius: 2,
        }}>♡</button>
      </div>
    </div>
  );
}

function MobileAdd({ onClose, onCommit }) {
  const [step, setStep] = React.useState('paste');
  const [url, setUrl] = React.useState('');

  const handlePaste = () => {
    setUrl('toteme-studio.com/product/oversized-wool-cardigan');
    setStep('parsing');
    setTimeout(() => setStep('preview'), 1400);
  };

  return (
    <div style={{
      background: 'var(--ws-paper)', minHeight: '100%',
      padding: '68px 24px 160px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 28,
      }}>
        <window.Eyebrow>Add item</window.Eyebrow>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'var(--ws-ui)', fontSize: 11, color: 'var(--ws-muted)',
          letterSpacing: 1.5, textTransform: 'uppercase',
        }}>Cancel</button>
      </div>
      <window.Display size={38} style={{ marginBottom: 24 }}>
        Paste a link.<br/>
        <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--ws-accent)' }}>We'll handle it.</em>
      </window.Display>

      {/* URL input */}
      <div style={{
        border: '1px solid var(--ws-hairline)',
        padding: '18px 16px', marginBottom: 12,
        background: 'var(--ws-surface)',
      }}>
        <window.Eyebrow style={{ marginBottom: 8 }}>URL</window.Eyebrow>
        <div style={{
          fontFamily: 'var(--ws-mono)', fontSize: 13, color: 'var(--ws-ink)',
          minHeight: 20, wordBreak: 'break-all',
        }}>
          {url || <span style={{ color: 'var(--ws-muted)' }}>https://</span>}
          {step === 'paste' && <span style={{ opacity: 0.5, marginLeft: 2, animation: 'blink 1s step-end infinite' }}>|</span>}
        </div>
      </div>

      {step === 'paste' && (
        <>
          <button onClick={handlePaste} style={{
            width: '100%', padding: '14px',
            background: 'var(--ws-ink)', color: 'var(--ws-paper)',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.8,
            textTransform: 'uppercase', borderRadius: 2,
          }}>Paste from clipboard ⌘V</button>
          <div style={{
            marginTop: 28, padding: 16,
            border: '1px dashed var(--ws-hairline)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 24,
              background: 'var(--ws-accent)', color: 'var(--ws-paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--ws-mono)', fontSize: 11, flexShrink: 0,
            }}>↗</div>
            <div style={{ fontFamily: 'var(--ws-ui)', fontSize: 12, color: 'var(--ws-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--ws-ink)', fontWeight: 500 }}>Tip.</strong> Install the share sheet — tap any product in Safari and save it here in one tap.
            </div>
          </div>
        </>
      )}

      {step === 'parsing' && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          border: '1px solid var(--ws-hairline)',
        }}>
          <div style={{
            fontFamily: 'var(--ws-mono)', fontSize: 10, letterSpacing: 1,
            color: 'var(--ws-muted)', marginBottom: 18,
          }}>PARSING · toteme-studio.com</div>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16,
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 6,
                background: 'var(--ws-accent)',
                animation: `bounce 1.2s ${i * 0.15}s ease infinite`,
              }}/>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--ws-display)', fontSize: 16, fontWeight: 300, color: 'var(--ws-ink)' }}>
            Reading the page…
          </div>
          <div style={{ fontFamily: 'var(--ws-ui)', fontSize: 11, color: 'var(--ws-muted)', marginTop: 4 }}>
            Image · price · brand · materials
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: 'var(--ws-mono)', fontSize: 10, letterSpacing: 1,
            color: 'var(--ws-accent)', marginBottom: 14,
          }}>✓ PARSED</div>
          <div style={{
            display: 'flex', gap: 14,
            padding: 12, border: '1px solid var(--ws-hairline)',
          }}>
            <window.ProductTile tone={0} size={80} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--ws-display)', fontSize: 12, fontStyle: 'italic',
                color: 'var(--ws-accent)',
              }}>Toteme</div>
              <div style={{
                fontFamily: 'var(--ws-display)', fontSize: 17, fontWeight: 300,
                color: 'var(--ws-ink)', lineHeight: 1.2, marginTop: 2,
              }}>Oversized Wool Cardigan</div>
              <div style={{
                fontFamily: 'var(--ws-mono)', fontSize: 11, color: 'var(--ws-ink)',
                marginTop: 6,
              }}>$690 USD</div>
            </div>
          </div>

          {/* Closet picker */}
          <window.Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Save to closet</window.Eyebrow>
          <div style={{ display: 'grid', gap: 6 }}>
            {window.CLOSETS.slice(0, 2).map((c, i) => (
              <label key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                border: '1px solid var(--ws-hairline)',
                cursor: 'pointer',
                background: i === 0 ? 'var(--ws-accent-bg)' : 'transparent',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 16,
                  border: '1px solid var(--ws-ink)',
                  background: i === 0 ? 'var(--ws-ink)' : 'transparent',
                  flexShrink: 0,
                }}/>
                <window.ProductTile tone={c.cover} size={36} />
                <div>
                  <div style={{ fontFamily: 'var(--ws-ui)', fontSize: 13, color: 'var(--ws-ink)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--ws-mono)', fontSize: 10, color: 'var(--ws-muted)' }}>{c.itemCount} items</div>
                </div>
              </label>
            ))}
          </div>

          {/* Season — mandatory */}
          <window.Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Season <span style={{ color: 'var(--ws-accent)' }}>* required</span></window.Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {window.SEASONS.map((s, i) => (
              <window.Tag key={s} season={i === 4} filled={i === 4}>{s}</window.Tag>
            ))}
          </div>

          {/* Tags */}
          <window.Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Suggested tags</window.Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['wool', 'oversized', 'cream', 'layering', 'knit', 'investment'].map((t, i) => (
              <window.Tag key={t} filled={i < 3}>{t}</window.Tag>
            ))}
            <window.Tag style={{ borderStyle: 'dashed', color: 'var(--ws-muted)' }}>+ custom</window.Tag>
          </div>

          <button onClick={onCommit} style={{
            width: '100%', padding: '16px',
            background: 'var(--ws-ink)', color: 'var(--ws-paper)',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ws-ui)', fontSize: 11, letterSpacing: 1.8,
            textTransform: 'uppercase', borderRadius: 2,
            marginTop: 28,
          }}>Save to Main Wardrobe</button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MobileHome, MobileCloset, MobileItem, MobileAdd });
