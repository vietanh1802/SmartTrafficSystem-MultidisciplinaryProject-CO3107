import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'
import { CameraCard, type CameraDirection } from './components/CameraCard'
import { DonutChart } from './components/DonutChart'
import { Pill } from './components/Pill'
import { useTrafficApi } from './hooks/useTrafficApi'
import { useSensorData } from './hooks/useSensorData'
import logo from './assets/logo.png'

const directions: CameraDirection[] = ['north', 'south', 'east', 'west']
const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:5000'

// ==================== TYPES ====================

type VehicleBreakdown = {
  bicycle?: number
  motorcycle?: number
  car?: number
  bus?: number
  truck?: number
  [key: string]: number | undefined
}

type AiResults = {
  north: { vehicle_count: number; vehicle_breakdown: VehicleBreakdown; weighted_vehicle_score: number; density_ratio: number; annotated_image_base64?: string }
  south: { vehicle_count: number; vehicle_breakdown: VehicleBreakdown; weighted_vehicle_score: number; density_ratio: number; annotated_image_base64?: string }
  east:  { vehicle_count: number; vehicle_breakdown: VehicleBreakdown; weighted_vehicle_score: number; density_ratio: number; annotated_image_base64?: string}
  west:  { vehicle_count: number; vehicle_breakdown: VehicleBreakdown; weighted_vehicle_score: number; density_ratio: number; annotated_image_base64?: string }
}

type DecisionResult = {
  phase: 'NS' | 'EW'
  green_duration: number
  ai_results?: AiResults
  light_states?: {
    north: 'green' | 'red'
    south: 'green' | 'red'
    east: 'green' | 'red'
    west: 'green' | 'red'
  }
  details?: {
    NS: { color: 'green' | 'red'; duration: number }
    EW: { color: 'green' | 'red'; duration: number }
  }
}

// Bỏ gamma
type SystemParams = {
  alpha: number
  beta: number
  base_green_time: number
  vehicle_weights: {
    bicycle: number
    motorcycle: number
    car: number
    bus: number
    truck: number
  }
}

// Log entry tự build từ decision — không hardcode
type LogEntry = {
  t: string
  msg: string
}

// ==================== HELPERS ====================

function formatTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// ==================== COMPONENT ====================


function App() {
  const { data, status, lastUpdatedAt, changeLight } = useTrafficApi({
    baseUrl: backendUrl,
    pollMs: 4000,
  })
  const { items: sensorHistory, loading: sensorLoading, error: sensorError } = useSensorData({
    limit: 20,
    pollMs: 5000,
  })

  const [overrideAutomatic, setOverrideAutomatic] = useState(false)
  const sendManualControl = async (intersection_1: 'green' | 'red', intersection_2: 'green' | 'red') => {
    try {
      const res = await axios.post(`${backendUrl}/api/manual_control`, {
        override: overrideAutomatic,
        intersection_1,
        intersection_2
      })
  
      console.log("Manual control response:", res.data)
  
    } catch (error) {
      console.error("Manual control error:", error)
    }
  }
  const [decisionLog, setDecisionLog] = useState<LogEntry[]>([])

  const fallbackIntersections = useMemo(() => ({
    intersection_1: { vehicles: 12, light: 'green' as const, last_update: '—' },
    intersection_2: { vehicles: 7,  light: 'red'   as const, last_update: '—' },
  }), [])

  const intersections = useMemo(() => data ?? fallbackIntersections, [data, fallbackIntersections])

  const [cameraImages, setCameraImages] = useState<Record<CameraDirection, string | null>>({
    north: null, south: null, east: null, west: null,
  })
  const [cameraFiles, setCameraFiles] = useState<Record<CameraDirection, File | null>>({
    north: null, south: null, east: null, west: null,
  })

  const [decision, setDecision] = useState<DecisionResult | null>(null)
  const [isRunningDecision, setIsRunningDecision] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const [systemParams, setSystemParams] = useState<SystemParams>({
    alpha: 0.6,
    beta: 0.4,
    base_green_time: 10,
    vehicle_weights: { bicycle: 1, motorcycle: 1, car: 2, bus: 4, truck: 5 },
  })
  const [configStatus, setConfigStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [configMessage, setConfigMessage] = useState<string>('')

  const totals = useMemo(() => {
    const vehicles1 = intersections.intersection_1?.vehicles ?? 0
    const vehicles2 = intersections.intersection_2?.vehicles ?? 0
    return { vehicles1, vehicles2, total: vehicles1 + vehicles2 }
  }, [intersections])

  // Composition: ai_results thực nếu đã RUN, fallback mock nếu chưa
  const composition = useMemo(() => {
    const aiResults = decision?.ai_results
    if (aiResults) {
      const merged: Record<string, number> = {}
      for (const dir of directions) {
        const breakdown = aiResults[dir]?.vehicle_breakdown ?? {}
        for (const [type, count] of Object.entries(breakdown)) {
          merged[type] = (merged[type] ?? 0) + (count ?? 0)
        }
      }
      return [
        { label: 'Cars',        value: merged['car']        ?? 0, color: '#4dabff' },
        { label: 'Trucks',      value: merged['truck']      ?? 0, color: '#f59e0b' },
        { label: 'Buses',       value: merged['bus']        ?? 0, color: '#ef4444' },
        { label: 'Motorcycles', value: merged['motorcycle'] ?? 0, color: '#22c55e' },
        { label: 'Bicycles',    value: merged['bicycle']    ?? 0, color: '#a78bfa' },
      ].filter(x => x.value > 0)
    }
    const cars   = Math.max(1, Math.round(totals.total * 0.58))
    const trucks  = Math.max(0, Math.round(totals.total * 0.22))
    const buses   = Math.max(0, Math.round(totals.total * 0.11))
    const bikes   = Math.max(0, totals.total - cars - trucks - buses)
    return [
      { label: 'Cars',   value: cars,   color: '#4dabff' },
      { label: 'Trucks', value: trucks, color: '#f59e0b' },
      { label: 'Buses',  value: buses,  color: '#ef4444' },
      { label: 'Bikes',  value: bikes,  color: '#22c55e' },
    ]
  }, [decision?.ai_results, totals.total])

  // ==================== HANDLERS ====================

  const handleImageSelected = (direction: CameraDirection, file: File) => {
    const url = URL.createObjectURL(file)
    setCameraImages((prev) => {
      const existing = prev[direction]
      if (existing) URL.revokeObjectURL(existing)
      return { ...prev, [direction]: url }
    })
    setCameraFiles((prev) => ({ ...prev, [direction]: file }))
  }

  const handleRemoveImage = (direction: CameraDirection) => {
    setCameraImages((prev) => {
      const existing = prev[direction]
      if (existing) URL.revokeObjectURL(existing)
      return { ...prev, [direction]: null }
    })
    setCameraFiles((prev) => ({ ...prev, [direction]: null }))
  }

  const handleRunDecision = async () => {
    const missingDirections = directions.filter(dir => !cameraFiles[dir])
    if (missingDirections.length > 0) {
      setDecisionError(`Thiếu ảnh cho hướng: ${missingDirections.join(', ')}`)
      return
    }

    setIsRunningDecision(true)
    setDecisionError(null)
    try {
      const formData = new FormData()
      formData.append('north', cameraFiles.north!)
      formData.append('south', cameraFiles.south!)
      formData.append('east',  cameraFiles.east!)
      formData.append('west',  cameraFiles.west!)

      const res = await axios.post(`${backendUrl}/api/run_decision_with_images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const payload = (res.data?.data ?? res.data) as DecisionResult
      setDecision(payload)

      // 1 dòng log duy nhất mỗi lần bấm RUN
      const now         = formatTime(new Date())
      const winnerLabel = payload.phase === 'NS' ? 'NS' : 'EW'
      const loserLabel  = payload.phase === 'NS' ? 'EW' : 'NS'
      setDecisionLog(prev => [{
        t: now,
        msg: `${winnerLabel} GREEN ${payload.green_duration.toFixed(2)}s => ${loserLabel} RED ${payload.green_duration.toFixed(2)}s`,
      }, ...prev].slice(0, 10))

    } catch (error) {
      console.error(error)
      setDecisionError('Cannot call AI decision from backend.')
    } finally {
      setIsRunningDecision(false)
    }
  }

  useEffect(() => {
    const loadSystemParams = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/system_params`)
        const payload = (res.data?.data ?? res.data) as SystemParams
        if (payload?.vehicle_weights) setSystemParams(payload)
      } catch (error) {
        console.error('Failed to load system params:', error)
      }
    }
    void loadSystemParams()
  }, [])

  const handleParamChange = (key: keyof Omit<SystemParams, 'vehicle_weights'>, value: number) => {
    setSystemParams((prev) => ({ ...prev, [key]: value }))
  }

  const handleWeightChange = (key: keyof SystemParams['vehicle_weights'], value: number) => {
    setSystemParams((prev) => ({
      ...prev,
      vehicle_weights: { ...prev.vehicle_weights, [key]: value },
    }))
  }

  const handleSaveSystemParams = async () => {
    setConfigStatus('saving')
    setConfigMessage('')
    try {
      const res = await axios.put(`${backendUrl}/api/system_params`, systemParams, {
        headers: { 'X-Actor': 'traffic-admin-ui' },
      })
      const payload = (res.data?.data ?? res.data) as SystemParams
      setSystemParams(payload)
      setConfigStatus('saved')
      setConfigMessage('Configuration saved and applied to next decision cycle.')
    } catch (error) {
      console.error(error)
      setConfigStatus('error')
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message as string | undefined
        const details = error.response?.data?.errors as string[] | undefined
        setConfigMessage(
          details?.length
            ? `${message ?? 'Failed to save configuration'}: ${details.join('; ')}`
            : (message ?? 'Failed to save configuration. Check backend connection.')
        )
      } else {
        setConfigMessage('Failed to save configuration. Check backend connection.')
      }
    }
  }

  // ==================== RENDER ====================

  return (
    <div className="st-page">
      <header className="st-topbar">
        <div className="st-topbar__left">
          <div className="st-appmark">
            <img src={logo} alt="logo" className="st-appmark__logo" />
            <div className="st-appmark__text">
              <div className="st-appmark__title">SMART TRAFFIC LIGHT CONTROL SYSTEM</div>
              <div className="st-appmark__subtitle">INTERSECTION DASHBOARD</div>
            </div>
          </div>
        </div>

        <div className="st-topbar__center">
          <div className="st-status">
            {/* <div className="st-status__block">
              <div className="st-status__label">TRAFFIC DENSITY</div>
              <div className="st-status__value">{Math.min(99, Math.round((totals.total / 40) * 100))}%</div>
              <div className="st-meter">
                <div className="st-meter__bar" style={{ width: `${Math.min(100, (totals.total / 40) * 100)}%` }} />
              </div>
              <div className="st-status__hint">
                CURRENT GREEN TIME: {decision ? `${decision.green_duration.toFixed(2)}s` : '—'}
              </div>
            </div> */}

            <div className="st-status__block st-status__block--wide">
              <div className="st-status__label">OVERALL JUNCTION STATE</div>
              <div className="st-status__headline">
                <span className="st-trafficlight" aria-hidden>
                  <span className="st-trafficlight__dot st-trafficlight__dot--red" />
                  <span className="st-trafficlight__dot st-trafficlight__dot--yellow" />
                  <span className="st-trafficlight__dot st-trafficlight__dot--green" />
                </span>
                <span className="st-status__mode">AUTOMATIC MODE ACTIVE</span>
              </div>
              <div className="st-status__sub">
                <Pill tone={status === 'connected' ? 'success' : status === 'loading' ? 'info' : 'danger'}>
                  {status === 'connected' ? 'CONNECTED' : status === 'loading' ? 'CONNECTING' : 'OFFLINE'}
                </Pill>
                <span className="st-dotsep" />
                <span className="st-muted">Last update: {lastUpdatedAt ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="st-topbar__right">
          <Pill tone="neutral">Admin</Pill>
        </div>
      </header>

      <main className="st-main">
        {/* ── TOP: cameras + unified result panel (no split sidebar) ── */}
        <section className="st-grid">
          <div className="st-cameras">
            {directions.map((dir) => (
              <CameraCard
                key={dir}
                direction={dir}
                traffic={intersections[dir === 'north' || dir === 'south' ? 'intersection_1' : 'intersection_2']}
                imageUrl={cameraImages[dir]}
                onImageSelected={(file) => handleImageSelected(dir, file)}
                onRemoveImage={() => handleRemoveImage(dir)}
                aiData={decision?.ai_results?.[dir] ?? null}
                greenDuration={decision?.green_duration ?? null}
                bboxImageUrl={
                  decision?.ai_results?.[dir]?.annotated_image_base64
                    ? "data:image/jpeg;base64," + decision.ai_results[dir].annotated_image_base64
                    : null
                }
              />
            ))}
          </div>

          <div className="st-panel st-results">
            <div className="st-panel__header">
              <div className="st-panel__title">AI DECISION LOG</div>
              <button type="button" className="st-btn st-btn--ghost"
                onClick={handleRunDecision}
                disabled={isRunningDecision || status === 'loading'}>
                {isRunningDecision ? 'RUNNING...' : 'RUN'}
              </button>
            </div>

            {decision && (
              <p className="st-decision">
                Next green phase:{' '}
                <strong>{decision.phase === 'NS' ? 'NORTH & SOUTH' : 'EAST & WEST'}</strong> for{' '}
                <strong>{decision.green_duration.toFixed(2)}s</strong>.{' '}
                {decision.light_states && (
                  <span>
                    Lights — N: {decision.light_states.north}, S: {decision.light_states.south},{' '}
                    E: {decision.light_states.east}, W: {decision.light_states.west}.
                  </span>
                )}
              </p>
            )}

            {decisionError && <p className="st-error">{decisionError}</p>}

            <div className={`st-log st-log--compact ${decisionLog.length === 0 ? 'st-log--compact-empty' : ''}`}>
              {decisionLog.length === 0 ? (
                <div className="st-log__empty">
                  No decisions yet - upload 4 images and press RUN
                </div>
              ) : (
                decisionLog.map((x, i) => (
                  <div className="st-log__row" key={i}>
                    <div className="st-log__msg">{x.msg}</div>
                    <div className="st-log__time">{x.t}</div>
                  </div>
                ))
              )}
            </div>

            <div className="st-results__history">
              <div className="st-panel__title">SENSOR HISTORY (LATEST 20)</div>
              <div className="st-log st-log--scroll">
                {sensorLoading && (
                  <div className="st-log__row">
                    <div className="st-log__msg" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Loading sensor history...
                    </div>
                  </div>
                )}

                {sensorError && (
                  <div className="st-log__row">
                    <div className="st-log__msg st-error">{sensorError}</div>
                  </div>
                )}

                {!sensorLoading && !sensorError && sensorHistory.length === 0 && (
                  <div className="st-log__row">
                    <div className="st-log__msg" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      No sensor history yet
                    </div>
                  </div>
                )}

                {!sensorLoading && !sensorError && sensorHistory.map((s) => (
                  <div className="st-log__row" key={s.id}>
                    <div className="st-log__msg">
                      Lux: {s.light_intensity.toFixed(1)} | Temp: {s.temperature.toFixed(1)}°C | {s.source}
                    </div>
                    <div className="st-log__time">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                            hour12: false,
                          })
                        : '--:--:--'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── BOTTOM: Traffic Composition + Configuration + Manual Control ── */}
        <section className="st-bottom">
          {/* DonutChart */}
          <div className="st-panel">
            <div className="st-panel__title">TRAFFIC COMPOSITION</div>
            <div className="st-composition">
              <DonutChart items={composition} />
            </div>
          </div>

          {/* Configuration panel
          <div className="st-panel">
            <div className="st-panel__title">CONFIGURATION</div>
            <div className="st-params">
              <div className="st-formrow">
                <label className="st-label" htmlFor="alphaInput">Alpha</label>
                <input id="alphaInput" type="number" step="0.01" className="st-select"
                  value={systemParams.alpha}
                  onChange={(e) => handleParamChange('alpha', Number(e.target.value))} />
              </div>
              <div className="st-formrow">
                <label className="st-label" htmlFor="betaInput">Beta</label>
                <input id="betaInput" type="number" step="0.01" className="st-select"
                  value={systemParams.beta}
                  onChange={(e) => handleParamChange('beta', Number(e.target.value))} />
              </div>
              <div className="st-formrow">
                <label className="st-label" htmlFor="baseGreenInput">Base Green Time (s)</label>
                <input id="baseGreenInput" type="number" step="1" className="st-select"
                  value={systemParams.base_green_time}
                  onChange={(e) => handleParamChange('base_green_time', Number(e.target.value))} />
              </div>
              <div className="st-panel__title">Vehicle Weights</div>
              {(['bicycle', 'motorcycle', 'car', 'bus', 'truck'] as const).map((key) => (
                <div className="st-formrow" key={key}>
                  <label className="st-label" htmlFor={`weight-${key}`}>{key.toUpperCase()}</label>
                  <input id={`weight-${key}`} type="number" step="0.1" className="st-select"
                    value={systemParams.vehicle_weights[key]}
                    onChange={(e) => handleWeightChange(key, Number(e.target.value))} />
                </div>
              ))}
              <button type="button" className="st-btn" onClick={handleSaveSystemParams}
                disabled={configStatus === 'saving'}>
                {configStatus === 'saving' ? 'SAVING...' : 'SAVE CONFIGURATION'}
              </button>
              <div className="st-muted" style={{ fontSize: 12 }}>
                {configStatus !== 'idle' && configMessage}
              </div>
            </div>
          </div> */}

          {/* Manual Control panel */}
          <div className="st-panel">
            <div className="st-panel__title">MANUAL CONTROL</div>

            <div className="st-label" style={{ marginBottom: 6 }}>INTERSECTION 1 — NORTH / SOUTH</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className="st-btn st-btn--green" style={{ flex: 1 }}
                onClick={() => sendManualControl('green', 'red')}
                disabled={!overrideAutomatic}>GREEN</button>
              <button className="st-btn st-btn--red" style={{ flex: 1 }}
                onClick={() => sendManualControl('red', 'green')}
                disabled={!overrideAutomatic}>RED</button>
            </div>

            <div className="st-label" style={{ marginBottom: 6 }}>INTERSECTION 2 — EAST / WEST</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className="st-btn st-btn--green" style={{ flex: 1 }}
                onClick={() => sendManualControl('red', 'green')}
                disabled={!overrideAutomatic}>GREEN</button>
              <button className="st-btn st-btn--red" style={{ flex: 1 }}
                onClick={() => sendManualControl('green', 'red')}
                disabled={!overrideAutomatic}>RED</button>
            </div>

            <div className="st-toggleRow">
              <div>
                <div className="st-label">OVERRIDE AUTOMATIC</div>
                <div className="st-muted" style={{ fontSize: 12 }}>
                  Enable manual light control for the selected intersection.
                </div>
              </div>
              <button className={`st-toggle ${overrideAutomatic ? 'st-toggle--on' : ''}`}
                onClick={() => setOverrideAutomatic((v) => !v)}
                aria-pressed={overrideAutomatic}>
                <span className="st-toggle__knob" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App