import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { StudentRosterItem, QRExamSyncPayload } from '../types/exam';

const STORAGE_ROSTER_PREFIX = 'ujianpintar_mobile_roster_';

export const rosterService = {
  /**
   * Parse QR code payload scanned from paper / projector screen
   */
  parseQrPayload(rawQrText: string): QRExamSyncPayload | null {
    if (!rawQrText) return null;
    const clean = rawQrText.trim();

    // 1. Try parsing JSON payload
    try {
      const parsed = JSON.parse(clean);
      if (
        (parsed.type === 'UP_EXAM_SYNC' || parsed.type === 'ujianpintar_exam_sync') &&
        (parsed.examId || parsed.id)
      ) {
        return {
          type: 'UP_EXAM_SYNC',
          v: parsed.v || 1,
          examId: parsed.examId || parsed.id,
          examTitle: parsed.examTitle || parsed.title || 'Ujian Sekolah',
          targetClass: parsed.targetClass || parsed.className || parsed.gradeLevel || '',
          subject: parsed.subject || '',
          token: '', // PIN ujian selalu dikosongkan agar diinput manual oleh siswa
        };
      }
    } catch {
      // Not JSON, check URL format
    }

    // 2. Try parsing URL query parameters
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const queryIdx = clean.indexOf('?');
        if (queryIdx !== -1) {
          const queryString = clean.substring(queryIdx + 1);
          const pairs = queryString.split('&');
          const params: Record<string, string> = {};
          pairs.forEach((p) => {
            const [k, v] = p.split('=');
            if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });

          const examId = params['examId'] || params['id'];
          if (examId) {
            return {
              type: 'UP_EXAM_SYNC',
              v: 1,
              examId,
              examTitle: params['title'] || params['examTitle'] || 'Ujian Sekolah',
              targetClass: params['class'] || params['targetClass'] || '',
              subject: params['subject'] || '',
              token: '', // PIN ujian selalu dikosongkan agar diinput manual oleh siswa
            };
          }
        }
      } catch {}
    }

    return null;
  },

  /**
   * Fetch student roster from Supabase database for the target class
   */
  async getPublicClassRoster(examId: string, className?: string): Promise<StudentRosterItem[]> {
    try {
      let targetClass = className?.trim() || '';
      let teacherId = '';

      // 1. Fetch exam metadata for target_class and teacher_id scoping
      if (examId) {
        const { data: exData } = await supabase
          .from('exams')
          .select('target_class, grade_level, teacher_id')
          .eq('id', examId)
          .maybeSingle();

        if (exData) {
          if (!targetClass) {
            targetClass = (exData as any).target_class || (exData as any).grade_level || '';
          }
          teacherId = (exData as any).teacher_id || '';
        }
      }

      // 2. Query teacher_student_rosters table
      let query = supabase.from('teacher_student_rosters').select('*');

      if (teacherId) {
        query = query.or(`teacher_id.eq.${teacherId},teacher_id.eq.local_teacher`);
      }

      if (targetClass && targetClass !== 'Semua Kelas') {
        const clean = targetClass.replace(/^kelas\s*/i, '').trim();
        query = query.or(`class_name.ilike.%${clean}%,class_name.ilike.%${targetClass}%`);
      }

      const { data, error } = await query
        .order('student_name', { ascending: true })
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted: StudentRosterItem[] = data.map((d: any) => ({
          id: d.id,
          teacherId: d.teacher_id,
          nisn: d.nisn,
          studentName: d.student_name,
          className: d.class_name,
          gender: d.gender || 'L',
        }));

        // Cache in AsyncStorage
        if (targetClass) {
          AsyncStorage.setItem(
            `${STORAGE_ROSTER_PREFIX}${targetClass.toLowerCase()}`,
            JSON.stringify(formatted)
          ).catch(() => {});
        }

        return formatted;
      }
    } catch (err) {
      console.warn('rosterService.getPublicClassRoster network error:', err);
    }

    // 3. Fallback to AsyncStorage cache if offline
    if (className) {
      try {
        const cached = await AsyncStorage.getItem(`${STORAGE_ROSTER_PREFIX}${className.toLowerCase()}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }

    // 4. Return empty array if not found (do NOT return fake demo data)
    return [];
  },
};
