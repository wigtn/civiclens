import type { I18nKey } from '@contract/i18n-keys';

// Tiếng Việt (FR-007)
export const vi: Record<I18nKey, string> = {
  'landing.title': 'Cùng xử lý giấy tờ hành chính',
  'landing.subtitle': 'Hướng camera vào biểu mẫu và hỏi bằng tiếng mẹ đẻ. AI hướng dẫn từng ô.',
  'landing.selectLanguage': 'Chọn ngôn ngữ của bạn',
  'landing.start': 'Bắt đầu',

  'session.connecting': 'Đang kết nối…',
  'session.permissionDenied': 'Cần quyền camera và micro. Vui lòng cho phép trong Cài đặt.',
  'session.aimAtDocument': 'Hãy hướng camera vào tài liệu hoặc màn hình',
  'session.reshoot': 'Tôi nhìn chưa rõ. Vui lòng giữ ổn định và thử lại.',
  'session.end': 'Kết thúc',

  'records.empty': 'Chưa có bản ghi nào. Hãy cùng làm việc đầu tiên.',
  'records.title': 'Bản ghi của tôi',
  'record.guidedFields': 'Các mục đã hướng dẫn',

  'benchmark.accuracy': 'Độ chính xác nhận dạng biểu mẫu',
  'benchmark.noPermission': 'Màn hình này chỉ dành cho quản trị viên.',

  'state.loading': 'Đang tải…',
  'state.error': 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
  'state.noPermission': 'Bạn không có quyền truy cập.',
  'error.rateLimited': 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
  'error.budgetExceeded': 'Đã đạt giới hạn sử dụng hôm nay. Vui lòng quay lại ngày mai.',
};
