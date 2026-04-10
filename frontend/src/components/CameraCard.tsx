export type CameraDirection = 'north' | 'south' | 'east' | 'west'

export type LightColor = 'red' | 'yellow' | 'green'

export type IntersectionTraffic = {
  vehicles: number
  light: LightColor
  last_update: string
}

type VehicleBreakdown = {
  bicycle?: number
  motorcycle?: number
  car?: number
  bus?: number
  truck?: number
  [key: string]: number | undefined
}

export type AiDirectionData = {
  vehicle_count: number
  vehicle_breakdown: VehicleBreakdown
  weighted_vehicle_score: number
  density_ratio: number
}

const VEHICLE_COLORS: Record<string, string> = {
  car:        '#4dabff',
  motorcycle: '#22c55e',
  truck:      '#f59e0b',
  bus:        '#ef4444',
  bicycle:    '#a78bfa',
}

function titleFromDirection(direction: CameraDirection) {
  switch (direction) {
    case 'north': return 'NORTH DIRECTION'
    case 'south': return 'SOUTH DIRECTION'
    case 'east':  return 'EAST DIRECTION'
    case 'west':  return 'WEST DIRECTION'
  }
}

type CameraCardProps = {
  direction: CameraDirection
  traffic: IntersectionTraffic
  imageUrl?: string | null
  bboxImageUrl?: string | null
  onImageSelected?: (file: File) => void
  onRemoveImage?: () => void
  aiData?: AiDirectionData | null
  greenDuration?: number | null
}

export function CameraCard({
  direction,
  traffic,
  imageUrl,
  bboxImageUrl,
  onImageSelected,
  onRemoveImage,
  aiData,
}: CameraCardProps) {
  const displayImageUrl = bboxImageUrl ?? imageUrl

  const breakdownEntries = Object.entries(aiData?.vehicle_breakdown ?? {})
    .filter(([, count]) => (count ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

  return (
    <div className="st-cam">
      <div className="st-cam__top">
        <div className="st-cam__title">{titleFromDirection(direction)}</div>
        <div className="st-cam__badge">VEHICLE DETECTED</div>
      </div>

      <div className="st-cam__frame">
        <div className={`st-cam__light st-cam__light--${traffic.light}`} title={`Light: ${traffic.light}`} />
        <div className="st-cam__actions">
          <label className="st-uploadbtn">
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file && onImageSelected) onImageSelected(file)
                event.target.value = ''
              }}
              hidden
            />
          </label>
          {imageUrl && onRemoveImage && (
            <button type="button" className="st-uploadbtn st-uploadbtn--ghost" onClick={onRemoveImage}>
              Remove
            </button>
          )}
        </div>
        {displayImageUrl && (
          <>
            <img src={displayImageUrl} alt={`${titleFromDirection(direction)} upload`} className="st-cam__img" />
            <div className="st-cam__tag">{bboxImageUrl ? 'AI BBOX VIEW' : 'AI CAMERA FEED'}</div>
          </>
        )}
      </div>

      {/* AI metrics - chỉ hiện sau khi bấm RUN */}
      {aiData && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Vehicle count */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
              {aiData.vehicle_count}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 5 }}>
              vehicles detected
            </span>
          </div>

          {/* Breakdown tags */}
          {breakdownEntries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
              {breakdownEntries.map(([type, count]) => (
                <span key={type} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.75)',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  padding: '2px 7px',
                  borderLeft: `2px solid ${VEHICLE_COLORS[type] ?? '#888'}`,
                }}>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                  <strong style={{ color: '#fff' }}>{count}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}