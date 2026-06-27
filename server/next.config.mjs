/** @type {import('next').NextConfig} */
const nextConfig = {
  // shared/contract 등 server/ 디렉터리 밖의 TS 파일 import 허용 (모노레포)
  experimental: {
    externalDir: true,
  },
  // C 스트림 모듈은 ESM 스타일 '.js' 확장자 import 사용(tsx/node용).
  // webpack 이 '.js' 지정자를 실제 '.ts' 소스로 해석하도록 별칭 추가.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
