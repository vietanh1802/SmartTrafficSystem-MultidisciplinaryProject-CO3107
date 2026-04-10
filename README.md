# Smart Traffic System (CO3107)

Smart Traffic System la he thong dieu khien den giao thong thong minh, ket hop:

- AI vehicle detection (YOLO)
- Decision making cho pha den NS/EW
- IoT sensor va dieu khien den (Adafruit IO + MQTT)
- Dashboard frontend (React + Vite)
- MongoDB Atlas de luu sensor history

## 1. Kien truc thu muc

```text
Smart-Traffic-System---Multidisciplinary-Project-CO3107-/
|- backend/        # Flask API + MQTT + MongoDB
|- frontend/       # React + TypeScript + Vite dashboard
|- ai_module/      # Detector va logic AI
|- data/           # Anh test, log data
|- iot/            # Firmware ESP32
|- yolov8m.pt      # Model su dung cho detector
```

## 2. Cong nghe chinh

- Backend: Flask, Flask-MQTT, PyMongo, OpenCV, Ultralytics
- Frontend: React 19, TypeScript, Vite, Axios
- Database: MongoDB Atlas
- IoT: Adafruit IO (MQTT)

## 3. Yeu cau moi truong

- Python 3.10+
- Node.js 18+
- npm
- Tai khoan MongoDB Atlas
- Tai khoan Adafruit IO

## 3.1 Quy uoc requirements

- Chi dung 1 file duy nhat: `requirements.txt` o root.

Khuyen nghi install:

- Neu chay backend: `pip install -r requirements.txt` tu root hoac `pip install -r ../requirements.txt` trong `backend/`
- Neu chay script AI doc lap: cung dung `pip install -r requirements.txt` tu root

## 4. Backend setup

Di chuyen vao backend:

```bash
cd backend
```

Cai dependencies:

```bash
pip install -r ../requirements.txt
```

### 4.1 Tao file .env trong backend

Tao file `backend/.env` voi noi dung mau:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/traffic_system?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=traffic_system
MONGODB_SENSOR_COLLECTION=sensor_history

ADAFRUIT_AIO_USERNAME=<your_adafruit_username>
ADAFRUIT_AIO_KEY=<your_adafruit_key>
```

Luu y:

- Khong commit `.env`
- Neu password Mongo co ky tu dac biet, can URL encode

### 4.2 Kiem tra ket noi MongoDB Atlas

```bash
python -c "from app.database import check_mongodb_connection; ok, err = check_mongodb_connection(); print('MongoDB OK' if ok else f'MongoDB FAIL: {err}')"
```

### 4.3 Chay backend

```bash
python -m app.main
```

Mac dinh backend chay tai:

```text
http://127.0.0.1:5000
```

## 5. Frontend setup

Di chuyen vao frontend:

```bash
cd frontend
```

Cai packages:

```bash
npm install
```

Tao `frontend/.env` (neu can doi URL backend):

```env
VITE_BACKEND_URL=http://127.0.0.1:5000
```

Chay frontend:

```bash
npm run dev
```

## 6. Luong chinh

1. Upload 4 anh (north/south/east/west) tu frontend
2. Backend goi AI detector
3. AI tra vehicle metrics + anh annotated (co bounding box)
4. Backend lay sensor data IoT (co fallback neu IoT chua co data)
5. Backend chay decision maker, publish den qua MQTT
6. Backend luu sensor history vao MongoDB Atlas
7. Frontend hien thi ket qua decision + bbox + 20 sensor records moi nhat

## 7. API chinh

- `GET /api/traffic`
- `GET /api/system_params`
- `PUT /api/system_params`
- `POST /api/control`
- `POST /api/manual_control`
- `POST /api/analyze_images`
- `POST /api/run_decision_with_images`
- `GET /api/sensor_history?limit=20`

## 8. Test nhanh API decision (PowerShell)

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

## 9. Test nhanh sensor history

```powershell
$uri = "http://127.0.0.1:5000/api/sensor_history?limit=20"
$res = Invoke-RestMethod -Method Get -Uri $uri
$res | ConvertTo-Json -Depth 10
```

## 10. Ghi chu bao mat

- Da tung co truong hop lo Mongo password trong terminal/chat. Hay rotate password Atlas neu can.
- Whitelist IP trong Mongo Atlas dung muc dich dev/test, tranh mo rong 0.0.0.0/0 khi khong can thiet.
- Khong commit thong tin nhay cam vao repo (`.env`, API keys).
