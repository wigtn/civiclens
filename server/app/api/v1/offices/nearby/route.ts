// ============================================================
// GET /api/v1/offices/nearby — 인근 주민센터/무인민원발급기(discover_office, FR-011)
// 로컬 전용: 외부 Places API 없이 결정적 목 데이터 + 거리 계산.
// 통합 시 실제 Places/POI 소스로 교체(라우트 시그니처 유지).
// 출처: PRD §5.1 /offices/nearby / shared/contract OfficesNearby*
// ============================================================

import type { NextRequest } from 'next/server';
import type { OfficeItem, OfficesNearbyResponse } from '@contract/api';
import { ok, fail } from '@/lib/http/respond';
import { preflight } from '@/lib/security/cors';

export const runtime = 'nodejs';

export function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'));
}

// 데모용 고정 POI(서울 시청 인근 좌표 기준 샘플)
const SAMPLE_OFFICES: Array<Omit<OfficeItem, 'distanceM'> & { lat: number; lng: number }> = [
  { name: '중구 주민센터', type: '주민센터', address: '서울 중구 세종대로 110', hours: '09:00-18:00', lat: 37.5665, lng: 126.978 },
  { name: '무인민원발급기 (시청역)', type: '무인민원발급기', address: '서울 중구 시청역 1번 출구', hours: '06:00-23:00', lat: 37.5658, lng: 126.977 },
  { name: '서울출입국·외국인청', type: '출입국관리', address: '서울 양천구 목동동로 151', hours: '09:00-18:00', lat: 37.5172, lng: 126.866 },
];

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radiusKm = searchParams.get('radiusKm') ? Number(searchParams.get('radiusKm')) : 2;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return fail('INVALID_COORDS', { origin });
  }

  const radiusM = (Number.isFinite(radiusKm) ? radiusKm : 2) * 1000;
  const offices: OfficeItem[] = SAMPLE_OFFICES.map((o) => ({
    name: o.name,
    type: o.type,
    address: o.address,
    hours: o.hours,
    distanceM: haversineM(lat, lng, o.lat, o.lng),
  }))
    .filter((o) => o.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);

  const data: OfficesNearbyResponse = { offices };
  return ok(data, { origin });
}
