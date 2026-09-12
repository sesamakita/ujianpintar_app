import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  Clock,
  AlertTriangle,
  Check,
  Lock,
  Plus,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import type { ExamSettings, StudentProctoring } from '../../types/exam';
import { StatusBadge } from '../common/StatusBadge';
import { LiveViolationTicker } from './LiveViolationTicker';
import { TeacherStudentActionModal } from './TeacherStudentActionModal';
import { useLiveProctoring } from '../../hooks/useLiveProctoring';
import { examService } from '../../services/examService';
import { typography, colors, radii, shadows, clayColors, clayShadows, clayRadii } from '../../theme';
import { CustomModal } from '../common/CustomModal';

interface TeacherProctoringViewProps {
  exam: ExamSettings;
  teacherName: string;
  onOpenGradeReport?: () => void;
  onSelectExam?: (exam: ExamSettings) => void;
  onSwitchRole?: () => void;
}

export const TeacherProctoringView: React.FC<TeacherProctoringViewProps> = ({
  exam,
  teacherName,
  onOpenGradeReport,
  onSelectExam,
  onSwitchRole,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 12;

  const [currentExam, setCurrentExam] = useState<ExamSettings>(exam);
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

  // Fetch initial exam if needed
  useEffect(() => {
    const fetchExams = async () => {
      const all = await examService.getAllExams();
      if (all.length > 0) {
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Violation Ticker */}
        <LiveViolationTicker
          logs={violationLogs}
          onDismiss={() => setViolationLogs([])}
        />

        {/* Mid Semester Card (Exam Banner) with Teacher Info & Mode Guru Card */}
        <View style={styles.examBanner}>
          {/* Top Row: Teacher Info & Mode Guru Badge */}
          <View style={styles.bannerHeaderRow}>
            <View style={styles.teacherInfoBox}>
              <Text style={styles.teacherRoleLabel}>GURU PENGAWAS</Text>
              <Text style={styles.teacherNameText}>{teacherName || 'Bpk. Rahmat, S.Pd.'}</Text>
            </View>

            <TouchableOpacity
              style={styles.modeGuruBadge}
              onPress={onSwitchRole}
              activeOpacity={onSwitchRole ? 0.75 : 1}
            >
              <View style={styles.modeGuruIconPod}>
                <ShieldCheck size={14} color="#1D4ED8" strokeWidth={2.4} />
              </View>
              <Text style={styles.modeGuruText}>Mode Guru</Text>
            </TouchableOpacity>
          </View>

          {/* Clean Divider */}
          <View style={styles.bannerDivider} />

          {/* Exam Details */}
          <View style={styles.bannerBody}>
            <Text style={styles.examTitle}>{currentExam.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.subjectPill}>
                <Text style={styles.subjectText}>{currentExam.subject}</Text>
              </View>
              <View style={styles.tokenPill}>
                <Text style={styles.tokenLabel}>TOKEN PIN:</Text>
                <Text style={styles.tokenValue}>{currentExam.token}</Text>
              </View>
            </View>
          </View>
        </View>

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
              <Text style={styles.timeBtnText}>5 Menit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => handleAddTimePrompt(10)}
              activeOpacity={0.75}
            >
              <Plus size={14} color={colors.primary} strokeWidth={2.8} />
              <Text style={styles.timeBtnText}>10 Menit</Text>
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

        {/* Filter Pills (Horizontal Scroll) */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
                Semua ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'working' && styles.filterPillActive]}
              onPress={() => setActiveFilter('working')}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === 'working' && styles.filterTextActive]}>
                Mengerjakan ({workingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'violation' && styles.filterPillActive]}
              onPress={() => setActiveFilter('violation')}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === 'violation' && styles.filterTextActive]}>
                Pelanggaran ({violationCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'submitted' && styles.filterPillActive]}
              onPress={() => setActiveFilter('submitted')}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === 'submitted' && styles.filterTextActive]}>
                Selesai ({submittedCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    backgroundColor: clayColors.canvas,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  examBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    marginBottom: 14,
    ...clayShadows.card,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teacherInfoBox: {
    flex: 1,
    marginRight: 10,
  },
  teacherRoleLabel: {
    fontFamily: typography.extraBold,
    fontSize: 10,
    color: '#2563EB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  teacherNameText: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  modeGuruBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderBottomWidth: 3,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  modeGuruIconPod: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGuruText: {
    fontFamily: typography.extraBold,
    fontSize: 11.5,
    color: '#1D4ED8',
    includeFontPadding: false,
  },
  bannerDivider: {
    height: 1.5,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  bannerBody: {
    gap: 8,
  },
  examTitle: {
    fontFamily: typography.extraBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  subjectPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tokenLabel: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#16A34A',
  },
  tokenValue: {
    fontFamily: typography.extraBold,
    fontSize: 12,
    color: '#15803D',
    letterSpacing: 0.5,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    ...clayShadows.badge,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  kpiIconWorking: {
    backgroundColor: '#EFF6FF',
  },
  kpiIconDanger: {
    backgroundColor: '#FFF1F2',
  },
  kpiIconSuccess: {
    backgroundColor: '#ECFDF5',
  },
  kpiValue: {
    fontFamily: typography.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  textDanger: {
    color: '#DC2626',
  },
  controlsBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    marginBottom: 14,
    ...clayShadows.badge,
  },
  controlsLabel: {
    fontFamily: typography.extraBold,
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
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#BFDBFE',
    borderRadius: 16,
    ...clayShadows.badge,
  },
  timeBtnText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#1D4ED8',
    includeFontPadding: false,
  },
  lockBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: clayColors.dangerBtnBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: clayColors.dangerBtnBorder,
    borderBottomWidth: 3.5,
    borderBottomColor: clayColors.dangerBtnBevel,
    ...clayShadows.btnDanger,
  },
  lockBtnText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#ffffff',
    includeFontPadding: false,
  },
  filterContainer: {
    marginHorizontal: -16,
    marginBottom: 14,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderBottomColor: '#0F172A',
  },
  filterText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
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
    gap: 12,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  studentNameBox: {
    flex: 1,
    marginRight: 10,
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
    backgroundColor: '#F1F5F9',
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
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  violationTagText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#BFDBFE',
  },
  actionPromptText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#1D4ED8',
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    marginTop: 10,
    ...clayShadows.card,
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
    color: '#2563EB',
  },
});
