import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  Clock,
  AlertTriangle,
  Check,
  Lock,
  Plus,
  ChevronRight,
  RefreshCw,
  Layers,
} from 'lucide-react-native';
import type { ExamSettings, StudentProctoring } from '../../types/exam';
import { StatusBadge } from '../common/StatusBadge';
import { LiveViolationTicker } from './LiveViolationTicker';
import { TeacherStudentActionModal } from './TeacherStudentActionModal';
import { useLiveProctoring } from '../../hooks/useLiveProctoring';
import { examService } from '../../services/examService';
import { typography, colors, radii, shadows } from '../../theme';
import { CustomModal } from '../common/CustomModal';

interface TeacherProctoringViewProps {
  exam: ExamSettings;
  teacherName: string;
  onOpenGradeReport: () => void;
  onSelectExam?: (exam: ExamSettings) => void;
}

export const TeacherProctoringView: React.FC<TeacherProctoringViewProps> = ({
  exam,
  teacherName,
  onOpenGradeReport,
  onSelectExam,
}) => {
  const [currentExam, setCurrentExam] = useState<ExamSettings>(exam);
  const [availableExams, setAvailableExams] = useState<ExamSettings[]>([]);
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [timeModalMinutes, setTimeModalMinutes] = useState<number | null>(null);
  const [isLockAllModalOpen, setIsLockAllModalOpen] = useState(false);

  const {
    students,
    violationLogs,
    setViolationLogs,
    isLoading,
    refreshRoster,
    addGlobalTime,
    lockAllExams,
    resetStudentSession,
    forceSubmitStudent,
    sendWarning,
  } = useLiveProctoring(currentExam.id);

  // Sync currentExam whenever parent exam prop updates
  useEffect(() => {
    if (exam && (exam.id !== currentExam.id || exam.token !== currentExam.token)) {
      setCurrentExam(exam);
    }
  }, [exam?.id, exam?.token, exam?.subject]);

  // Fetch all published exams in Supabase for teacher exam selector
  useEffect(() => {
    const fetchExams = async () => {
      const all = await examService.getAllExams();
      if (all.length > 0) {
        setAvailableExams(all);
        if (!currentExam.id || currentExam.id === 'exam-default-01') {
          setCurrentExam(all[0]);
          if (onSelectExam) onSelectExam(all[0]);
        }
      }
    };
    fetchExams();
  }, []);

  const [activeFilter, setActiveFilter] = useState<'all' | 'working' | 'violation' | 'submitted'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentProctoring | null>(null);

  const totalCount = students.length;
  const workingCount = students.filter((s) => s.status === 'working').length;
  const violationCount = students.filter((s) => s.violationCount > 0 || s.status === 'violation_flagged').length;
  const submittedCount = students.filter((s) => s.status === 'submitted').length;

  const filteredStudents = students.filter((s) => {
    if (activeFilter === 'working') return s.status === 'working';
    if (activeFilter === 'violation') return s.violationCount > 0 || s.status === 'violation_flagged';
    if (activeFilter === 'submitted') return s.status === 'submitted';
    return true;
  });

  const handleAddTimePrompt = (minutes: number) => {
    setTimeModalMinutes(minutes);
  };

  const handleLockAllPrompt = () => {
    setIsLockAllModalOpen(true);
  };

  const handleSendWarningStudent = (nisn: string, message: string) => {
    const stu = students.find((s) => s.nisn === nisn);
    sendWarning(nisn, stu?.name || 'Peserta', message);
  };

  const formatRemaining = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Live Violation Ticker */}
      <LiveViolationTicker
        logs={violationLogs}
        onDismiss={() => setViolationLogs([])}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Banner with Exam Switcher */}
        <View style={styles.examBanner}>
          <View style={styles.examBannerLeft}>
            <View style={styles.examTitleRow}>
              <Text style={styles.examTitle}>{currentExam.title}</Text>
              {availableExams.length > 0 && (
                <TouchableOpacity
                  style={styles.switchExamBtn}
                  onPress={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                  activeOpacity={0.7}
                >
                  <Layers size={13} color={colors.primary} />
                  <Text style={styles.switchExamText}>Ganti Paket</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.examDetails}>
              {currentExam.subject} • Token PIN: <Text style={styles.tokenText}>{currentExam.token}</Text>
            </Text>
          </View>

          <View style={styles.bannerRightActions}>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshRoster} activeOpacity={0.7}>
              <RefreshCw size={14} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.rekapBtn} onPress={onOpenGradeReport} activeOpacity={0.8}>
              <Text style={styles.rekapBtnText}>Rekap Nilai</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Exam Switcher */}
        {isExamDropdownOpen && availableExams.length > 0 && (
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Pilih Paket Ujian dari Database:</Text>
            {availableExams.map((ex) => (
              <TouchableOpacity
                key={ex.id || ex.token}
                style={[styles.dropdownItem, currentExam.id === ex.id && styles.dropdownItemActive]}
                onPress={() => {
                  setCurrentExam(ex);
                  if (onSelectExam) onSelectExam(ex);
                  setIsExamDropdownOpen(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.dropdownItemTitle, currentExam.id === ex.id && styles.dropdownItemTextActive]}>
                  {ex.title} ({ex.subject})
                </Text>
                <Text style={styles.dropdownItemToken}>Token: {ex.token}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* KPI Cards Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}>
              <Users size={15} color={colors.primary} />
            </View>
            <Text style={styles.kpiValue}>{totalCount}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, styles.kpiIconWorking]}>
              <Clock size={15} color={colors.primary} />
            </View>
            <Text style={styles.kpiValue}>{workingCount}</Text>
            <Text style={styles.kpiLabel}>Aktif</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, styles.kpiIconDanger]}>
              <AlertTriangle size={15} color={colors.danger} />
            </View>
            <Text style={[styles.kpiValue, styles.textDanger]}>{violationCount}</Text>
            <Text style={styles.kpiLabel}>Pelanggaran</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, styles.kpiIconSuccess]}>
              <Check size={15} color={colors.success} strokeWidth={2.8} />
            </View>
            <Text style={styles.kpiValue}>{submittedCount}</Text>
            <Text style={styles.kpiLabel}>Selesai</Text>
          </View>
        </View>

        {/* Quick Global Action Controls */}
        <View style={styles.controlsBar}>
          <Text style={styles.controlsLabel}>Aksi Kelas Serentak</Text>
          <View style={styles.controlsBtnRow}>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => handleAddTimePrompt(5)}
              activeOpacity={0.75}
            >
              <Plus size={14} color={colors.primary} strokeWidth={2.8} />
              <Text style={styles.timeBtnText}>+5 Menit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => handleAddTimePrompt(10)}
              activeOpacity={0.75}
            >
              <Plus size={14} color={colors.primary} strokeWidth={2.8} />
              <Text style={styles.timeBtnText}>+10 Menit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lockBtn}
              onPress={handleLockAllPrompt}
              activeOpacity={0.75}
            >
              <Lock size={14} color="#ffffff" />
              <Text style={styles.lockBtnText}>Kunci Semua</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              Semua ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'working' && styles.filterPillActive]}
            onPress={() => setActiveFilter('working')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'working' && styles.filterTextActive]}>
              Mengerjakan ({workingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'violation' && styles.filterPillActive]}
            onPress={() => setActiveFilter('violation')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'violation' && styles.filterTextActive]}>
              Pelanggaran ({violationCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'submitted' && styles.filterPillActive]}
            onPress={() => setActiveFilter('submitted')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'submitted' && styles.filterTextActive]}>
              Selesai ({submittedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Students List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Memuat status peserta...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Users size={32} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>Belum Ada Peserta Terhubung</Text>
            <Text style={styles.emptySubtitle}>
              Siswa yang masuk menggunakan token <Text style={styles.boldText}>{currentExam.token}</Text> akan otomatis muncul di sini.
            </Text>
          </View>
        ) : (
          <View style={styles.rosterList}>
            {filteredStudents.map((student) => {
              const progressPct =
                student.totalQuestions > 0
                  ? Math.round((student.progressCount / student.totalQuestions) * 100)
                  : 0;

              return (
                <TouchableOpacity
                  key={student.id || student.nisn}
                  style={styles.studentCard}
                  onPress={() => setSelectedStudent(student)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.studentNameBox}>
                      <Text style={styles.cardStudentName}>{student.name}</Text>
                      <Text style={styles.cardNisn}>
                        NISN: {student.nisn} • {student.className}
                      </Text>
                    </View>
                    <StatusBadge status={student.status} size="sm" />
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {student.progressCount}/{student.totalQuestions} Soal ({progressPct}%)
                    </Text>
                  </View>

                  {/* Bottom Stats */}
                  <View style={styles.cardBottom}>
                    <View style={styles.timerRow}>
                      <Clock size={13} color={colors.textMuted} />
                      <Text style={styles.bottomTimerText}>
                        {formatRemaining(student.remainingSeconds)}
                      </Text>
                    </View>

                    {student.violationCount > 0 ? (
                      <View style={styles.violationTag}>
                        <AlertTriangle size={11} color="#ffffff" />
                        <Text style={styles.violationTagText}>{student.violationCount} Pelanggaran</Text>
                      </View>
                    ) : (
                      <View style={styles.actionPrompt}>
                        <Text style={styles.actionPromptText}>Detail Aksi</Text>
                        <ChevronRight size={13} color={colors.primary} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Student Action Modal */}
      <TeacherStudentActionModal
        student={selectedStudent}
        visible={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onSendWarning={handleSendWarningStudent}
        onResetSession={resetStudentSession}
        onForceSubmit={forceSubmitStudent}
      />

      {/* Custom Add Time Modal */}
      <CustomModal
        visible={timeModalMinutes !== null}
        type="time"
        title="Tambah Waktu Serentak"
        message={`Tambahkan waktu pengerjaan +${timeModalMinutes} menit untuk seluruh peserta di basis data server?`}
        confirmText={`+${timeModalMinutes} Menit`}
        cancelText="Batal"
        onConfirm={() => {
          if (timeModalMinutes) addGlobalTime(timeModalMinutes);
          setTimeModalMinutes(null);
        }}
        onCancel={() => setTimeModalMinutes(null)}
      />

      {/* Custom Lock All Exams Modal */}
      <CustomModal
        visible={isLockAllModalOpen}
        type="lock"
        title="Kunci Seluruh Ujian"
        message="Apakah Anda yakin ingin mengunci dan mengumpulkan seluruh lembar ujian peserta sekarang di basis data?"
        confirmText="Kunci & Kumpulkan Semua"
        cancelText="Batal"
        onConfirm={() => {
          setIsLockAllModalOpen(false);
          lockAllExams();
        }}
        onCancel={() => setIsLockAllModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  examBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    ...shadows.card,
  },
  examBannerLeft: {
    flex: 1,
    marginRight: 10,
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  examTitle: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  switchExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  switchExamText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.primary,
  },
  examDetails: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tokenText: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
  bannerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rekapBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  rekapBtnText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  dropdownBox: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    ...shadows.card,
  },
  dropdownTitle: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemTitle: {
    fontFamily: typography.semiBold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontFamily: typography.bold,
  },
  dropdownItemToken: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    ...shadows.card,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  kpiIconWorking: {
    backgroundColor: colors.primaryLight,
  },
  kpiIconDanger: {
    backgroundColor: colors.dangerLight,
  },
  kpiIconSuccess: {
    backgroundColor: colors.successLight,
  },
  kpiValue: {
    fontFamily: typography.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontFamily: typography.semiBold,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  textDanger: {
    color: colors.danger,
  },
  controlsBar: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    ...shadows.card,
  },
  controlsLabel: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  controlsBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
  },
  timeBtnText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.primaryDark,
    includeFontPadding: false,
  },
  lockBtn: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    borderRadius: radii.md,
  },
  lockBtnText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#ffffff',
    includeFontPadding: false,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  filterTextActive: {
    fontFamily: typography.bold,
    color: '#ffffff',
    includeFontPadding: false,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  rosterList: {
    gap: 10,
  },
  studentCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  studentNameBox: {
    flex: 1,
    marginRight: 8,
  },
  cardStudentName: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cardNisn: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  progressContainer: {
    marginVertical: 4,
    gap: 3,
  },
  progressTrack: {
    height: 5,
    backgroundColor: colors.bgCardSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: typography.medium,
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'right',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomTimerText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  violationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.xs,
  },
  violationTagText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.primary,
  },
  emptyStateBox: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 10,
    ...shadows.card,
  },
  emptyTitle: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 17,
  },
  boldText: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
});
