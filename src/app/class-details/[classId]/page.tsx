"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getCurrentUser,
  getStudentsForClass,
  type SessionUser,
  type Student,
} from "@/lib/auth";
import {
  CLASS_LABELS,
  toBengaliNumber,
} from "@/lib/data";
import { BottomNav, ShikhoHeader } from "@/components";

interface StudentAttendanceRecord {
  student: Student;
  presentCount: number;
  absentCount: number;
  totalClasses: number;
  attendancePercentage: number;
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);
  const [totalClassesTaken, setTotalClassesTaken] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }

    setUser(currentUser);

    // Load students for this class
    const classStudents = getStudentsForClass(currentUser.id, classId);

    // Load attendance records from localStorage
    const attendanceData = localStorage.getItem("attendance_records");
    const allAttendance = attendanceData ? JSON.parse(attendanceData) : [];

    // Filter attendance records for this teacher and class
    const classAttendanceRecords = allAttendance.filter(
      (record: any) =>
        record.teacherId === currentUser.id && record.classId === classId
    );

    // Count total unique dates (classes taken)
    const uniqueDates = new Set(classAttendanceRecords.map((r: any) => r.date));
    const totalClasses = uniqueDates.size;
    setTotalClassesTaken(totalClasses);

    // Calculate attendance for each student
    const studentsWithAttendance: StudentAttendanceRecord[] = classStudents.map((student) => {
      const studentAttendance = classAttendanceRecords.filter((record: any) =>
        record.presentStudents.includes(student.id)
      );

      const presentCount = studentAttendance.length;
      const absentCount = totalClasses - presentCount;
      const attendancePercentage =
        totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

      return {
        student,
        presentCount,
        absentCount,
        totalClasses,
        attendancePercentage,
      };
    });

    setStudents(studentsWithAttendance);
    setIsLoading(false);
  }, [router, classId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#cf278d] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 pb-24">
      {/* Header */}
      <ShikhoHeader
        variant="light"
        showBackButton={true}
        onBack={() => router.back()}
        rightContent={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-base font-bold text-slate-800">{CLASS_LABELS[classId]}</h1>
              <p className="text-xs text-slate-500">ক্লাস বিবরণ</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#cf278d] to-[#cf278d] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-[#cf278d] to-[#cf278d] rounded-2xl p-6 shadow-xl mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{toBengaliNumber(students.length)}</p>
              <p className="text-white/80 text-sm mt-1">জন শিক্ষার্থী</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{toBengaliNumber(totalClassesTaken)}</p>
              <p className="text-white/80 text-sm mt-1">টি ক্লাস নেওয়া হয়েছে</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">
                {students.length > 0
                  ? toBengaliNumber(
                      Math.round(
                        students.reduce((sum, s) => sum + s.attendancePercentage, 0) /
                          students.length
                      )
                    )
                  : "০"}
                %
              </p>
              <p className="text-white/80 text-sm mt-1">গড় উপস্থিতি</p>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">শিক্ষার্থীদের হাজিরা রেকর্ড</h2>
          </div>

          {students.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium mb-2">এই ক্লাসে কোনো শিক্ষার্থী নেই</p>
              <p className="text-slate-500 text-sm">শিক্ষার্থী যোগ করতে ক্লাসরুমে যান</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map(({ student, presentCount, absentCount, attendancePercentage }) => (
                <div
                  key={student.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Student Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {student.name.charAt(0)}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 truncate">{student.name}</p>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium flex-shrink-0">
                          রোল {student.rollNumber}
                        </span>
                      </div>
                      {student.guardianContact && (
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {student.guardianContact}
                        </p>
                      )}
                    </div>

                    {/* Attendance Stats */}
                    <div className="flex items-center gap-3">
                      {/* Present */}
                      <div className="text-center">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-700 font-bold">{toBengaliNumber(presentCount)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">উপস্থিত</p>
                      </div>

                      {/* Absent */}
                      <div className="text-center">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-red-700 font-bold">{toBengaliNumber(absentCount)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">অনুপস্থিত</p>
                      </div>

                      {/* Percentage */}
                      <div className="text-center">
                        <div
                          className={`px-4 py-1.5 rounded-lg font-bold ${
                            attendancePercentage >= 80
                              ? "bg-green-100 text-green-700"
                              : attendancePercentage >= 60
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {toBengaliNumber(attendancePercentage)}%
                        </div>
                        <p className="text-xs text-slate-500 mt-1">উপস্থিতি</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/classroom/${classId}`)}
            className="py-4 gradient-blue-pink text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            ক্লাস শুরু করুন
          </button>

          <button
            onClick={() => router.push("/students")}
            className="py-4 bg-white border-2 border-[#cf278d] text-[#cf278d] rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            শিক্ষার্থী ম্যানেজ করুন
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
