# 🛰️ AI-Powered Spatial Asset Management System

A full-stack web application that accepts aerial/satellite/drone images, runs computer vision to detect and segment urban assets, overlays results on a map, and exports results as GeoJSON/CSV.

## Core Asset Categories
| Category | Priority |
|---|---|
| Properties & Buildings | Must Have |
| Trees & Green Cover | Must Have |
| Parks & Open Spaces | Must Have |
| Water Bodies | Must Have |
| Roads & Footpaths | Must Have |
| Drains & Sewage | Must Have |
| Vehicles & Parking | Good to Have |
| Waste Dumps | Good to Have |
| Solar Panels | Optional |

## Tech Stack
- **ML**: YOLOv11-seg + SAHI (Slicing Aided Hyper Inference)
- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 18 (Vite) + Tailwind CSS + Leaflet.js
- **Geospatial**: GDAL, Rasterio, GeoPandas, Shapely

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker (Full Stack)
```bash
docker-compose up --build
```

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /api/detect | Upload image, run inference |
| GET | /api/detect/{job_id} | Get stored result |
| GET | /api/export/{job_id}/geojson | Download as GeoJSON |
| GET | /api/export/{job_id}/csv | Download as CSV |

## Project Structure
```
spatial-asset-mgmt/
├── backend/          # FastAPI backend + ML inference
├── frontend/         # React + Vite frontend
├── ml/               # Model training scripts
├── docker-compose.yml
└── README.md
```
