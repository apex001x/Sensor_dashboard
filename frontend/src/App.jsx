import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const POLL_MS = 5000;

// device_id + sensor_type 조합별로 묶기
function groupReadings(rows) {
  const groups = {};
  for (const row of rows) {
    const key = `${row.device_id} / ${row.sensor_type}`;
    (groups[key] ??= []).push(row);
  }
  // API는 최신순이므로, 그래프용으로 시간 오름차순 정렬
  for (const key in groups) {
    groups[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  return groups;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SensorCard({ name, readings }) {
  const latest = readings[readings.length - 1];
  const data = readings.map((r) => ({
    time: formatTime(r.created_at),
    value: r.value,
  }));

  return (
    <div className="card">
      <div className="card-name">{name}</div>
      <div className="card-value">
        {latest.value}
        <span className="card-unit">{latest.unit ?? ""}</span>
      </div>
      <div className="card-time">{formatTime(latest.created_at)} 업데이트</div>
      <div className="card-chart">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis domain={["auto", "auto"]} width={40} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/dashboard-data?limit=300`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const groups = groupReadings(rows);
  const names = Object.keys(groups).sort();

  return (
    <div className="app">
      <h1>센서 대시보드</h1>
      {error && <div className="error">서버 연결 실패: {error}</div>}
      {names.length === 0 && !error && <p>아직 데이터가 없습니다.</p>}
      <div className="grid">
        {names.map((name) => (
          <SensorCard key={name} name={name} readings={groups[name]} />
        ))}
      </div>
    </div>
  );
}