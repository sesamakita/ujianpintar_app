import { supabase } from '../lib/supabase';
import type { ExamSettings, Question, StudentProctoring, ViolationLogItem, GradeRecord } from '../types/exam';

export const formatScheduleTime = (timeStr?: string): string => {
  if (!timeStr) return '08:00';
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return clean;
};

export const examService = {
  /**
   * Helper to format time into HH:mm (removing seconds)
   */
  formatScheduleTime(timeStr?: string): string {
    return formatScheduleTime(timeStr);
  },

  /**
   * Fetch Exam & Questions by 6-digit Token PIN directly from Supabase database
   */
  async getExamByToken(token: string) {
    try {
      const cleanToken = token.trim().toUpperCase();

      // 1. Query exams table by token (only active / published exams)
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('token', cleanToken)
        .in('status', ['published', 'active'])
        .single();

      if (examError || !exam) {
        return {
          exam: null,
          questions: [],
          error: `Token PIN '${cleanToken}' tidak ditemukan atau sudah kedaluwarsa/dinonaktifkan oleh guru.`,
        };
      }

      // 2. Query questions table associated with exam_id
      const { data: rawQuestions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('number_order', { ascending: true });

      if (qError) {
        return { exam: null, questions: [], error: `Gagal memuat soal dari database: ${qError.message}` };
      }

      if (!rawQuestions || rawQuestions.length === 0) {
        return {
          exam: null,
          questions: [],
          error: `Paket ujian '${exam.title}' belum memiliki butir soal yang aktif di database.`,
        };
      }

      // 3. Format questions from database schema
      let formattedQuestions: Question[] = rawQuestions.map((q: any) => {
        let parsedOptions = q.options;
        if (typeof parsedOptions === 'string') {
          try {
            parsedOptions = JSON.parse(parsedOptions);
          } catch {
            parsedOptions = [];
          }
        }

        return {
          id: q.id,
          number: q.number_order,
          type: q.type || 'multiple_choice',
          questionText: q.question_text || '',
          latexFormula: q.latex_formula || undefined,
          imageUrl: q.image_url || undefined,
          options: Array.isArray(parsedOptions) ? parsedOptions : [],
          correctOptionId: q.correct_option_id || undefined,
          correctAnswerText: q.correct_answer_text || undefined,
          points: q.points || 10,
        };
      });

      const antiCheatConfig = exam.anti_cheat || {
        detectTabSwitch: true,
        fullScreenLock: true,
        shuffleQuestions: true,
        shuffleOptions: true,
      };

      // 4. Apply Shuffle Questions if enabled in exam settings
      if (antiCheatConfig.shuffleQuestions) {
        formattedQuestions = [...formattedQuestions].sort(() => Math.random() - 0.5);
        formattedQuestions = formattedQuestions.map((q, idx) => ({
          ...q,
          number: idx + 1,
        }));
      }

      // 5. Apply Shuffle Options for multiple choice questions if enabled
      if (antiCheatConfig.shuffleOptions) {
        const standardLabels = ['A', 'B', 'C', 'D', 'E'];
        formattedQuestions = formattedQuestions.map((q) => {
          if (q.type === 'multiple_choice' && q.options.length > 0) {
            const shuffledOpts = [...q.options].sort(() => Math.random() - 0.5);
            const reLabeledOpts = shuffledOpts.map((opt, optIdx) => ({
              ...opt,
              label: standardLabels[optIdx] || opt.label,
            }));
            return { ...q, options: reLabeledOpts };
          }
          return q;
        });
      }

      const formattedExam: ExamSettings = {
        id: exam.id,
        title: exam.title || 'Ujian CBT',
        subject: exam.subject || 'Mata Pelajaran',
        gradeLevel: exam.grade_level || 'Kelas X',
        durationMinutes: exam.duration_minutes || 60,
        token: exam.token,
        scheduleDate: exam.schedule_date || new Date().toISOString().split('T')[0],
        scheduleTime: formatScheduleTime(exam.schedule_time),
        antiCheat: antiCheatConfig,
      };

      return { exam: formattedExam, questions: formattedQuestions, error: null };
    } catch (err: any) {
      return { exam: null, questions: [], error: err.message || 'Gagal terhubung ke database Supabase.' };
    }
  },

  /**
   * Create or update student session in Supabase student_sessions table
   */
  async upsertStudentSession(session: {
    id?: string;
    examId: string;
    nisn: string;
    studentName: string;
    className: string;
    status: 'working' | 'submitted' | 'violation_flagged';
    remainingSeconds: number;
    totalQuestions: number;
    progressCount: number;
    violationCount: number;
  }) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const cleanNisn = session.nisn.trim();

      const payload = {
        exam_id: isValidUUID(session.examId) ? session.examId : null,
        nisn: cleanNisn,
        student_name: session.studentName.trim(),
        class_name: session.className.trim(),
        status: session.status,
        remaining_seconds: session.remainingSeconds,
        total_questions: session.totalQuestions,
        progress_count: session.progressCount,
        violation_count: session.violationCount,
        connection_status: 'online',
      };

      // 1. Try to update existing row by nisn
      const { data: existingRows } = await supabase
        .from('student_sessions')
        .select('id')
        .eq('nisn', cleanNisn)
        .order('created_at', { ascending: false });

      if (existingRows && existingRows.length > 0) {
        const primaryId = existingRows[0].id;
        const { data: upData, error: upError } = await supabase
          .from('student_sessions')
          .update(payload)
          .eq('id', primaryId)
          .select()
          .single();

        // Clean up duplicate rows with the same NISN if any exist
        if (existingRows.length > 1) {
          const duplicateIds = existingRows.slice(1).map((r) => r.id);
          await supabase.from('student_sessions').delete().in('id', duplicateIds);
        }

        if (!upError && upData) return { session: upData, error: null };
      }

      // 2. Otherwise insert new row
      const { data, error } = await supabase
        .from('student_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn('Upsert student session warning:', error.message);
        return { session: null, error: error.message };
      }

      return { session: data, error: null };
    } catch (err: any) {
      return { session: null, error: err.message };
    }
  },

  /**
   * Update student progress in real-time
   */
  async updateStudentProgress(sessionId: string, progressCount: number, nisn?: string) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

      if (sessionId && isValidUUID(sessionId)) {
        await supabase
          .from('student_sessions')
          .update({ progress_count: progressCount, status: 'working' })
          .eq('id', sessionId);
      }
      if (nisn) {
        await supabase
          .from('student_sessions')
          .update({ progress_count: progressCount, status: 'working' })
          .eq('nisn', nisn.trim());
      }
    } catch {
      // Ignored
    }
  },

  /**
   * Auto-save individual question answer to Supabase student_answers table
   */
  async saveStudentAnswer(answer: {
    sessionId: string;
    questionId: string;
    selectedOptionId?: string;
    answerText?: string;
    isDoubt: boolean;
  }) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

      if (answer.sessionId && isValidUUID(answer.sessionId) && isValidUUID(answer.questionId)) {
        await supabase.from('student_answers').insert({
          session_id: answer.sessionId,
          question_id: answer.questionId,
          selected_option_id: answer.selectedOptionId || null,
          answer_text: answer.answerText || null,
          is_doubt: answer.isDoubt,
          answered_at: new Date().toISOString(),
        });
      }
    } catch {
      // Ignored for resilience
    }
  },

  /**
   * Log anti-cheat violation to Supabase violation_logs table
   */
  async recordViolation(violation: {
    examId: string;
    sessionId?: string;
    studentName: string;
    studentNisn: string;
    message: string;
    severity?: 'warning' | 'danger' | 'info';
  }) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      await supabase.from('violation_logs').insert({
        exam_id: isValidUUID(violation.examId) ? violation.examId : null,
        session_id: (violation.sessionId && isValidUUID(violation.sessionId)) ? violation.sessionId : null,
        student_name: violation.studentName.trim(),
        student_nisn: violation.studentNisn.trim(),
        timestamp: nowStr,
        message: violation.message,
        severity: violation.severity || 'warning',
      });

      // Update student session violation_count & status in database
      const { data: session } = await supabase
        .from('student_sessions')
        .select('violation_count')
        .eq('nisn', violation.studentNisn.trim())
        .single();

      if (session) {
        const newCount = (session.violation_count || 0) + 1;
        await supabase
          .from('student_sessions')
          .update({
            violation_count: newCount,
            status: newCount >= 2 ? 'violation_flagged' : 'working',
          })
          .eq('nisn', violation.studentNisn.trim());
      }
    } catch (err) {
      console.warn('Violation log insert warning:', err);
    }
  },

  /**
   * Submit final grade record to Supabase grade_records table
   */
  async submitGradeRecord(grade: GradeRecord, examId: string, sessionId?: string) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const cleanNisn = grade.nisn.trim();

      // 1. ALWAYS FIRST update student_sessions status to 'submitted'
      await supabase
        .from('student_sessions')
        .update({
          status: 'submitted',
          remaining_seconds: 0,
          submitted_at: new Date().toISOString(),
        })
        .eq('nisn', cleanNisn);

      // 2. Safe upsert into grade_records
      const gradePayload = {
        exam_id: isValidUUID(examId) ? examId : null,
        session_id: (sessionId && isValidUUID(sessionId)) ? sessionId : null,
        student_id: grade.studentId || `stu-${cleanNisn}`,
        name: grade.name.trim(),
        nisn: cleanNisn,
        class_name: grade.className.trim(),
        score: grade.score,
        max_score: grade.maxScore,
        submitted_at: grade.submittedAt,
        time_spent_minutes: grade.timeSpentMinutes,
        tab_violations: grade.tabViolations,
        status: grade.status,
      };

      const { data: existingGrades } = await supabase
        .from('grade_records')
        .select('id')
        .eq('nisn', cleanNisn);

      if (existingGrades && existingGrades.length > 0) {
        await supabase
          .from('grade_records')
          .update(gradePayload)
          .eq('nisn', cleanNisn);
      } else {
        await supabase
          .from('grade_records')
          .insert(gradePayload);
      }
    } catch (err) {
      console.warn('Grade submit warning:', err);
    }
  },

  /**
   * Teacher Action: Send live warning to student in database & Broadcast
   */
  async sendWarningToStudent(studentNisn: string, studentName: string, message: string, examId?: string) {
    try {
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const warningText = message.trim();

      // 1. Insert into violation_logs
      await supabase.from('violation_logs').insert({
        exam_id: (examId && examId !== 'all') ? examId : null,
        student_name: studentName,
        student_nisn: studentNisn,
        timestamp: nowStr,
        message: `Peringatan Pengawas: "${warningText}"`,
        severity: 'warning',
      });

      // 2. Realtime Broadcast to student's personal channel
      const alertChannel = supabase.channel(`student-alerts-${studentNisn}`);
      await alertChannel.send({
        type: 'broadcast',
        event: 'teacher_warning',
        payload: {
          studentNisn,
          studentName,
          message: warningText,
          timestamp: nowStr,
          examId: examId || null,
        },
      });

      // 3. Class-wide broadcast
      if (examId && examId !== 'all') {
        const classChannel = supabase.channel(`exam-alerts-${examId}`);
        await classChannel.send({
          type: 'broadcast',
          event: 'teacher_warning',
          payload: {
            studentNisn,
            studentName,
            message: warningText,
            timestamp: nowStr,
            examId,
          },
        });
      }
    } catch (err) {
      console.warn('Send warning error:', err);
    }
  },

  /**
   * Teacher Action: Reset student session in database
   */
  async resetStudentSessionInDb(examId: string, studentNisn: string) {
    try {
      await supabase
        .from('student_sessions')
        .update({
          status: 'working',
          connection_status: 'online',
          violation_count: 0,
        })
        .eq('exam_id', examId)
        .eq('nisn', studentNisn);

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await supabase.from('violation_logs').insert({
        exam_id: examId,
        student_name: studentNisn,
        student_nisn: studentNisn,
        timestamp: nowStr,
        message: 'Sesi ujian direset oleh pengawas. Siswa dapat login kembali.',
        severity: 'info',
      });
    } catch (err) {
      console.warn('Reset session error:', err);
    }
  },

  /**
   * Teacher Action: Force submit single student in database
   */
  async forceSubmitStudentInDb(examId: string, studentNisn: string) {
    try {
      await supabase
        .from('student_sessions')
        .update({
          status: 'submitted',
          remaining_seconds: 0,
          submitted_at: new Date().toISOString(),
        })
        .eq('exam_id', examId)
        .eq('nisn', studentNisn);
    } catch (err) {
      console.warn('Force submit error:', err);
    }
  },

  /**
   * Teacher Action: Add global time to all active students in database
   */
  async addGlobalTimeInDb(examId: string, addedMinutes: number) {
    try {
      const addedSec = addedMinutes * 60;
      const { data: activeSessions } = await supabase
        .from('student_sessions')
        .select('id, remaining_seconds')
        .eq('exam_id', examId)
        .neq('status', 'submitted');

      if (activeSessions) {
        for (const s of activeSessions) {
          await supabase
            .from('student_sessions')
            .update({ remaining_seconds: (s.remaining_seconds || 0) + addedSec })
            .eq('id', s.id);
        }
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await supabase.from('violation_logs').insert({
        exam_id: examId,
        student_name: 'Semua Peserta',
        student_nisn: '-',
        timestamp: nowStr,
        message: `Pengawas menambahkan waktu ujian serentak (+${addedMinutes} Menit)`,
        severity: 'info',
      });
    } catch (err) {
      console.warn('Add global time error:', err);
    }
  },

  /**
   * Teacher Action: Lock and submit all active exams in database
   */
  async lockAllExamsInDb(examId: string) {
    try {
      await supabase
        .from('student_sessions')
        .update({
          status: 'submitted',
          remaining_seconds: 0,
          submitted_at: new Date().toISOString(),
        })
        .eq('exam_id', examId)
        .neq('status', 'submitted');

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await supabase.from('violation_logs').insert({
        exam_id: examId,
        student_name: 'Sistem Pengawas',
        student_nisn: '-',
        timestamp: nowStr,
        message: 'Ujian telah dikunci dan ditutup serentak oleh pengawas.',
        severity: 'danger',
      });
    } catch (err) {
      console.warn('Lock all exams error:', err);
    }
  },

  /**
   * Fetch All Active Exams from Supabase (For Teacher Mode and Quick Token Selector)
   */
  async getAllExams(): Promise<ExamSettings[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        subject: d.subject,
        gradeLevel: d.grade_level,
        durationMinutes: d.duration_minutes,
        token: d.token,
        scheduleDate: d.schedule_date,
        scheduleTime: d.schedule_time,
        antiCheat: d.anti_cheat || {
          detectTabSwitch: true,
          fullScreenLock: true,
          shuffleQuestions: true,
          shuffleOptions: true,
        },
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch Students & Live Telemetry for an Exam directly from Supabase (Teacher Mode)
   */
  async getLiveStudents(examId: string): Promise<StudentProctoring[]> {
    try {
      const { data, error } = await supabase
        .from('student_sessions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        nisn: row.nisn,
        name: row.student_name,
        className: row.class_name,
        status: row.status,
        remainingSeconds: row.remaining_seconds,
        totalQuestions: row.total_questions || 5,
        progressCount: row.progress_count || 0,
        violationCount: row.violation_count || 0,
        connectionStatus: row.connection_status || 'online',
        violationLogs: [],
      }));
    } catch {
      return [];
    }
  },

  /**
   * Fetch All Grade Records for an Exam directly from Supabase (Teacher Mode)
   */
  async getGradeRecords(examId?: string): Promise<GradeRecord[]> {
    try {
      let query = supabase.from('grade_records').select('*').order('created_at', { ascending: false });
      if (examId) query = query.eq('exam_id', examId);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((d: any) => ({
        studentId: d.student_id,
        name: d.name,
        nisn: d.nisn,
        className: d.class_name,
        score: d.score,
        maxScore: d.max_score || 100,
        submittedAt: d.submitted_at,
        timeSpentMinutes: d.time_spent_minutes || 1,
        tabViolations: d.tab_violations || 0,
        status: d.status || 'Lulus',
      }));
    } catch {
      return [];
    }
  },

  /**
   * Subscribe to Live Student Sessions & Violation Feed via Supabase Realtime (Teacher Mode)
   */
  subscribeToLiveExam(
    examId: string,
    onStudentUpdate: (student: StudentProctoring) => void,
    onViolationLog: (log: ViolationLogItem) => void
  ) {
    const channel = supabase
      .channel(`mobile-proctoring-${examId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_sessions', filter: `exam_id=eq.${examId}` },
        (payload: any) => {
          if (payload.new) {
            const row = payload.new;
            onStudentUpdate({
              id: row.id,
              name: row.student_name,
              nisn: row.nisn,
              className: row.class_name,
              status: row.status,
              remainingSeconds: row.remaining_seconds,
              totalQuestions: row.total_questions || 5,
              progressCount: row.progress_count || 0,
              violationCount: row.violation_count || 0,
              connectionStatus: row.connection_status || 'online',
              violationLogs: [],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'violation_logs', filter: `exam_id=eq.${examId}` },
        (payload: any) => {
          if (payload.new) {
            const row = payload.new;
            onViolationLog({
              id: row.id,
              timestamp: row.timestamp,
              studentName: row.student_name,
              studentNisn: row.student_nisn,
              message: row.message,
              severity: row.severity || 'warning',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscribe to Live Teacher Commands / Warnings for Student Device
   */
  subscribeToStudentAlerts(
    examId: string,
    studentNisn: string,
    onWarning: (alert: { message: string; timestamp: string; studentName?: string }) => void,
    onTimeAdded?: (addedMinutes: number) => void,
    onForceSubmit?: () => void
  ) {
    const cleanNisn = (studentNisn || '').trim();

    // 1. Channel for Personal Alerts (student-alerts-[NISN])
    const personalChannel = supabase
      .channel(`student-alerts-${cleanNisn}`)
      .on('broadcast', { event: 'teacher_warning' }, (payload: any) => {
        if (payload?.payload?.message) {
          onWarning({
            message: payload.payload.message,
            timestamp: payload.payload.timestamp || new Date().toLocaleTimeString(),
            studentName: payload.payload.studentName,
          });
        }
      })
      .on('broadcast', { event: 'force_submit' }, () => {
        if (onForceSubmit) onForceSubmit();
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'violation_logs',
          filter: `student_nisn=eq.${cleanNisn}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.message) {
            onWarning({
              message: payload.new.message,
              timestamp: payload.new.timestamp || new Date().toLocaleTimeString(),
              studentName: payload.new.student_name,
            });
          }
        }
      )
      .subscribe();

    // 2. Channel for Class-wide / Global Alerts (exam-alerts-[examId])
    const classChannel = supabase
      .channel(`exam-alerts-${examId}`)
      .on('broadcast', { event: 'teacher_warning' }, (payload: any) => {
        const p = payload?.payload;
        if (p && (p.studentNisn === cleanNisn || p.studentNisn === 'ALL' || p.studentNisn === '-')) {
          onWarning({
            message: p.message,
            timestamp: p.timestamp || new Date().toLocaleTimeString(),
            studentName: p.studentName,
          });
        }
      })
      .on('broadcast', { event: 'add_time' }, (payload: any) => {
        const added = payload?.payload?.addedMinutes;
        if (added && onTimeAdded) {
          onTimeAdded(added);
        }
      })
      .on('broadcast', { event: 'lock_exam' }, () => {
        if (onForceSubmit) onForceSubmit();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(personalChannel);
      supabase.removeChannel(classChannel);
    };
  },
};
