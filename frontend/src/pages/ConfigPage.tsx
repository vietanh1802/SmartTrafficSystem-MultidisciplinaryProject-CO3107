import { useEffect, useState } from 'react'
import axios from 'axios'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:5000'

type VehicleWeights = {
  bicycle: number
  motorcycle: number
  car: number
  bus: number
  truck: number
}

type SystemParams = {
  alpha: number
  beta: number
  base_green_time: number
  vehicle_weights: VehicleWeights
}

const VEHICLE_COLORS: Record<string, string> = {
  bicycle:    '#a78bfa',
  motorcycle: '#22c55e',
  car:        '#4dabff',
  bus:        '#ef4444',
  truck:      '#f59e0b',
}

const DEFAULT: SystemParams = {
  alpha: 0.6,
  beta: 0.4,
  base_green_time: 10,
  vehicle_weights: { bicycle: 1, motorcycle: 1, car: 2, bus: 4, truck: 5 },
}

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export function ConfigPage() {
  const [params, setParams]   = useState<SystemParams>(DEFAULT)
  const [status, setStatus]   = useState<Status>('loading')
  const [message, setMessage] = useState('')

  // Load current params on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/system_params`)
        const data = (res.data?.data ?? res.data) as SystemParams
        if (data?.vehicle_weights) setParams(data)
        setStatus('idle')
      } catch {
        setMessage('Failed to load system parameters.')
        setStatus('error')
      }
    }
    void load()
  }, [])

  const handleSave = async () => {
    setStatus('saving')
    setMessage('')
    try {
      const res = await axios.put(`${backendUrl}/api/system_params`, params, {
        headers: { 'X-Actor': 'traffic-admin-ui' },
      })
      const data = (res.data?.data ?? res.data) as SystemParams
      if (data?.vehicle_weights) setParams(data)
      setStatus('saved')
      setMessage('Configuration saved and applied to next decision cycle.')
    } catch (error) {
      setStatus('error')
      if (axios.isAxiosError(error)) {
        const msg     = error.response?.data?.message as string | undefined
        const details = error.response?.data?.errors as string[] | undefined
        setMessage(details?.length
          ? `${msg ?? 'Failed to save'}: ${details.join('; ')}`
          : (msg ?? 'Failed to save configuration. Check backend connection.'))
      } else {
        setMessage('Failed to save configuration. Check backend connection.')
      }
    }
  }

  const handleReset = () => {
    setParams(DEFAULT)
    setStatus('idle')
    setMessage('')
  }

  const alphaSum = params.alpha + params.beta
  const alphaValid = alphaSum > 0 && params.alpha >= 0 && params.beta >= 0

  return (
    <div style={{ padding: '28px 32px', maxWidth: 720 }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.92)', margin: 0, marginBottom: 4 }}>
          System Configuration
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Configure parameters used in the traffic signal decision algorithm. Changes apply to the next decision cycle.
        </p>
      </div>

      {status === 'loading' && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading parameters...</div>
      )}

      {status !== 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Priority Coefficients ── */}
          <Section title="Priority Coefficients" desc="alpha and beta control how weighted vehicle score vs. road density affects the priority calculation. alpha + betamust be > 0.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field
                label="Alpha - Vehicle score weight"
                hint="Recommended: 0.4 - 0.8"
                value={params.alpha}
                min={0} max={1} step={0.01}
                onChange={v => setParams(p => ({ ...p, alpha: v }))}
              />
              <Field
                label="Beta - Road density weight"
                hint="Recommended: 0.2 - 0.6"
                value={params.beta}
                min={0} max={1} step={0.01}
                onChange={v => setParams(p => ({ ...p, beta: v }))}
              />
            </div>
            {!alphaValid && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                α and β must both be ≥ 0 and α + β must be &gt; 0.
              </div>
            )}
            {alphaValid && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                Current sum: alpha + beta = {alphaSum.toFixed(2)} - algorithm normalizes internally.
              </div>
            )}
          </Section>

          {/* ── Base Green Time ── */}
          <Section title="Base Green Time" desc="Minimum green light duration before priority adjustment is applied. Range: 5 - 180 seconds.">
            <div style={{ maxWidth: 300 }}>
              <Field
                label="Base green time (seconds)"
                hint="Range: 5 - 180 s"
                value={params.base_green_time}
                min={5} max={180} step={1}
                onChange={v => setParams(p => ({ ...p, base_green_time: v }))}
              />
            </div>
          </Section>

          {/* ── Vehicle Weights ── */}
          <Section title="Vehicle Weights" desc="Weight assigned to each vehicle type when computing the weighted vehicle score. Higher weight = more influence on priority. Range: 0 – 20.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(Object.keys(params.vehicle_weights) as (keyof VehicleWeights)[]).map(key => (
                <Field
                  key={key}
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                  hint="Range: 0 – 20"
                  value={params.vehicle_weights[key]}
                  min={0} max={20} step={0.5}
                  accent={VEHICLE_COLORS[key]}
                  onChange={v => setParams(p => ({
                    ...p,
                    vehicle_weights: { ...p.vehicle_weights, [key]: v },
                  }))}
                />
              ))}
            </div>
          </Section>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saving' || !alphaValid}
              style={{
                padding: '8px 20px',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.05em',
                borderRadius: 7,
                border: '1px solid rgba(77,171,255,0.5)',
                background: 'rgba(77,171,255,0.12)',
                color: '#4dabff',
                cursor: status === 'saving' || !alphaValid ? 'not-allowed' : 'pointer',
                opacity: status === 'saving' || !alphaValid ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {status === 'saving' ? 'SAVING...' : 'SAVE CONFIGURATION'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.05em',
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              RESET TO DEFAULT
            </button>

            {message && (
              <span style={{
                fontSize: 12,
                color: status === 'saved' ? '#22c55e' : '#ef4444',
                marginLeft: 4,
              }}>
                {message}
              </span>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Section wrapper ──
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)' }}>
          {title.toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          {desc}
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Number input field ──
function Field({
  label, hint, value, min, max, step, accent, onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  accent?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        {accent && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }}/>
        )}
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
          {label}
        </label>
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: 13,
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.85)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{hint}</div>
    </div>
  )
}