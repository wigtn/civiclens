import type { I18nKey } from '@contract/i18n-keys';

// 中文 (FR-007)
export const zh: Record<I18nKey, string> = {
  'landing.title': '一起办理民政事务',
  'landing.subtitle': '用相机对准表格，用母语提问，AI 会逐栏为你指引。',
  'landing.selectLanguage': '请选择语言',
  'landing.start': '开始',

  'session.connecting': '连接中…',
  'session.permissionDenied': '需要相机和麦克风权限，请在设置中允许。',
  'session.aimAtDocument': '请把相机对准文件或屏幕',
  'session.reshoot': '看不太清楚，请拿稳一点再试一次。',
  'session.end': '结束',

  'records.empty': '还没有记录，一起完成你的第一份吧。',
  'records.title': '我的办理记录',
  'record.guidedFields': '已指引的栏目',

  'benchmark.accuracy': '表格识别准确率',
  'benchmark.noPermission': '此页面仅管理员可见。',

  'state.loading': '加载中…',
  'state.error': '出现问题，请稍后再试。',
  'state.noPermission': '你没有访问权限。',
  'error.rateLimited': '请求过于频繁，请稍后再试。',
  'error.budgetExceeded': '今日用量已满，请明天再来。',
};
