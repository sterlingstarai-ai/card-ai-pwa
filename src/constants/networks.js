/**
 * 카드 네트워크별 혜택 데이터 (VISA, Mastercard, AMEX, JCB, UnionPay)
 */

export const NETWORKS_DATA = {
  "VISA": {
    grades: {
      "Infinite": { benefits: [
        { icon: "🛋️", title: "VISA 인피니트 라운지", tags: ["airport", "lounge"], value: 50000, desc: "전 세계 공항 VISA 제휴 라운지 무료 이용. 카드사별 횟수 제한 상이." },
        { icon: "📞", title: "VISA 컨시어지 24시간", tags: ["hotel", "travel"], value: 30000, desc: "24시간 프리미엄 컨시어지 서비스, 여행/호텔/레스토랑 예약 지원." },
        { icon: "🏨", title: "Luxury Hotel Collection", tags: ["hotel"], value: 40000, desc: "전 세계 900+ 럭셔리 호텔 특별 혜택 (조식, 업그레이드 등)." }
      ]},
      "Signature": { benefits: [
        { icon: "🛋️", title: "VISA 시그니처 라운지", tags: ["airport", "lounge"], value: 20000, desc: "VISA 제휴 공항 라운지 할인 이용." },
        { icon: "🛡️", title: "VISA 여행자 보험", tags: ["airport", "travel"], value: 15000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛡️", title: "VISA 해외여행보험", tags: ["airport"], value: 10000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "Mastercard": {
    grades: {
      "World Elite": { benefits: [
        { icon: "🛋️", title: "MC 월드엘리트 라운지", tags: ["airport", "lounge"], value: 50000, desc: "LoungeKey 전 세계 1,000개+ 공항 라운지 무료 이용." },
        { icon: "📞", title: "MC 컨시어지 24시간", tags: ["hotel", "travel"], value: 30000, desc: "24시간 프리미엄 컨시어지 서비스." },
        { icon: "🏨", title: "호텔 프로그램", tags: ["hotel"], value: 35000, desc: "Mastercard 호텔 프로그램 특별 혜택." }
      ]},
      "World": { benefits: [
        { icon: "🛋️", title: "MC 월드 라운지", tags: ["airport", "lounge"], value: 25000, desc: "LoungeKey 공항 라운지 할인 이용 가능." },
        { icon: "🚗", title: "호텔 발렛", tags: ["hotel", "valet"], value: 20000, desc: "제휴 호텔 발렛파킹 할인." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛡️", title: "MC 해외여행보험", tags: ["airport"], value: 10000, desc: "해외 결제 시 여행자보험 자동 가입." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "AMEX": {
    grades: {
      "Centurion": { benefits: [
        { icon: "🛋️", title: "AMEX 센추리온 라운지", tags: ["airport", "lounge"], value: 80000, desc: "전 세계 AMEX 센추리온 라운지 무료 이용." },
        { icon: "📞", title: "AMEX 컨시어지", tags: ["hotel", "travel"], value: 50000, desc: "24시간 프리미엄 컨시어지 서비스." },
        { icon: "🏨", title: "Fine Hotels & Resorts", tags: ["hotel"], value: 60000, desc: "AMEX FHR 프로그램 특별 혜택 (조식, 업그레이드, 레이트체크아웃)." }
      ]},
      "Platinum": { benefits: [
        { icon: "🛋️", title: "AMEX 라운지", tags: ["airport", "lounge"], value: 40000, desc: "인천공항 AMEX 라운지 및 PP 라운지 이용 가능." },
        { icon: "🏨", title: "AMEX 호텔 특전", tags: ["hotel"], value: 30000, desc: "Fine Hotels & Resorts 프로그램 혜택." }
      ]},
      "Gold": { benefits: [
        { icon: "🛍️", title: "AMEX 오퍼", tags: ["shopping", "online"], value: 15000, desc: "AMEX 제휴 가맹점 및 온라인몰 할인 혜택." }
      ]},
      "Standard": { benefits: [] }
    }
  },
  "JCB": {
    grades: {
      "Platinum": { benefits: [
        { icon: "🛋️", title: "JCB 라운지", tags: ["airport", "lounge"], value: 20000, desc: "JCB 제휴 아시아 공항 라운지 이용." }
      ]},
      "Gold": { benefits: [] },
      "Standard": { benefits: [] }
    }
  },
  "UnionPay": {
    grades: {
      "Platinum": { benefits: [
        { icon: "🛋️", title: "유니온페이 라운지", tags: ["airport", "lounge"], value: 15000, desc: "중국 주요 공항 라운지 이용 가능." },
        { icon: "🛍️", title: "중국 결제 할인", tags: ["shopping"], value: 10000, desc: "중국 현지 가맹점 결제 시 추가 할인 혜택." }
      ]},
      "Standard": { benefits: [] }
    }
  }
};
