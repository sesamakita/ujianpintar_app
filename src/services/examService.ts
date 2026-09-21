import { supabase } from '../lib/supabase';
import { formatPersonName, formatClassName } from '../lib/formatters';
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

/**
 * Format date into Asia/Jakarta (WIB) YYYY-MM-DD
 */
export function getWibDateString(dateInput: string | Date = new Date()): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return new Date().toISOString().substring(0, 10);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  } catch {
    return (typeof dateInput === 'string' ? dateInput : dateInput.toISOString()).substring(0, 10);
  }
}

/**
 * Helper to reliably dispatch Supabase Realtime broadcasts by ensuring channel subscription
 */
export async function sendRealtimeBroadcast(channelName: string, event: string, payload: any): Promise<void> {
  return new Promise<void>((resolve) => {
    const channel = supabase.channel(channelName);
    let isHandled = false;

    const timeout = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        try { supabase.removeChannel(channel); } catch {}
        resolve();
      }
    }, 2500);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !isHandled) {
        try {
          await channel.send({
            type: 'broadcast',
            event,
            payload,
          });
        } catch (err) {
          console.warn(`sendRealtimeBroadcast ${event} error:`, err);
        } finally {
          if (!isHandled) {
            isHandled = true;
            clearTimeout(timeout);
            setTimeout(() => {
              try { supabase.removeChannel(channel); } catch {}
              resolve();
            }, 300);
          }
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeout);
          try { supabase.removeChannel(channel); } catch {}
          resolve();
        }
      }
    });
  });
}

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

      // 1. Query exams table by token
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('token', cleanToken)
        .maybeSingle();

      if (examError || !exam) {
        return {
          exam: null,
          questions: [],
          error: `Token PIN '${cleanToken}' tidak ditemukan atau tidak valid.`,
        };
      }

      // Validasi status akses paket ujian
      if (exam.status === 'closed') {
        return {
          exam: null,
          questions: [],
          error: 'Akses ujian sedang ditutup oleh guru pengawas. Sesi ujian saat ini tidak aktif atau belum dibuka.',
        };
      }

      if (exam.status && exam.status !== 'published' && exam.status !== 'active') {
        return {
          exam: null,
          questions: [],
          error: 'Paket ujian belum dibuka untuk umum atau masih dalam status draf.',
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
   * Gatekeeper: Check if a student is allowed to enter or resume an exam session
   * Blocks students who have already submitted or were expelled until the teacher resets the session
   */
  async checkStudentSessionAccess(examId: string, studentNisn: string, studentName?: string, className?: string): Promise<{
    allowed: boolean;
    reason?: 'submitted' | 'violation_flagged' | 'timed_out' | 'active_working' | 'capacity_exceeded' | 'conflict';
    message?: string;
    existingSession?: any;
  }> {
    try {
      const cleanNisn = studentNisn.trim();
      const cleanName = (studentName || '').trim().toLowerCase();
      const isValidUUID = (str?: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');

      let query = supabase
        .from('student_sessions')
        .select('*')
        .eq('nisn', cleanNisn);

      if (examId && isValidUUID(examId)) {
        query = query.eq('exam_id', examId);
      }

      const { data: sessions, error } = await query.order('created_at', { ascending: false });

      // Jika siswa sudah pernah masuk sebelumnya, periksa status sesinya
      if (!error && sessions && sessions.length > 0) {
        // Cek apakah NISN ini sedang dipakai oleh siswa lain dengan nama berbeda
        if (cleanName) {
          const conflictingSession = sessions.find((s: any) => {
            const sName = (s.student_name || '').trim().toLowerCase();
            return sName && sName !== cleanName;
          });

          if (conflictingSession) {
            return {
              allowed: false,
              reason: 'conflict',
              message: `Nomor NIS/NISN '${cleanNisn}' sudah digunakan oleh siswa lain (${conflictingSession.student_name}). Harap periksa kembali dan masukkan NIS/NISN milik Anda sendiri.`,
              existingSession: conflictingSession,
            };
          }
        }

        const session = sessions[0];

        if (session.status === 'submitted') {
          return {
            allowed: false,
            reason: 'submitted',
            message: 'Akses Terkunci: Anda telah menyelesaikan dan mengumpulkan ujian ini. Anda tidak dapat masuk kembali kecuali sesi Anda di-reset oleh guru pengawas.',
            existingSession: session,
          };
        }

        if (session.status === 'violation_flagged') {
          return {
            allowed: false,
            reason: 'violation_flagged',
            message: 'Akses Ditolak: Anda telah dikeluarkan dari sesi ujian oleh guru pengawas karena pelanggaran integritas. Hubungi guru pengawas untuk meminta reset sesi ujian.',
            existingSession: session,
          };
        }

        if (session.status === 'timed_out') {
          return {
            allowed: false,
            reason: 'timed_out',
            message: 'Akses Ditutup: Waktu pengerjaan ujian Anda telah habis.',
            existingSession: session,
          };
        }

        // Status 'working': Siswa sedang aktif (misal HP crash/restart) -> Izinkan lanjut (resume)
        return {
          allowed: true,
          reason: 'active_working',
          existingSession: session,
        };
      }

      // Siswa BARU yang mencoba bergabung: Periksa batasan kuota kapasitas peserta (Paket Free: Max 40 siswa)
      if (examId && isValidUUID(examId)) {
        try {
          const { data: examData } = await supabase
            .from('exams')
            .select('teacher_id')
            .eq('id', examId)
            .maybeSingle();

          if (examData?.teacher_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_tier, subscription_expires_at')
              .eq('id', examData.teacher_id)
              .maybeSingle();

            let isUnlimited = false;
            if (profile && (profile.subscription_tier === 'pro' || profile.subscription_tier === 'school')) {
              if (profile.subscription_expires_at) {
                const expiry = new Date(profile.subscription_expires_at).getTime();
                if (expiry > Date.now()) {
                  isUnlimited = true;
                }
              } else {
                isUnlimited = true;
              }
            }

            // Jika akun guru adalah Free (Basic):
            if (!isUnlimited) {
              // 1. Batasi maksimal 40 siswa per ujian/kelas
              const { count, error: countErr } = await supabase
                .from('student_sessions')
                .select('id', { count: 'exact', head: true })
                .eq('exam_id', examId);

              if (!countErr && typeof count === 'number' && count >= 40) {
                return {
                  allowed: false,
                  reason: 'capacity_exceeded',
                  message: 'Kapasitas Ujian Penuh: Sesi ujian ini telah mencapai batas maksimal 40 siswa (Paket Guru Basic). Silakan hubungi guru pengawas Anda untuk meng-upgrade ke akun Guru PRO agar kapasitas peserta menjadi tanpa batas (Unlimited).',
                };
              }

              // 2. Batasi kuota maksimal 3 sesi ujian per bulan (>10 siswa per sesi)
              try {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 12 * 3600 * 1000).toISOString();
                const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) + 14 * 3600 * 1000).toISOString();

                // Dapatkan semua ujian milik guru ini
                const { data: teacherExams } = await supabase
                  .from('exams')
                  .select('id')
                  .eq('teacher_id', examData.teacher_id);

                if (teacherExams && teacherExams.length > 0) {
                  const examIds = teacherExams.map((e) => e.id);
                  const { data: rawSessions } = await supabase
                    .from('student_sessions')
                    .select('id, exam_id, class_name, nisn, student_name, created_at, started_at')
                    .in('exam_id', examIds)
                    .gte('created_at', startOfMonth)
                    .lte('created_at', endOfMonth);

                  if (rawSessions && rawSessions.length > 0) {
                    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
                    const groupsMap = new Map<string, Set<string>>();

                    for (const row of rawSessions) {
                      const exId = row.exam_id;
                      const normCls = (row.class_name || 'Kelas X').trim().toUpperCase();
                      const dateStr = getWibDateString(row.started_at || row.created_at);

                      if (!dateStr.startsWith(currentMonthPrefix)) continue;

                      const grpKey = `${exId}_${normCls}_${dateStr}`;
                      const cNisn = (row.nisn || row.student_name || row.id).trim().toLowerCase();

                      if (!groupsMap.has(grpKey)) {
                        groupsMap.set(grpKey, new Set<string>());
                      }
                      if (cNisn) {
                        groupsMap.get(grpKey)!.add(cNisn);
                      }
                    }

                    // Evaluasi sesi yang > 10 siswa
                    const qualifyingKeys: string[] = [];
                    let usedSessions = 0;
                    for (const [k, nisns] of groupsMap.entries()) {
                      if (nisns.size > 10) {
                        usedSessions++;
                        qualifyingKeys.push(k);
                      }
                    }

                    const todayStr = getWibDateString();
                    const normCurrentClass = (className || 'Kelas X').trim().toUpperCase();
                    const currentGroupKey = `${examId}_${normCurrentClass}_${todayStr}`;
                    const isAlreadyQualifying = qualifyingKeys.includes(currentGroupKey);

                    // Jika guru sudah mencapai 3 sesi dan sesi ini belum masuk 3 sesi tersebut:
                    if (!isAlreadyQualifying && usedSessions >= 3) {
                      const currentSet = groupsMap.get(currentGroupKey);
                      const currentCount = currentSet ? currentSet.size : 0;

                      // Sesi baru dibatasi maksimal 10 siswa (mode simulasi/remedial)
                      if (currentCount >= 10) {
                        return {
                          allowed: false,
                          reason: 'capacity_exceeded',
                          message: 'Batas Kuota Guru Tercapai: Akun guru Anda telah menggunakan batas maksimal 3 sesi ujian (>10 siswa) untuk bulan ini pada paket Guru Basic. Sesi baru dibatasi maksimal 10 siswa untuk mode simulasi/remedial. Silakan hubungi guru pengawas Anda untuk meningkatkan akun ke Guru PRO.',
                        };
                      }
                    }
                  }
                }
              } catch (quotaErr) {
                console.warn('Mobile quota session evaluation exception:', quotaErr);
              }
            }
          }
        } catch (capErr) {
          console.warn('Quota check exception:', capErr);
        }
      }

      // Diizinkan bergabung
      return { allowed: true };
    } catch (err: any) {
      console.warn('checkStudentSessionAccess exception:', err);
      // Jika terjadi kendala koneksi, izinkan agar siswa tidak terhambat ujian offline
      return { allowed: true };
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
        student_name: formatPersonName(session.studentName).trim(),
        class_name: formatClassName(session.className, false).trim() || 'Kelas X',
        status: session.status,
        remaining_seconds: session.remainingSeconds,
        total_questions: session.totalQuestions,
        progress_count: session.progressCount,
        violation_count: session.violationCount,
        connection_status: 'online',
      };

      // 1. If explicit session id provided and valid UUID, update directly
      if (session.id && isValidUUID(session.id)) {
        const { data: upData, error: upError } = await supabase
          .from('student_sessions')
          .update(payload)
          .eq('id', session.id)
          .select()
          .maybeSingle();

        if (!upError && upData) return { session: upData, error: null };
      }

      // 2. Otherwise search for matching session by nisn AND exam_id AND student_name
      let sessionQuery = supabase
        .from('student_sessions')
        .select('id, student_name')
        .eq('nisn', cleanNisn);

      if (isValidUUID(session.examId)) {
        sessionQuery = sessionQuery.eq('exam_id', session.examId);
      }

      const { data: existingRows } = await sessionQuery.order('created_at', { ascending: false });

      if (existingRows && existingRows.length > 0) {
        // Find exact match on student_name
        const matchByName = existingRows.find(
          (r: any) => (r.student_name || '').trim().toLowerCase() === session.studentName.trim().toLowerCase()
        );

        if (matchByName) {
          const { data: upData, error: upError } = await supabase
            .from('student_sessions')
            .update(payload)
            .eq('id', matchByName.id)
            .select()
            .single();

          if (!upError && upData) return { session: upData, error: null };
        }
      }

      // 3. Otherwise insert new row (DO NOT delete other sessions to prevent cascade deletion of answers)
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
        student_name: formatPersonName(violation.studentName).trim(),
        student_nisn: violation.studentNisn.trim(),
        timestamp: nowStr,
        message: violation.message,
        severity: violation.severity || 'warning',
      });

      // Update student session violation_count & status in database
      let sessionQuery = supabase
        .from('student_sessions')
        .select('id, violation_count')
        .eq('nisn', violation.studentNisn.trim());

      if (isValidUUID(violation.examId)) {
        sessionQuery = sessionQuery.eq('exam_id', violation.examId);
      }

      const { data: sessionRows } = await sessionQuery.order('created_at', { ascending: false }).limit(1);

      if (sessionRows && sessionRows.length > 0) {
        const currentCount = Number(sessionRows[0].violation_count) || 0;
        await supabase
          .from('student_sessions')
          .update({
            violation_count: currentCount + 1,
            status: violation.severity === 'danger' ? 'violation_flagged' : 'working',
          })
          .eq('id', sessionRows[0].id);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Failed to record violation in DB:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Submit final grade record to Supabase grade_records table
   */
  async submitGradeRecord(
    grade: GradeRecord,
    examId: string,
    sessionId?: string,
    answers?: Array<{
      questionId: string;
      selectedOptionId?: string;
      answerText?: string;
      isDoubt?: boolean;
      isCorrect?: boolean;
      scoreEarned?: number;
    }>
  ) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const cleanNisn = grade.nisn.trim();
      const validExamId = isValidUUID(examId) ? examId : null;

      // 1. ALWAYS FIRST update student_sessions status to 'submitted' for THIS exam
      if (sessionId && isValidUUID(sessionId)) {
        await supabase
          .from('student_sessions')
          .update({
            status: 'submitted',
            remaining_seconds: 0,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      } else {
        let sessionUpdate = supabase
          .from('student_sessions')
          .update({
            status: 'submitted',
            remaining_seconds: 0,
            submitted_at: new Date().toISOString(),
          })
          .eq('nisn', cleanNisn)
          .eq('student_name', formatPersonName(grade.name).trim());

        if (validExamId) {
          sessionUpdate = sessionUpdate.eq('exam_id', validExamId);
        }
        await sessionUpdate;
      }

      // 2. Safe upsert into grade_records scoped to session_id or (nisn AND student_name)
      const gradePayload = {
        exam_id: validExamId,
        session_id: (sessionId && isValidUUID(sessionId)) ? sessionId : null,
        student_id: grade.studentId || `stu-${cleanNisn}`,
        name: formatPersonName(grade.name).trim(),
        nisn: cleanNisn,
        class_name: formatClassName(grade.className, false).trim() || 'Kelas X',
        score: Math.round(Number(grade.score) || 0),
        max_score: Math.round(Number(grade.maxScore) || 100),
        submitted_at: grade.submittedAt || new Date().toLocaleString('id-ID'),
        time_spent_minutes: Math.round(Number(grade.timeSpentMinutes) || 0),
        tab_violations: Math.round(Number(grade.tabViolations) || 0),
        status: grade.status || 'Lulus',
      };

      let matchedGradeId: string | null = null;

      if (sessionId && isValidUUID(sessionId)) {
        const { data: gBySession } = await supabase
          .from('grade_records')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();
        if (gBySession?.id) {
          matchedGradeId = gBySession.id;
        }
      }

      if (!matchedGradeId) {
        let gradeQuery = supabase
          .from('grade_records')
          .select('id, name')
          .eq('nisn', cleanNisn);

        if (validExamId) {
          gradeQuery = gradeQuery.eq('exam_id', validExamId);
        }

        const { data: existingGrades } = await gradeQuery.order('created_at', { ascending: false });

        if (existingGrades && existingGrades.length > 0) {
          const matchByName = existingGrades.find(
            (g: any) => (g.name || '').trim().toLowerCase() === grade.name.trim().toLowerCase()
          );
          if (matchByName) {
            matchedGradeId = matchByName.id;
          }
        }
      }

      if (matchedGradeId) {
        await supabase
          .from('grade_records')
          .update(gradePayload)
          .eq('id', matchedGradeId);
      } else {
        await supabase
          .from('grade_records')
          .insert(gradePayload);
      }

      // 3. Batch upsert full student answers to student_answers table for complete audit
      if (sessionId && isValidUUID(sessionId) && Array.isArray(answers) && answers.length > 0) {
        try {
          const nowIso = new Date().toISOString();
          const answerRows = answers
            .filter((a) => a.questionId && isValidUUID(a.questionId))
            .map((a) => ({
              session_id: sessionId,
              question_id: a.questionId,
              selected_option_id: a.selectedOptionId || null,
              answer_text: a.answerText || null,
              is_doubt: !!a.isDoubt,
              is_correct: typeof a.isCorrect === 'boolean' ? a.isCorrect : null,
              score_earned: typeof a.scoreEarned === 'number' ? Math.round(a.scoreEarned) : 0,
              answered_at: nowIso,
            }));

          if (answerRows.length > 0) {
            await supabase.from('student_answers').delete().eq('session_id', sessionId);
            await supabase.from('student_answers').insert(answerRows);
          }
        } catch (ansErr) {
          console.warn('Batch answers sync warning:', ansErr);
        }
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
      const cleanNisn = (studentNisn || '').trim();
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const warningText = message.trim();

      // 1. Insert into violation_logs
      await supabase.from('violation_logs').insert({
        exam_id: (examId && examId !== 'all') ? examId : null,
        student_name: studentName,
        student_nisn: cleanNisn,
        timestamp: nowStr,
        message: `Peringatan Pengawas: "${warningText}"`,
        severity: 'warning',
      });

      // 2. Realtime Broadcast to student's personal channel
      await sendRealtimeBroadcast(`student-alerts-${cleanNisn}`, 'teacher_warning', {
        studentNisn: cleanNisn,
        studentName,
        message: warningText,
        timestamp: nowStr,
        examId: examId || null,
      });

      // 3. Class-wide broadcast
      if (examId && examId !== 'all') {
        await sendRealtimeBroadcast(`exam-alerts-${examId}`, 'teacher_warning', {
          studentNisn: cleanNisn,
          studentName,
          message: warningText,
          timestamp: nowStr,
          examId,
        });
      }
    } catch (err) {
      console.warn('Send warning error:', err);
    }
  },

  /**
   * Teacher Action: Reset student session in database
   */
  async resetStudentSessionInDb(examId: string, studentNisn: string, studentName?: string) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const validExamId = isValidUUID(examId) ? examId : null;

      let updateQuery = supabase
        .from('student_sessions')
        .update({
          status: 'working',
          connection_status: 'online',
          violation_count: 0,
        })
        .eq('nisn', studentNisn);

      if (validExamId) {
        updateQuery = updateQuery.eq('exam_id', validExamId);
      }
      if (studentName) {
        updateQuery = updateQuery.eq('student_name', studentName.trim());
      }
      await updateQuery;

      // Ensure student's real name is retrieved
      let resolvedStudentName = studentName?.trim();
      if (!resolvedStudentName) {
        try {
          const { data: sData } = await supabase
            .from('student_sessions')
            .select('student_name')
            .eq('nisn', studentNisn)
            .maybeSingle();
          if (sData?.student_name) {
            resolvedStudentName = sData.student_name;
          }
        } catch {}
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await supabase.from('violation_logs').insert({
        exam_id: validExamId,
        student_name: resolvedStudentName || studentNisn,
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
   * Teacher Action: Clear all violation logs from database for an exam
   */
  async clearViolationLogsInDb(examId?: string) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      let deleteQuery = supabase.from('violation_logs').delete();
      if (examId && isValidUUID(examId)) {
        deleteQuery = deleteQuery.eq('exam_id', examId);
      } else {
        deleteQuery = deleteQuery.not('id', 'is', null);
      }
      await deleteQuery;
    } catch (err) {
      console.warn('clearViolationLogsInDb error:', err);
    }
  },

  /**
   * Teacher Action: Force submit single student in database
   */
  async forceSubmitStudentInDb(examId: string, studentNisn: string, studentName?: string) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const validExamId = isValidUUID(examId) ? examId : null;
      const cleanNisn = (studentNisn || '').trim();

      let updateQuery = supabase
        .from('student_sessions')
        .update({
          status: 'submitted',
          remaining_seconds: 0,
          submitted_at: new Date().toISOString(),
        })
        .eq('nisn', cleanNisn);

      if (validExamId) {
        updateQuery = updateQuery.eq('exam_id', validExamId);
      }
      if (studentName) {
        updateQuery = updateQuery.eq('student_name', studentName.trim());
      }
      await updateQuery;

      // Broadcast force submit command to student reliably
      await sendRealtimeBroadcast(`student-alerts-${cleanNisn}`, 'force_submit', {
        studentNisn: cleanNisn,
        examId: validExamId,
      });
    } catch (err) {
      console.warn('Force submit error:', err);
    }
  },

  /**
   * Teacher Action: Add global time to all active students in database
   */
  async addGlobalTimeInDb(examId: string, addedMinutes: number) {
    try {
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const validExamId = isValidUUID(examId) ? examId : null;
      const addedSec = addedMinutes * 60;

      let sessionsQuery = supabase
        .from('student_sessions')
        .select('id, remaining_seconds')
        .neq('status', 'submitted');

      if (validExamId) {
        sessionsQuery = sessionsQuery.eq('exam_id', validExamId);
      }

      const { data: activeSessions } = await sessionsQuery;

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
        exam_id: validExamId,
        student_name: 'Semua Peserta',
        student_nisn: '-',
        timestamp: nowStr,
        message: `Pengawas menambahkan waktu ujian serentak (+${addedMinutes} Menit)`,
        severity: 'info',
      });

      // Broadcast time extension event reliably
      const channelName = validExamId ? `exam-alerts-${validExamId}` : 'exam-alerts-global';
      await sendRealtimeBroadcast(channelName, 'add_time', {
        addedMinutes,
        examId: validExamId,
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
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      const validExamId = isValidUUID(examId) ? examId : null;

      let updateQuery = supabase
        .from('student_sessions')
        .update({
          status: 'submitted',
          remaining_seconds: 0,
          submitted_at: new Date().toISOString(),
        })
        .neq('status', 'submitted');

      if (validExamId) {
        updateQuery = updateQuery.eq('exam_id', validExamId);
      }

      await updateQuery;

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await supabase.from('violation_logs').insert({
        exam_id: validExamId,
        student_name: 'Sistem Pengawas',
        student_nisn: '-',
        timestamp: nowStr,
        message: 'Ujian telah dikunci dan ditutup serentak oleh pengawas.',
        severity: 'danger',
      });

      // Broadcast lock event reliably
      const channelName = validExamId ? `exam-alerts-${validExamId}` : 'exam-alerts-global';
      await sendRealtimeBroadcast(channelName, 'lock_exam', {
        examId: validExamId,
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
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      let query = supabase
        .from('student_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (examId && isValidUUID(examId)) {
        query = query.eq('exam_id', examId);
      }

      const { data, error } = await query;

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
      const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
      let query = supabase.from('grade_records').select('*').order('created_at', { ascending: false });
      if (examId && isValidUUID(examId)) query = query.eq('exam_id', examId);

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
   * Helper to query current session status for polling fallback
   */
  async getStudentSessionStatus(nisn: string, examId?: string): Promise<string | null> {
    try {
      const cleanNisn = (nisn || '').trim();
      let query = supabase.from('student_sessions').select('status').eq('nisn', cleanNisn);
      if (examId) query = query.eq('exam_id', examId);
      const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data?.status || null;
    } catch {
      return null;
    }
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
            timestamp: payload.payload.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
            const msg = payload.new.message;
            if (msg.includes('Peringatan Pengawas') || payload.new.severity === 'warning') {
              onWarning({
                message: msg,
                timestamp: payload.new.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                studentName: payload.new.student_name,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_sessions',
          filter: `nisn=eq.${cleanNisn}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.status === 'submitted') {
            if (onForceSubmit) onForceSubmit();
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] personalChannel status for ${cleanNisn}:`, status);
      });

    // 2. Channel for Class-wide / Global Alerts (exam-alerts-[examId])
    const classChannel = supabase
      .channel(`exam-alerts-${examId}`)
      .on('broadcast', { event: 'teacher_warning' }, (payload: any) => {
        const p = payload?.payload;
        if (p && (p.studentNisn === cleanNisn || p.studentNisn === 'ALL' || p.studentNisn === '-')) {
          onWarning({
            message: p.message,
            timestamp: p.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
      .subscribe((status) => {
        console.log(`[Realtime] classChannel status for ${examId}:`, status);
      });

    return () => {
      supabase.removeChannel(personalChannel);
      supabase.removeChannel(classChannel);
    };
  },
};
