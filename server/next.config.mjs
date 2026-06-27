/** @type {import('next').NextConfig} */
const nextConfig = {
  // shared/contract 등 server/ 디렉터리 밖의 TS 파일 import 허용 (모노레포)
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
