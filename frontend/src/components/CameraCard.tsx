export type CameraDirection = 'north' | 'south' | 'east' | 'west'

export type LightColor = 'red' | 'yellow' | 'green'

export type IntersectionTraffic = {
  vehicles: number
  light: LightColor
  last_update: string
}

// Dữ liệu AI từ detector.py cho từng hướng - optional, chỉ có sau khi bấm RUN
export type AiDirectionData = {
  vehicle_count: number
  weighted_vehicle_score: number  // dùng cho PRIORITY SCORE
  density_ratio: number           // [0, 1] từ Canny edge detection - dùng cho TRAFFIC DENSITY
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
  onImageSelected?: (file: File) => void
  onRemoveImage?: () => void
  aiData?: AiDirectionData | null       // từ ai_results sau khi RUN
  greenDuration?: number | null         // từ decision.green_duration sau khi RUN
}

export function CameraCard({
  direction,
  traffic,
  imageUrl,
  onImageSelected,
  onRemoveImage,
  aiData,
  greenDuration,
}: CameraCardProps) {

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
        {imageUrl && (
          <>
            <img src={imageUrl} alt={`${titleFromDirection(direction)} upload`} className="st-cam__img" />
            <div className="st-cam__tag">AI CAMERA FEED</div>
          </>
        )}
      </div>


    </div>
  )
}