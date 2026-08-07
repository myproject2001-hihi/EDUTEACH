import React, { useState } from 'react';
import { StudentProgress } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Download, Award, TrendingUp, Phone, User, CheckCircle, Mail, MessageCircle } from 'lucide-react';

interface StudentsReportProps {
  progressData: StudentProgress[];
}

export function StudentsReportView({ progressData }: StudentsReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(progressData[0] || null);

  const [className, setClassName] = useState(() => localStorage.getItem('class_name') || 'Lớp 10A1');
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('academic_year') || 'Khóa 2024 - 2025');

  const filteredData = progressData.filter(s => 
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phoneStudent && s.phoneStudent.includes(searchTerm))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quản lý Học sinh & Tiến độ
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý thông tin học sinh, khóa học, SĐT và tiến trình làm bài</p>
        </div>
        
        {/* Class Details Inline Editor */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl w-full md:w-auto">
          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tên lớp học</span>
            <input 
              type="text"
              value={className}
              onChange={(e) => {
                const val = e.target.value;
                setClassName(val);
                localStorage.setItem('class_name', val);
                window.dispatchEvent(new Event('storage'));
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none w-28 text-center"
              placeholder="Lớp 10A1"
            />
          </div>

          <div className="space-y-1">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khóa học</span>
            <input 
              type="text"
              value={academicYear}
              onChange={(e) => {
                const val = e.target.value;
                setAcademicYear(val);
                localStorage.setItem('academic_year', val);
                window.dispatchEvent(new Event('storage'));
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none w-36 text-center"
              placeholder="Khóa 2024 - 2025"
            />
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Điểm Trung Bình Quá Trình</h3>
              <p className="text-xs text-slate-500">So sánh điểm số trung bình giữa các học sinh</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="studentName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 10]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="averageGrade" name="Điểm TB" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mr-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tỷ Lệ Nộp Bài Đúng Hạn (%)</h3>
              <p className="text-xs text-slate-500">Thống kê việc hoàn thành bài tập trước giờ học</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="studentName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="completionRate" name="Tỷ lệ hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Roster & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roster Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-base">Danh sách Học sinh</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên hoặc SĐT học sinh..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Học sinh</th>
                  <th className="px-5 py-3.5 font-bold text-center">Nộp bài</th>
                  <th className="px-5 py-3.5 font-bold text-center">Điểm TB</th>
                  <th className="px-5 py-3.5 font-bold text-center">Chuyên cần</th>
                  <th className="px-5 py-3.5 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((student) => (
                  <tr 
                    key={student.studentId} 
                    onClick={() => setSelectedStudent(student)}
                    className={`hover:bg-indigo-50/50 cursor-pointer transition-colors ${
                      selectedStudent?.studentId === student.studentId ? 'bg-indigo-50/80 font-semibold' : ''
                    }`}
                  >
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <div>
                        <p className="text-sm">{student.studentName}</p>
                        <p className="text-[11px] text-slate-400 font-normal">PH: {student.phoneParent || '0912345678'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {student.completionRate}%
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-extrabold text-indigo-600 text-sm">
                      {student.averageGrade.toFixed(1)}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold">{student.attendanceRate}%</td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline">Xem tiến độ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Student Detail Card */}
        <div className="lg:col-span-1">
          {selectedStudent ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-indigo-700 text-lg">
                  {selectedStudent.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{selectedStudent.studentName}</h4>
                  <p className="text-xs text-indigo-600 font-semibold">{selectedStudent.className || 'Lớp 10A1'}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> SĐT Học sinh: <span className="text-indigo-700">{selectedStudent.phoneStudent || '0987654321'}</span>
                  </p>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" /> SĐT Phụ huynh: <span className="text-indigo-700">{selectedStudent.phoneParent || '0912345678'}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                    <p className="text-[10px] text-indigo-700 font-bold uppercase">Điểm TB học tập</p>
                    <p className="text-xl font-black text-indigo-900 mt-1">{selectedStudent.averageGrade.toFixed(1)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Tỉ lệ hoàn thành</p>
                    <p className="text-xl font-black text-emerald-900 mt-1">{selectedStudent.completionRate}%</p>
                  </div>
                </div>

                {selectedStudent.monthlyProgress && (
                  <div className="pt-2 space-y-2">
                    <p className="font-bold text-slate-800">Tiến độ điểm số theo từng tháng:</p>
                    <div className="space-y-2">
                      {selectedStudent.monthlyProgress.map((m, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-800">{m.month}</span>
                          <span className="text-indigo-700 font-bold">Trắc nghiệm: {m.quizScore} | Mô phỏng: {m.simScore}</span>
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold">{m.average} đ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a 
                  href={`https://zalo.me/${selectedStudent.phoneParent || '0912345678'}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nhắn Zalo trực tiếp Phụ huynh
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Chọn học sinh từ danh sách để xem chi tiết.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
