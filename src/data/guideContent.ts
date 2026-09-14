import { Role } from '../types';

export interface GuideSection {
  title: string;
  steps: string[];
}

export interface GuideContentDetail {
  title: string;
  icon: string;
  sections: GuideSection[];
}

export type GuideContent = Record<string, Record<Role, GuideContentDetail>>;

export const GUIDE_CONTENT: GuideContent = {
  dashboard: {
    student: {
      title: 'Hướng dẫn Dashboard Học Sinh',
      icon: 'LayoutDashboard',
      sections: [
        {
          title: 'Tổng quan điểm và hạng',
          steps: [
            'Xem tổng điểm thưởng đang có.',
            'Kiểm tra cấp bậc và mục tiêu phấn đấu.',
            'Xem tỷ lệ hoàn thành bài tập.'
          ]
        },
        {
          title: 'Gợi ý hôm nay',
          steps: [
            'Hệ thống gợi ý bài tập cần làm, ôn tập hoặc lịch học.',
            'Nhấn vào gợi ý để thực hiện nhanh chóng.'
          ]
        },
        {
          title: 'Nhiệm vụ học tập',
          steps: [
            'Xem danh sách bài tập mới hoặc quá hạn.',
            'Nhấn "Bắt đầu làm bài" để thực hiện trực tiếp.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Hướng dẫn Dashboard Giáo Viên',
      icon: 'LayoutDashboard',
      sections: [
        {
          title: 'Tổng quan lớp học',
          steps: [
            'Kiểm tra sĩ số học sinh hiện tại.',
            'Theo dõi số lượng bài tập, flashcard, game đã tạo.',
            'Xem danh sách học sinh chưa nộp bài.'
          ]
        },
        {
          title: 'Biểu đồ phổ điểm',
          steps: [
            'Quan sát phổ điểm trung bình của cả lớp.'
          ]
        },
        {
          title: 'Nhắc nhở học sinh',
          steps: [
            'Sao chép tin nhắn mẫu để gửi phụ huynh/học sinh nhắc nộp bài.'
          ]
        }
      ]
    },
    admin: {
      title: 'Hướng dẫn Dashboard Admin',
      icon: 'LayoutDashboard',
      sections: [
        {
          title: 'Giám sát toàn hệ thống',
          steps: [
            'Xem báo cáo tổng hợp.',
            'Theo dõi tình trạng hoạt động các lớp.'
          ]
        }
      ]
    }
  },
  assignments: {
    student: {
      title: 'Hướng dẫn Bài Tập',
      icon: 'BookOpen',
      sections: [
        {
          title: 'Làm bài tập',
          steps: [
            'Xem danh sách bài tập giáo viên giao.',
            'Làm bài trắc nghiệm, điền khuyết hoặc tải tệp lên.',
            'Nộp bài để giáo viên chấm điểm.'
          ]
        },
        {
          title: 'Kết quả',
          steps: [
            'Xem điểm số các bài đã nộp.',
            'Theo dõi nhận xét từ giáo viên.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Quản lý Bài Tập',
      icon: 'BookOpen',
      sections: [
        {
          title: 'Tạo bài tập',
          steps: [
            'Tạo các dạng bài: trắc nghiệm, tự luận, upload tệp.',
            'Cài đặt thời gian, hạn nộp và trạng thái phát sóng.'
          ]
        },
        {
          title: 'Chấm bài',
          steps: [
            'Chấm điểm và nhận xét từng học sinh.',
            'Chỉnh sửa hàng loạt khi cần thiết.'
          ]
        }
      ]
    },
    admin: {
      title: 'Quản lý Bài Tập',
      icon: 'BookOpen',
      sections: [
        {
          title: 'Kiểm soát tài nguyên',
          steps: [
            'Quản lý toàn bộ bài tập của giáo viên.',
            'Chỉnh sửa, xóa hoặc thay đổi trạng thái bài tập.'
          ]
        }
      ]
    }
  },
  schedule: {
    student: {
      title: 'Thời khóa biểu',
      icon: 'Calendar',
      sections: [
        {
          title: 'Lịch học',
          steps: [
            'Xem các buổi học sắp tới.',
            'Tham gia phòng học trực tuyến (Google Meet, Zoom).'
          ]
        },
        {
          title: 'Học phí',
          steps: [
            'Xem tình trạng đóng học phí.',
            'Tải biên lai thanh toán lên hệ thống.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Quản lý Lịch & Học phí',
      icon: 'Calendar',
      sections: [
        {
          title: 'Lên lịch học',
          steps: [
            'Tạo buổi học mới kèm link học trực tuyến.',
            'Điểm danh học sinh tham gia.'
          ]
        },
        {
          title: 'Kiểm duyệt học phí',
          steps: [
            'Kiểm tra biên lai do học sinh tải lên.',
            'Xác nhận trạng thái đã đóng học phí.'
          ]
        }
      ]
    },
    admin: {
      title: 'Quản lý Lịch & Học phí',
      icon: 'Calendar',
      sections: [
        {
          title: 'Tổng quan tài chính & lịch',
          steps: [
            'Theo dõi toàn bộ lịch học của trường.',
            'Xác nhận tài chính tổng hợp.'
          ]
        }
      ]
    }
  },
  games: {
    student: {
      title: 'Trò chơi học tập',
      icon: 'Gamepad2',
      sections: [
        {
          title: 'Tham gia trò chơi',
          steps: [
            'Vào kho trò chơi.',
            'Chơi game để trả lời câu hỏi và tích điểm.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Tạo trò chơi',
      icon: 'Gamepad2',
      sections: [
        {
          title: 'Thiết kế Game',
          steps: [
            'Tạo game dạng câu đố (Quiz).',
            'Khuyến khích học sinh thi đua lấy điểm cao.'
          ]
        }
      ]
    },
    admin: {
      title: 'Quản lý Trò chơi',
      icon: 'Gamepad2',
      sections: [
        {
          title: 'Quản trị hệ thống Game',
          steps: [
            'Quản lý tất cả các trò chơi trong trường.'
          ]
        }
      ]
    }
  },
  flashcards: {
    student: {
      title: 'Sử dụng Flashcard',
      icon: 'Layers',
      sections: [
        {
          title: 'Ôn tập thẻ từ',
          steps: [
            'Lật thẻ để ghi nhớ khái niệm.',
            'Đánh dấu trạng thái đã nhớ hoặc chưa nhớ.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Tạo Bộ Flashcard',
      icon: 'Layers',
      sections: [
        {
          title: 'Xây dựng bộ thẻ',
          steps: [
            'Tạo và chia sẻ flashcard cho lớp.',
            'Công khai bộ thẻ để học sinh ôn tập.'
          ]
        }
      ]
    },
    admin: {
      title: 'Quản lý Flashcard',
      icon: 'Layers',
      sections: [
        {
          title: 'Kiểm soát tài nguyên',
          steps: [
            'Quản lý hệ thống flashcard dùng chung.'
          ]
        }
      ]
    }
  },
  'rewards-store': {
    student: {
      title: 'Cửa hàng Quà Tặng',
      icon: 'Gift',
      sections: [
        {
          title: 'Đổi quà',
          steps: [
            'Sử dụng điểm tích lũy để đổi quà.',
            'Chờ giáo viên phê duyệt và nhận quà.'
          ]
        }
      ]
    },
    teacher: {
      title: 'Quản lý Quà Tặng',
      icon: 'Gift',
      sections: [
        {
          title: 'Tạo & Duyệt quà',
          steps: [
            'Thêm phần thưởng mới vào cửa hàng.',
            'Duyệt hoặc từ chối yêu cầu đổi quà của học sinh.'
          ]
        }
      ]
    },
    admin: {
      title: 'Hệ thống Quà Tặng',
      icon: 'Gift',
      sections: [
        {
          title: 'Tổng quan',
          steps: [
            'Điều hành cửa hàng quà tặng toàn trường.'
          ]
        }
      ]
    }
  }
};
