import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  name: string;
  studentCode?: string;
  className?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác' | string;
  birthDate?: string;
  phone?: string;
  parentPhone?: string;
  notes?: string;
  isOffline?: boolean;
}

export function generateStudentTemplateExcel(targetClassName = 'Lớp 10A1') {
  const sampleData = [
    {
      'STT': 1,
      'Họ và Tên (*)': 'Nguyễn Văn An',
      'Mã Học Sinh': 'HS-10A1-01',
      'Lớp Học': targetClassName,
      'Giới Tính': 'Nam',
      'Ngày Sinh (DD/MM/YYYY)': '15/04/2009',
      'Số Điện Thoại': '0912345678',
      'Số ĐT Phụ Huynh': '0987654321',
      'Ghi Chú': 'Lớp trưởng, học tốt môn Toán'
    },
    {
      'STT': 2,
      'Họ và Tên (*)': 'Trần Thị Bích',
      'Mã Học Sinh': 'HS-10A1-02',
      'Lớp Học': targetClassName,
      'Giới Tính': 'Nữ',
      'Ngày Sinh (DD/MM/YYYY)': '22/08/2009',
      'Số Điện Thoại': '0923456789',
      'Số ĐT Phụ Huynh': '0976543210',
      'Ghi Chú': 'Thành viên đội tuyển học sinh giỏi'
    },
    {
      'STT': 3,
      'Họ và Tên (*)': 'Lê Hoàng Cường',
      'Mã Học Sinh': 'HS-10A1-03',
      'Lớp Học': targetClassName,
      'Giới Tính': 'Nam',
      'Ngày Sinh (DD/MM/YYYY)': '10/11/2009',
      'Số Điện Thoại': '0934567890',
      'Số ĐT Phụ Huynh': '0965432109',
      'Ghi Chú': 'Học sinh mới chuyển trường'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 24 }, // Ho va Ten
    { wch: 16 }, // Ma HS
    { wch: 14 }, // Lop
    { wch: 12 }, // Gioi tinh
    { wch: 22 }, // Ngay sinh
    { wch: 16 }, // SDT
    { wch: 18 }, // SDT PH
    { wch: 32 }  // Ghi chu
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachHocSinh');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Mau_Danh_Sach_Hoc_Sinh_${targetClassName.replace(/\s+/g, '_')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export function exportRosterToExcel(students: any[], className = 'Toan_Lop') {
  const exportData = students.map((s, idx) => ({
    'STT': idx + 1,
    'Mã Học Sinh': s.studentCode || s.connectionCode || s.id,
    'Họ và Tên': s.name || s.studentName,
    'Lớp': s.className || className,
    'Trạng Thái': s.isOffline ? 'Ngoại tuyến / Chưa tạo TK' : 'Đã kết nối tài khoản',
    'Tỉ Lệ Chuyên Cần (%)': s.attendanceRate !== undefined ? `${s.attendanceRate}%` : '100%',
    'Điểm Tích Cực / Rèn Luyện': s.meritPoints || s.points || 0,
    'Điểm TB Bài Tập': s.averageGrade !== undefined ? s.averageGrade : (s.avgGrade || '-'),
    'Tiến Độ Hoàn Thành (%)': `${s.completionRate || 0}%`,
    'Số Điện Thoại': s.phone || '',
    'Email/Tài Khoản': s.email || s.username || 'Chưa liên kết'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 24 },
    { wch: 12 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoHocSinh');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Danh_Sach_Tong_Hop_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

export async function parseStudentFile(file: File, defaultClass = ''): Promise<ParsedStudentRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (rawRows.length === 0) {
    throw new Error('File rỗng hoặc không có dữ liệu.');
  }

  // Find header row (usually contains "Họ và tên" or "Tên" or "Họ tên")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
    if (rowStr.includes('tên') || rowStr.includes('họ') || rowStr.includes('name')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0; // fallback to first row
  }

  const headerRow: string[] = (rawRows[headerIndex] || []).map((h: any) => String(h || '').trim().toLowerCase());

  // Map column indexes
  let nameCol = headerRow.findIndex(h => h.includes('họ và tên') || h.includes('họ tên') || h.includes('tên') || h.includes('name'));
  let codeCol = headerRow.findIndex(h => h.includes('mã') || h.includes('sbd') || h.includes('code') || h.includes('id'));
  let classCol = headerRow.findIndex(h => h.includes('lớp') || h.includes('class'));
  let genderCol = headerRow.findIndex(h => h.includes('giới') || h.includes('gender') || h.includes('nam/nữ'));
  let dobCol = headerRow.findIndex(h => h.includes('sinh') || h.includes('birth') || h.includes('ngày sinh'));
  let phoneCol = headerRow.findIndex(h => (h.includes('điện thoại') || h.includes('sđt') || h.includes('phone')) && !h.includes('phụ huynh'));
  let parentPhoneCol = headerRow.findIndex(h => h.includes('phụ huynh') || h.includes('ba mẹ') || h.includes('ph'));
  let noteCol = headerRow.findIndex(h => h.includes('ghi chú') || h.includes('note') || h.includes('nhận xét'));

  // If column name wasn't found by explicit keywords, fallback to index 1 or 0
  if (nameCol === -1) nameCol = 1;

  const result: ParsedStudentRow[] = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameCol] !== undefined ? String(row[nameCol]).trim() : '';
    if (!rawName || rawName === 'undefined' || rawName === 'null') continue;

    // Skip footer summary rows like "Tổng cộng", "Tổng số học sinh"
    if (rawName.toLowerCase().startsWith('tổng') || rawName.toLowerCase().startsWith('lưu ý')) continue;

    const studentCode = codeCol !== -1 && row[codeCol] ? String(row[codeCol]).trim() : '';
    const rowClass = classCol !== -1 && row[classCol] ? String(row[classCol]).trim() : defaultClass;
    const gender = genderCol !== -1 && row[genderCol] ? String(row[genderCol]).trim() : '';
    const birthDate = dobCol !== -1 && row[dobCol] ? String(row[dobCol]).trim() : '';
    const phone = phoneCol !== -1 && row[phoneCol] ? String(row[phoneCol]).trim() : '';
    const parentPhone = parentPhoneCol !== -1 && row[parentPhoneCol] ? String(row[parentPhoneCol]).trim() : '';
    const notes = noteCol !== -1 && row[noteCol] ? String(row[noteCol]).trim() : '';

    result.push({
      name: rawName,
      studentCode: studentCode || `HS-${(rowClass || 'LỚP').replace(/\s+/g, '')}-${(result.length + 1).toString().padStart(2, '0')}`,
      className: rowClass || defaultClass,
      gender: gender || 'Khác',
      birthDate,
      phone,
      parentPhone,
      notes
    });
  }

  return result;
}
