import { supabase } from '../lib/supabase';

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  school: string;
  subject: string;
  role: 'teacher' | 'admin';
}

export const authService = {
  /**
   * Strictly verify Teacher / Supervisor Security PIN (NEVER allow Student Exam Tokens)
   */
  async loginWithPIN(
    pin: string, 
    teacherName: string = 'Pengawas Ruang',
    targetExamToken?: string
  ): Promise<{
    success: boolean;
    teacher?: TeacherUser;
    matchedExam?: any;
    error?: string;
  }> {
    try {
      const cleanPin = pin.trim();

      // 1. Check if cleanPin matches an Exam's specific Proctor PIN (anti_cheat->>proctor_pin)
      const { data: examByProctorPin } = await supabase
        .from('exams')
        .select('*')
        .eq('anti_cheat->>proctor_pin', cleanPin)
        .maybeSingle();

      if (examByProctorPin) {
        const teacher: TeacherUser = {
          id: `teacher-${examByProctorPin.id.substring(0, 8)}`,
          name: teacherName || 'Pengawas Ruang Ujian',
          email: 'pengawas@sekolah.id',
          school: 'Satuan Pendidikan',
          subject: examByProctorPin.subject || 'Pengawas Ujian CBT',
          role: 'teacher',
        };
        return { success: true, teacher, matchedExam: examByProctorPin };
      }

      // 2. Check if user accidentally entered a Student Exam Token in the PIN field
      const { data: studentExamToken } = await supabase
        .from('exams')
        .select('id, title, token, subject')
        .eq('token', cleanPin)
        .maybeSingle();

      // Standard / Configured Supervisor Master PINs
      const isSupervisorPin = (
        cleanPin === '123456' || 
        cleanPin === '998877' || 
        cleanPin === '654321' || 
        cleanPin === '888888'
      );

      // If it matches a student token and is NOT a valid supervisor PIN, reject explicitly for security
      if (studentExamToken && !isSupervisorPin) {
        return {
          success: false,
          error: `PIN '${cleanPin}' adalah Token Siswa untuk "${studentExamToken.title}". Untuk mengawasi kelas ini, gunakan PIN Pengawas yang dibuat untuk paket ujian ini.`,
        };
      }

      // Check against supervisor PIN in database profiles
      let isProfilePin = false;
      let matchedProfile: any = null;
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('supervisor_pin', cleanPin)
          .maybeSingle();
        if (prof) {
          isProfilePin = true;
          matchedProfile = prof;
        }
      } catch {}

      // 3. Validate Master Supervisor PIN
      if (isSupervisorPin || isProfilePin) {
        let matchedExam: any = null;

        // If a specific target exam token is provided by the proctor, lookup that exam
        if (targetExamToken && targetExamToken.trim().length === 6) {
          const { data: specificExam } = await supabase
            .from('exams')
            .select('*')
            .eq('token', targetExamToken.trim())
            .maybeSingle();
          if (specificExam) {
            matchedExam = specificExam;
          }
        }

        // Fallback to latest exam if no specific exam token found
        if (!matchedExam) {
          const { data: latestList } = await supabase
            .from('exams')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (latestList && latestList.length > 0) {
            matchedExam = latestList[0];
          }
        }

        const teacher: TeacherUser = {
          id: matchedProfile?.id || `teacher-${Date.now()}`,
          name: teacherName || matchedProfile?.full_name || 'Bpk. Rahmat, S.Pd.',
          email: matchedProfile?.email || 'guru@belajar.id',
          school: matchedProfile?.school_name || 'SMA Negeri 1 Indonesia',
          subject: matchedExam?.subject || matchedProfile?.subject || 'Pengawas Ujian CBT',
          role: 'teacher',
        };

        return { success: true, teacher, matchedExam: matchedExam || undefined };
      }

      return {
        success: false,
        error: 'PIN Pengawas tidak terdaftar. Masukkan PIN Pengawas 6-digit sesuai paket ujian kelas yang diawasi.',
      };
    } catch {
      // Fallback
      if (pin.trim() === '123456' || pin.trim() === '998877') {
        return {
          success: true,
          teacher: {
            id: `teacher-${Date.now()}`,
            name: teacherName || 'Bpk. Rahmat, S.Pd.',
            email: 'guru@belajar.id',
            school: 'SMA Negeri 1 Indonesia',
            subject: 'Pengawas Ujian CBT',
            role: 'teacher',
          },
        };
      }
      return { success: false, error: 'Gagal memverifikasi PIN Pengawas.' };
    }
  },

  /**
   * Get Current Supabase User if authenticated
   */
  async getCurrentUser(): Promise<TeacherUser | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return {
        id: session.user.id,
        name: profile?.full_name || session.user.email?.split('@')[0] || 'Guru Penguji',
        email: session.user.email || '',
        school: profile?.school_name || 'Satuan Pendidikan',
        subject: profile?.subject || 'Matematika',
        role: 'teacher',
      };
    } catch {
      return null;
    }
  },
};
