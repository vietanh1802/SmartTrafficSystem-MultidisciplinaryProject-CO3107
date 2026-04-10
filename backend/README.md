# Backend Guide (Flask + AI + IoT + MongoDB)

## 1) Cai dat

```bash
cd backend
pip install -r ../requirements.txt
```

Note:

- Chi con 1 file dependency duy nhat: `requirements.txt` o root.
- Khi dang o `backend/`, hay install bang `pip install -r ../requirements.txt`.

## 2) Cau hinh .env

Tao `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/traffic_system?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=traffic_system
MONGODB_SENSOR_COLLECTION=sensor_history

ADAFRUIT_AIO_USERNAME=<your_adafruit_username>
ADAFRUIT_AIO_KEY=<your_adafruit_key>
```

## 3) Kiem tra MongoDB Atlas

```bash
python -c "from app.database import check_mongodb_connection; ok, err = check_mongodb_connection(); print('MongoDB OK' if ok else f'MongoDB FAIL: {err}')"
```

## 4) Kiem tra luu sensor history

```bash
python -c "from app.services.history_service import save_sensor_history; print(save_sensor_history(123.4, 29.1, 'manual-test'))"
```

## 5) Chay backend

```bash
python -m app.main
```

Server default: `http://127.0.0.1:5000`

## 6) API chinh

- `GET /api/traffic`
- `GET /api/system_params`
- `PUT /api/system_params`
- `POST /api/control`
- `POST /api/manual_control`
- `POST /api/analyze_images`
- `POST /api/run_decision_with_images`
- `GET /api/sensor_history?limit=20`

## 7) Test decision API

PowerShell:

```powershell
$uri = "http://127.0.0.1:5000/api/run_decision_with_images"

$form = @{
  north = Get-Item "D:\path\to\north.jpg"
  south = Get-Item "D:\path\to\south.jpg"
  east  = Get-Item "D:\path\to\east.jpg"
  west  = Get-Item "D:\path\to\west.jpg"
}

$res = Invoke-RestMethod -Method Post -Uri $uri -Form $form
$res | ConvertTo-Json -Depth 10
```

## 8) Test sensor history API

```powershell
$uri = "http://127.0.0.1:5000/api/sensor_history?limit=20"
$res = Invoke-RestMethod -Method Get -Uri $uri
$res | ConvertTo-Json -Depth 10
```

## 9) Luu y van hanh

- `run_decision_with_images` co co che fallback sensor khi IoT chua tra data kip.
- Sensor history se luu vao MongoDB voi source theo luong run.
- Khong commit file `.env`.
