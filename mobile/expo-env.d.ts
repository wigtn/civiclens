/// <reference types="expo/types" />

// Expo Router typed routes + EXPO_PUBLIC_* 환경변수 타입.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_USE_MOCK?: string;
  }
}
