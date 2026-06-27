// agent.ts — 독창성 에이전트(B 환각 감시관 + A 민원 여정) 전용 로컬 i18n.
// shared/contract/i18n-keys.ts 는 동결이라(키 추가는 합의) 이 데모 기능 문자열은
// mobile 소유 로컬 사전으로 둔다(인라인 하드코딩 금지 규칙은 준수).
import type { LangCode } from '@contract/api';
import { useI18n } from './context';

export interface AgentStrings {
  // B — Grounding Sentinel
  grounded: string; // 근거 ✓
  estimated: string; // 추정 ⚠
  notInOfficialData: string; // 공인 데이터에 없음 가드
  // A — Civic Journey
  viewJourney: string;
  journeyTitle: string;
  now: string;
  done: string;
  next: string;
  requiredDocs: string;
  office: string;
  // 제안 질문(데모용)
  suggestTitle: string;
  askTerm: string;
  askField: string;
  askOpinion: string;
  close: string;
}

const STRINGS: Record<LangCode, AgentStrings> = {
  ko: {
    grounded: '근거',
    estimated: '추정',
    notInOfficialData: '공인 데이터엔 없는 내용이라 참고만 해주세요.',
    viewJourney: '민원 여정',
    journeyTitle: '민원 여정',
    now: '지금',
    done: '완료',
    next: '다음',
    requiredDocs: '필요 서류',
    office: '방문 장소',
    suggestTitle: '이렇게 물어보세요',
    askTerm: '세대주가 뭐예요?',
    askField: '전입일은 언제로 써요?',
    askOpinion: '이 줄 안 써도 돼요?',
    close: '닫기',
  },
  en: {
    grounded: 'Verified',
    estimated: 'Unverified',
    notInOfficialData: "Not in official data — please treat this as a hint only.",
    viewJourney: 'Civic journey',
    journeyTitle: 'Civic journey',
    now: 'Now',
    done: 'Done',
    next: 'Next',
    requiredDocs: 'Required documents',
    office: 'Where to go',
    suggestTitle: 'Try asking',
    askTerm: 'What is a "head of household"?',
    askField: 'What date goes in "move-in date"?',
    askOpinion: 'Can I leave this line blank?',
    close: 'Close',
  },
  zh: {
    grounded: '有据',
    estimated: '推测',
    notInOfficialData: '公认数据中没有此内容，仅供参考。',
    viewJourney: '民政流程',
    journeyTitle: '民政流程',
    now: '当前',
    done: '完成',
    next: '下一步',
    requiredDocs: '所需材料',
    office: '办理地点',
    suggestTitle: '可以这样问',
    askTerm: '“户主”是什么？',
    askField: '“迁入日”填哪天？',
    askOpinion: '这一栏可以不填吗？',
    close: '关闭',
  },
  vi: {
    grounded: 'Có căn cứ',
    estimated: 'Suy đoán',
    notInOfficialData: 'Không có trong dữ liệu chính thức — chỉ nên tham khảo.',
    viewJourney: 'Hành trình hành chính',
    journeyTitle: 'Hành trình hành chính',
    now: 'Hiện tại',
    done: 'Xong',
    next: 'Tiếp',
    requiredDocs: 'Giấy tờ cần thiết',
    office: 'Nơi đến',
    suggestTitle: 'Hãy thử hỏi',
    askTerm: '"Chủ hộ" là gì?',
    askField: 'Điền ngày nào vào "ngày chuyển đến"?',
    askOpinion: 'Tôi có thể để trống dòng này không?',
    close: 'Đóng',
  },
  th: {
    grounded: 'มีหลักฐาน',
    estimated: 'คาดเดา',
    notInOfficialData: 'ไม่มีในข้อมูลทางการ — โปรดใช้เป็นแนวทางเท่านั้น',
    viewJourney: 'ขั้นตอนราชการ',
    journeyTitle: 'ขั้นตอนราชการ',
    now: 'ตอนนี้',
    done: 'เสร็จ',
    next: 'ถัดไป',
    requiredDocs: 'เอกสารที่ต้องใช้',
    office: 'สถานที่',
    suggestTitle: 'ลองถามแบบนี้',
    askTerm: '"เจ้าบ้าน" คืออะไร?',
    askField: 'กรอกวันที่ใดใน "วันที่ย้ายเข้า"?',
    askOpinion: 'เว้นว่างบรรทัดนี้ได้ไหม?',
    close: 'ปิด',
  },
};

export function useAgentStrings(): AgentStrings {
  const { lang } = useI18n();
  return STRINGS[lang] ?? STRINGS.en;
}

export function agentStrings(lang: LangCode): AgentStrings {
  return STRINGS[lang] ?? STRINGS.en;
}
