// journey — 민원 여정 내비게이터(A) 데이터.
// 서류 1장 → 그 민원의 "전체 여정"(다음 단계·필요서류·방문처)으로 확장한다.
// DEMO: 여기서는 docTypeId별 mock 절차. 실버전은 C의 새 도구
//   plan_civic_journey(docTypeId) + AI Hub 행정절차 grounding 으로 교체(소유권: C).
import type { LangCode } from '@contract/api';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface JourneyStep {
  key: string;
  title: string;
  status: StepStatus;
  requiredDocs: string[];
  office: string;
  sourceLabel: string; // grounding 출처(절차)
}

export interface CivicJourney {
  docTypeId: string;
  title: string;
  steps: JourneyStep[];
}

type StepData = Omit<JourneyStep, 'title' | 'requiredDocs' | 'office'> & {
  title: string;
  requiredDocs: string[];
  office: string;
};

interface LocalizedJourney {
  title: string;
  steps: StepData[];
}

const SOURCE = 'AI Hub 행정절차(mock)';

// docTypeId → 언어별 여정. en 은 폴백 기준(zh/vi/th 미정의 시 en).
const DATA: Record<string, Partial<Record<LangCode, LocalizedJourney>>> = {
  move_in_report: {
    ko: {
      title: '전입신고 여정',
      steps: [
        {
          key: 'move_in',
          status: 'current',
          title: '전입신고서 작성·제출',
          requiredDocs: ['신분증', '임대차계약서'],
          office: '주민센터 또는 정부24',
          sourceLabel: SOURCE,
        },
        {
          key: 'fixed_date',
          status: 'upcoming',
          title: '확정일자 받기 (보증금 보호)',
          requiredDocs: ['임대차계약서 원본'],
          office: '주민센터',
          sourceLabel: SOURCE,
        },
        {
          key: 'address_change',
          status: 'upcoming',
          title: '우편물 주소이전 신청',
          requiredDocs: ['신분증'],
          office: '우체국 또는 인터넷우체국',
          sourceLabel: SOURCE,
        },
      ],
    },
    en: {
      title: 'Move-in report journey',
      steps: [
        {
          key: 'move_in',
          status: 'current',
          title: 'Fill & submit the move-in report',
          requiredDocs: ['ID card', 'Lease contract'],
          office: 'Community center or Gov24',
          sourceLabel: SOURCE,
        },
        {
          key: 'fixed_date',
          status: 'upcoming',
          title: 'Get a confirmed date (deposit protection)',
          requiredDocs: ['Original lease contract'],
          office: 'Community center',
          sourceLabel: SOURCE,
        },
        {
          key: 'address_change',
          status: 'upcoming',
          title: 'Request mail address transfer',
          requiredDocs: ['ID card'],
          office: 'Post office or online post',
          sourceLabel: SOURCE,
        },
      ],
    },
  },
};

function genericJourney(docTypeId: string, lang: LangCode): CivicJourney {
  const isKo = lang === 'ko';
  return {
    docTypeId,
    title: isKo ? '민원 여정' : 'Civic journey',
    steps: [
      {
        key: 'current',
        status: 'current',
        title: isKo ? '이 서류 작성·제출' : 'Fill & submit this form',
        requiredDocs: isKo ? ['신분증'] : ['ID card'],
        office: isKo ? '주민센터' : 'Community center',
        sourceLabel: SOURCE,
      },
    ],
  };
}

/** docTypeId 의 민원 여정을 반환(없으면 generic). */
export function getJourney(docTypeId: string, lang: LangCode): CivicJourney {
  const entry = DATA[docTypeId];
  const loc = entry?.[lang] ?? entry?.en;
  if (!loc) return genericJourney(docTypeId, lang);
  return { docTypeId, title: loc.title, steps: loc.steps };
}
