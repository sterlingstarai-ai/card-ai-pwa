/**
 * 서버측 입력 검증 헬퍼
 * - OCR/identify 프록시가 임의 바이트를 그대로 Google Vision으로 흘려보내
 *   "무료 Vision 프록시"로 악용되는 것을 막는다(형식·용량 사전 검증).
 */

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * 클라이언트가 보낸 base64 이미지를 검증하고 정규화한다.
 * @param {unknown} image - raw base64 또는 data:URL 문자열
 * @param {{ maxDecodedBytes?: number, minLength?: number }} opts
 * @returns {{ ok: true, image: string } | { ok: false, error: string }}
 */
export function validateBase64Image(image, { maxDecodedBytes, minLength = 100 } = {}) {
  if (typeof image !== 'string') {
    return { ok: false, error: 'No image provided' };
  }

  // data:image/...;base64,xxxx 형태면 base64 본문만 추출
  let b64 = image;
  if (b64.startsWith('data:')) {
    const comma = b64.indexOf(',');
    if (comma === -1) return { ok: false, error: '이미지 형식이 올바르지 않습니다' };
    b64 = b64.slice(comma + 1);
  }

  // 일부 인코더가 줄바꿈을 넣을 수 있으므로 공백류 제거 후 검증
  b64 = b64.replace(/\s/g, '');

  if (b64.length < minLength) {
    return { ok: false, error: '이미지 데이터가 너무 짧습니다' };
  }

  if (!BASE64_RE.test(b64)) {
    return { ok: false, error: '이미지 인코딩이 올바르지 않습니다' };
  }

  if (maxDecodedBytes) {
    // base64 4문자 → 3바이트
    const decodedBytes = Math.floor((b64.length * 3) / 4);
    if (decodedBytes > maxDecodedBytes) {
      return { ok: false, error: '이미지 용량이 너무 큽니다' };
    }
  }

  return { ok: true, image: b64 };
}
