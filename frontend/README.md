# Frontend Dashboard (React + TypeScript + Vite)

Dashboard frontend cho Smart Traffic System.

## 1) Cai dat

```bash
cd frontend
npm install
```

## 2) Cau hinh backend URL

Tao file `.env` trong `frontend/`:

```env
VITE_BACKEND_URL=http://127.0.0.1:5000
```

Neu khong tao `.env`, app se mac dinh goi `http://127.0.0.1:5000`.

## 3) Chay dev

```bash
npm run dev
```

## 4) Build production

```bash
npm run build
npm run preview
```

## 5) Tinh nang hien co

- Upload 4 anh giao lo (north/south/east/west)
- Goi API decision backend
- Hien thi ket qua phase NS/EW
- Hien thi anh bounding box sau khi AI detect
- Hien thi sensor history (latest 20) lay tu MongoDB API
- Manual control cho den giao thong

## 6) API frontend dang su dung

- `POST /api/run_decision_with_images`
- `GET /api/traffic`
- `POST /api/manual_control`
- `GET /api/system_params`
- `PUT /api/system_params`
- `GET /api/sensor_history?limit=20`
