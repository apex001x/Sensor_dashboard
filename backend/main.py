import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# main.py와 같은 폴더(backend/)의 .env를 항상 찾도록 경로 고정
# → 어느 위치(루트, backend/ 등)에서 실행하든 동일하게 동작
load_dotenv(Path(__file__).resolve().parent / ".env")

# --- Supabase 클라이언트 설정 ---
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]  # service_role 키 (RLS 우회)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- 아주 간단한 인증용 API 키 (필요하면 .env로 관리) ---
API_KEY = os.environ.get("SENSOR_API_KEY", "change-me")

app = FastAPI()

# 프론트엔드에서 대시보드 조회할 수 있게 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 실제 도메인으로 좁히기
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorReading(BaseModel):
    device_id: str
    sensor_type: str
    value: float
    unit: str | None = None


@app.post("/sensor-data")
def create_sensor_reading(
    reading: SensorReading,
    x_api_key: str | None = Header(default=None),
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    result = (
        supabase.table("sensor_readings")
        .insert(
            {
                "device_id": reading.device_id,
                "sensor_type": reading.sensor_type,
                "value": reading.value,
                "unit": reading.unit,
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Insert failed")

    return {"status": "ok", "inserted": result.data[0]}


@app.get("/dashboard-data")
def get_dashboard_data(limit: int = 50):
    result = (
        supabase.table("sensor_readings")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data