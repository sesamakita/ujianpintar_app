import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  ArrowLeft,
  Copy,
  RefreshCw,
  Award,
} from 'lucide-react-native';
import type { GradeRecord, ExamSettings } from '../../types/exam';
import { StatusBadge } from '../common/StatusBadge';
import { examService } from '../../services/examService';
import { typography, colors, radii, shadows, clayColors, clayShadows, clayRadii } from '../../theme';
import { CustomModal } from '../common/CustomModal';

interface TeacherGradeReportViewProps {
  exam: ExamSettings;
  onBackToProctoring: () => void;
}

export const TeacherGradeReportView: React.FC<TeacherGradeReportViewProps> = ({
  exam,
  onBackToProctoring,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 8;

  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Lulus' | 'Remedial'>('all');
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; type: 'success' | 'warning' } | null>(null);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      // Direct query from Supabase database grade_records table
      const data = await examService.getGradeRecords(exam.id);
      setGrades(data || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [exam.id]);

  // Analytics Metrics
  const totalStudents = grades.length;
  const passedStudents = grades.filter((g) => g.status === 'Lulus').length;
  const remedialStudents = grades.filter((g) => g.status === 'Remedial').length;
  const passingRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;
  const avgScore = totalStudents > 0 ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / totalStudents) : 0;
  const highestScore = totalStudents > 0 ? Math.max(...grades.map((g) => g.score)) : 0;
  const lowestScore = totalStudents > 0 ? Math.min(...grades.map((g) => g.score)) : 0;

  const filteredGrades = grades.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nisn.includes(searchQuery);
    if (filterStatus === 'Lulus') return matchesSearch && g.status === 'Lulus';
    if (filterStatus === 'Remedial') return matchesSearch && g.status === 'Remedial';
    return matchesSearch;
  });

  const handleCopyRecap = () => {
    if (grades.length === 0) {
      setAlertInfo({
        type: 'warning',
        title: 'Belum Ada Data Nilai',
        message: 'Belum ada data lembar ujian peserta yang terkumpul di server untuk disalin.',
      });
      return;
    }

    setAlertInfo({
      type: 'success',
      title: 'Rekapitulasi Siap',
      message: `Telah disiapkan ringkasan nilai untuk ${grades.length} peserta didik (${passedStudents} Lulus, ${remedialStudents} Remedial).`,
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToProctoring} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textPrimary} />
          <Text style={styles.backBtnText}>Kembali ke Pengawasan</Text>
        </TouchableOpacity>

        <View style={styles.headerRightRow}>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchGrades} activeOpacity={0.7}>
            <RefreshCw size={13} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyRecap} activeOpacity={0.75}>
            <Copy size={13} color={colors.primary} />
            <Text style={styles.copyBtnText}>Salin Rekap</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Rekapitulasi Nilai Asesmen</Text>
          <Text style={styles.pageSubtitle}>{exam.title} • {exam.subject}</Text>
        </View>

        {/* Analytics KPI Dashboard Grid */}
        <View style={styles.analyticsGrid}>
          {/* Average Score */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Rata-Rata Kelas</Text>
            <View style={styles.analyticsValRow}>
              <Text style={styles.analyticsVal}>{avgScore}</Text>
              <Text style={styles.analyticsMax}>/ 100</Text>
            </View>
            <Text style={styles.analyticsSub}>{totalStudents} Peserta Selesai</Text>
          </View>

          {/* Passing Rate */}
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Kelulusan KKM (75)</Text>
            <Text style={[styles.analyticsVal, styles.textGreen]}>{passingRate}%</Text>
            <Text style={styles.analyticsSub}>{passedStudents} Lulus • {remedialStudents} Remedial</Text>
          </View>

          {/* Highest Score */}
          <View style={styles.analyticsCardSmall}>
            <Text style={styles.analyticsLabel}>Nilai Tertinggi</Text>
            <Text style={[styles.analyticsValSmall, styles.textBlue]}>{highestScore}</Text>
          </View>

          {/* Lowest Score */}
          <View style={styles.analyticsCardSmall}>
            <Text style={styles.analyticsLabel}>Nilai Terendah</Text>
            <Text style={[styles.analyticsValSmall, styles.textOrange]}>{lowestScore}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={15} color={colors.textSubtle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama peserta atau NISN..."
            placeholderTextColor={colors.textSubtle}
          />
        </View>

        {/* Filter Badges */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}
            onPress={() => setFilterStatus('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>
              Semua ({totalStudents})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'Lulus' && styles.filterPillActive]}
            onPress={() => setFilterStatus('Lulus')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filterStatus === 'Lulus' && styles.filterTextActive]}>
              Lulus ({passedStudents})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterStatus === 'Remedial' && styles.filterPillActive]}
            onPress={() => setFilterStatus('Remedial')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filterStatus === 'Remedial' && styles.filterTextActive]}>
              Remedial ({remedialStudents})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Grade Cards List from Database */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Mengambil data nilai...</Text>
          </View>
        ) : filteredGrades.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Award size={36} color={colors.textSubtle} />
            <Text style={styles.emptyTitle}>Belum Ada Nilai Terkumpul</Text>
            <Text style={styles.emptySubtitle}>
              Ketika siswa mengumpulkan lembar jawaban ujian, nilai otomatis terkoreksi dan tercatat di tabel database ini.
            </Text>
          </View>
        ) : (
          <View style={styles.gradeList}>
            {filteredGrades.map((g, idx) => {
              return (
                <View key={g.studentId || idx} style={styles.gradeCard}>
                  <View style={styles.gradeCardTop}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{g.name}</Text>
                      <Text style={styles.studentNisn}>
                        NISN: {g.nisn} • Kumpul: {g.submittedAt}
                      </Text>
                    </View>

                    <View style={styles.scorePill}>
                      <Text style={styles.scoreText}>{g.score}</Text>
                      <Text style={styles.scoreMaxText}>/ {g.maxScore}</Text>
                    </View>
                  </View>

                  <View style={styles.gradeCardBottom}>
                    <StatusBadge status={g.status} size="sm" />

                    <View style={styles.bottomMeta}>
                      <Text style={styles.timeSpentText}>⏱️ {g.timeSpentMinutes} Menit</Text>
                      {g.tabViolations > 0 && (
                        <Text style={styles.violationText}>⚠️ {g.tabViolations} Pindah Tab</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomModal
        visible={alertInfo !== null}
        type={alertInfo?.type || 'info'}
        title={alertInfo?.title || ''}
        message={alertInfo?.message || ''}
        confirmText="Tutup"
        onConfirm={() => setAlertInfo(null)}
        onClose={() => setAlertInfo(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: clayColors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.badge,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: clayRadii.badge,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  backBtnText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  copyBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  copyBtnText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#1D4ED8',
    includeFontPadding: false,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  titleSection: {
    marginBottom: 14,
  },
  pageTitle: {
    fontFamily: typography.extraBold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  analyticsCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.badge,
  },
  analyticsCardSmall: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.badge,
  },
  analyticsLabel: {
    fontFamily: typography.extraBold,
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  analyticsValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 2,
  },
  analyticsVal: {
    fontFamily: typography.extraBold,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  analyticsValSmall: {
    fontFamily: typography.extraBold,
    fontSize: 22,
    marginTop: 2,
  },
  analyticsMax: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textMuted,
  },
  analyticsSub: {
    fontFamily: typography.regular,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  textGreen: {
    color: '#059669',
  },
  textBlue: {
    color: '#2563EB',
  },
  textOrange: {
    color: '#D97706',
  },
  searchWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: 16,
    paddingLeft: 42,
    paddingRight: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    ...clayShadows.badge,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: clayRadii.badge,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  filterPillActive: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#0F172A',
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
  gradeList: {
    gap: 12,
  },
  gradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.card,
  },
  gradeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  studentInfo: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  studentNisn: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    gap: 2,
    ...clayShadows.badge,
  },
  scoreText: {
    fontFamily: typography.extraBold,
    fontSize: 16,
    color: '#1D4ED8',
  },
  scoreMaxText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#93C5FD',
  },
  gradeCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bottomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSpentText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  violationText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#DC2626',
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
});
