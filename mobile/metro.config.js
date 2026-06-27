// Metro config — `shared/contract` 는 mobile/ 밖에 있으므로 watchFolders 에 등록한다.
// (PARALLEL_WORK_PLAN §1: "Metro watchFolders 에 shared 추가")
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1) 워크스페이스 루트의 shared/ 변경을 Metro 가 감지하도록 watch.
config.watchFolders = [path.resolve(workspaceRoot, 'shared')];

// 2) mobile/node_modules 우선, 없으면 워크스페이스 루트로 폴백.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3) @contract/* alias 를 Metro 해상도에도 등록(tsconfig paths 와 일치).
config.resolver.extraNodeModules = {
  '@contract': path.resolve(workspaceRoot, 'shared/contract'),
};

module.exports = config;
