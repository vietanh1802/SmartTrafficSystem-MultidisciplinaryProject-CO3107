import { useState } from 'react'

type Phase = 'NS' | 'EW' | null   // NS = North/South green, EW = East/West green

type Props = {
  onSendControl: (i1: 'green' | 'red', i2: 'green' | 'red') => Promise<void>
}

export function ManualControlButton({ onSendControl }: Props) {
  const [open, setOpen]               = useState(false)
  const [enabled, setEnabled]         = useState(false)
  const [activePhase, setActivePhase] = useState<Phase>(null)
  const [sending, setSending]         = useState(false)

  async function handleSelect(phase: Phase) {
    if (!enabled || sending || phase === null) return
    setSending(true)
    setActivePhase(phase)
    try {
      if (phase === 'NS') {
        await onSendControl('green', 'red')
      } else {
        await onSendControl('red', 'green')
      }
    } catch (e) {
      console.error('Manual control error:', e)
    } finally {
      setSending(false)
    }
  }

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    if (!next) setActivePhase(null)
  }

  // light state derived from activePhase
  const lights = {
    north: activePhase === 'NS' ? 'green' : activePhase === 'EW' ? 'red'   : null,
    south: activePhase === 'NS' ? 'green' : activePhase === 'EW' ? 'red'   : null,
    east:  activePhase === 'EW' ? 'green' : activePhase === 'NS' ? 'red'   : null,
    west:  activePhase === 'EW' ? 'green' : activePhase === 'NS' ? 'red'   : null,
  }

  return (
    <>
      {/* ── Trigger button in dashboard ── */}
      <button
        type="button"
        className="st-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          fontSize: 12,
          letterSpacing: '0.05em',
          background: enabled ? 'rgba(239,68,68,0.15)' : undefined,
          borderColor: enabled ? 'rgba(239,68,68,0.5)' : undefined,
          color: enabled ? '#ef4444' : undefined,
        }}
        onClick={() => setOpen(true)}
      >
        {/* traffic light icon */}
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {(['#ef4444', '#f59e0b', '#22c55e'] as const).map((c, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: enabled && activePhase
                ? (i === 0 ? (lights.north === 'red'   ? c : 'rgba(255,255,255,0.15)')
                 : i === 2 ? (lights.north === 'green' ? c : 'rgba(255,255,255,0.15)')
                 : 'rgba(255,255,255,0.15)')
                : c,
            }}/>
          ))}
        </span>
        MANUAL CONTROL
        {enabled && activePhase && (
          <span style={{
            fontSize: 10,
            background: 'rgba(239,68,68,0.2)',
            color: '#ef4444',
            borderRadius: 4,
            padding: '1px 5px',
            letterSpacing: 0,
          }}>
            ACTIVE
          </span>
        )}
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            width: 360,
            background: '#1a1f2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', letterSpacing: '0.05em' }}>
                MANUAL CONTROL
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </div>

            {/* ON / OFF toggle — at the top */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: enabled ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${enabled ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 8,
              marginBottom: 20,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: enabled ? '#ef4444' : 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                  OVERRIDE AUTOMATIC
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {enabled ? 'Manual mode active — automatic is suspended' : 'Enable to control lights manually'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                style={{
                  minWidth: 56,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${enabled ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  background: enabled ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                  color: enabled ? '#ef4444' : 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                }}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Intersection 1 — North / South */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', marginBottom: 8 }}>
                INTERSECTION 1 — NORTH / SOUTH
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <LightButton
                  label="GREEN"
                  color="green"
                  active={activePhase === 'NS'}
                  disabled={!enabled || sending}
                  onClick={() => handleSelect('NS')}
                />
                <LightButton
                  label="RED"
                  color="red"
                  active={activePhase === 'EW'}
                  disabled={!enabled || sending}
                  onClick={() => handleSelect('EW')}
                />
              </div>
            </div>

            {/* Intersection 2 — East / West */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', marginBottom: 8 }}>
                INTERSECTION 2 — EAST / WEST
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <LightButton
                  label="GREEN"
                  color="green"
                  active={activePhase === 'EW'}
                  disabled={!enabled || sending}
                  onClick={() => handleSelect('EW')}
                />
                <LightButton
                  label="RED"
                  color="red"
                  active={activePhase === 'NS'}
                  disabled={!enabled || sending}
                  onClick={() => handleSelect('NS')}
                />
              </div>
            </div>

            {/* Live state indicator */}
            {enabled && activePhase && (
              <div style={{
                display: 'flex', gap: 8,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {(['north', 'south', 'east', 'west'] as const).map(dir => (
                  <div key={dir} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', margin: '0 auto 4px',
                      background: lights[dir] === 'green' ? '#22c55e' : '#ef4444',
                      boxShadow: lights[dir] === 'green'
                        ? '0 0 6px rgba(34,197,94,0.6)'
                        : '0 0 6px rgba(239,68,68,0.6)',
                    }}/>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>
                      {dir.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sending && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10 }}>
                Sending command...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Sub-component: individual light button ──
type LightButtonProps = {
  label: string
  color: 'green' | 'red'
  active: boolean
  disabled: boolean
  onClick: () => void
}

function LightButton({ label, color, active, disabled, onClick }: LightButtonProps) {
  const isGreen = color === 'green'
  const activeColor  = isGreen ? '#22c55e' : '#ef4444'
  const activeBg     = isGreen ? 'rgba(34,197,94,0.2)'  : 'rgba(239,68,68,0.2)'
  const activeBorder = isGreen ? 'rgba(34,197,94,0.6)'  : 'rgba(239,68,68,0.6)'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 8,
        border: `1px solid ${active ? activeBorder : 'rgba(255,255,255,0.1)'}`,
        background: active ? activeBg : 'rgba(255,255,255,0.04)',
        color: active ? activeColor : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.06em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {/* dot indicator */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: active ? activeColor : 'rgba(255,255,255,0.15)',
        transition: 'background 0.15s',
      }}/>
      {label}
    </button>
  )
}