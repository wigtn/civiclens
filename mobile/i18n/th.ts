import type { I18nKey } from '@contract/i18n-keys';

// ภาษาไทย (FR-007)
export const th: Record<I18nKey, string> = {
  'landing.title': 'มาจัดการเอกสารราชการไปด้วยกัน',
  'landing.subtitle': 'ส่องกล้องไปที่แบบฟอร์มแล้วถามด้วยภาษาของคุณ AI จะแนะนำทีละช่อง',
  'landing.selectLanguage': 'เลือกภาษาของคุณ',
  'landing.start': 'เริ่มต้น',

  'session.connecting': 'กำลังเชื่อมต่อ…',
  'session.permissionDenied': 'ต้องการสิทธิ์กล้องและไมโครโฟน โปรดอนุญาตในการตั้งค่า',
  'session.aimAtDocument': 'โปรดส่องกล้องไปที่เอกสารหรือหน้าจอ',
  'session.reshoot': 'มองไม่ชัด โปรดถือนิ่ง ๆ แล้วลองอีกครั้ง',
  'session.end': 'จบ',

  'records.empty': 'ยังไม่มีบันทึก มาเริ่มงานแรกไปด้วยกัน',
  'records.title': 'บันทึกของฉัน',
  'record.guidedFields': 'ช่องที่ได้รับคำแนะนำ',

  'benchmark.accuracy': 'ความแม่นยำในการรู้จำแบบฟอร์ม',
  'benchmark.noPermission': 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น',

  'state.loading': 'กำลังโหลด…',
  'state.error': 'เกิดข้อผิดพลาด โปรดลองอีกครั้งในภายหลัง',
  'state.noPermission': 'คุณไม่มีสิทธิ์เข้าถึง',
  'error.rateLimited': 'มีคำขอมากเกินไป โปรดลองอีกครั้งในอีกสักครู่',
  'error.budgetExceeded': 'ใช้งานครบโควตาของวันนี้แล้ว โปรดกลับมาใหม่พรุ่งนี้',
};
