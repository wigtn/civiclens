// camera — expo-camera 프레임 캡처 헬퍼.
// 화면(app/session)의 <CameraView ref> 에서 jpeg base64 프레임을 뽑아
// Realtime 세션 image 입력 / recognize_document 폴백에 사용한다.
import type { CameraView } from 'expo-camera';

export type CameraRef = CameraView | null;

/** 현재 프리뷰 한 장을 jpeg base64 로 캡처(데이터 URL 접두 제거). */
export async function captureFrame(ref: CameraRef): Promise<string | null> {
  if (!ref) return null;
  try {
    const photo = await ref.takePictureAsync({
      base64: true,
      quality: 0.5,
      skipProcessing: true,
      shutterSound: false,
    });
    if (!photo?.base64) return null;
    return photo.base64.replace(/^data:image\/\w+;base64,/, '');
  } catch {
    return null;
  }
}
