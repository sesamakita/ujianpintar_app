import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  MessageSquare,
  School,
  User,
  ShieldCheck,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  XCircle,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { StudentPublicExamSummary, StudentAnswerDetailItem } from '../../types/exam';
import { examService } from '../../services/examService';
import { generateSkhuHtml } from '../../lib/pdfGenerator';
import { MathRenderer } from '../common/MathRenderer';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

interface StudentResultModalProps {
  visible: boolean;
  onClose: () => void;
  result: StudentPublicExamSummary | null;
}

export const StudentResultModal: React.FC<StudentResultModalProps> = ({
  visible,
  onClose,
  result,
}) => {
  if (!result) return null;

  const safeBreakdown = result.breakdown || {
    objectiveScore: result.score || 0,
    objectiveMax: result.maxScore || 100,
    shortAnswerScore: 0,
    shortAnswerMax: 0,
    essayScore: 0,
    essayMax: 0,
    hasPendingEssays: false,
  };

  const isPassed = result.status === 'Lulus' || (result.percentage >= 75 && !safeBreakdown.hasPendingEssays);
  const isPendingReview = result.status === 'Menunggu Koreksi' || (safeBreakdown.hasPendingEssays && !isPassed);

  // Answers detail states
  const [isAnswersOpen, setIsAnswersOpen] = useState<boolean>(false);
  const [answersDetail, setAnswersDetail] = useState<{
    studentInfo: { name: string; nisn: string; className: string; score?: number };
    items: StudentAnswerDetailItem[];
    summary: { totalQuestions: number; answeredCount: number; correctCount: number; wrongCount: number; doubtCount: number };
  } | null>(null);
  const [isAnswersLoading, setIsAnswersLoading] = useState<boolean>(false);

  // PDF export loading state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Load detailed answers item-by-item
  const handleToggleAnswersDetail = async () => {
    if (isAnswersOpen) {
      setIsAnswersOpen(false);
      return;
    }

    setIsAnswersOpen(true);
    if (!answersDetail) {
      setIsAnswersLoading(true);
      try {
        const details = await examService.getStudentAnswersDetail(
          result.examId,
          result.nisn,
          result.sessionId
        );
        setAnswersDetail(details);
      } catch (err) {
        console.warn('Load student answers detail error:', err);
      } finally {
        setIsAnswersLoading(false);
      }
    }
  };

  // Download / Share official SKHU PDF
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;

    try {
      setIsGeneratingPdf(true);

      // Ensure answers details are retrieved for complete SKHU paper
      let currentDetails = answersDetail;
      if (!currentDetails) {
        try {
          currentDetails = await examService.getStudentAnswersDetail(
            result.examId,
            result.nisn,
            result.sessionId
          );
          setAnswersDetail(currentDetails);
        } catch {
          // ignore error and proceed with basic summary
        }
      }

      // Generate HTML string
      const htmlContent = generateSkhuHtml(result, currentDetails?.items || []);

      let shared = false;
      try {
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false,
          });
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `Unduh SKHU - ${result.studentName}`,
          });
          shared = true;
        }
      } catch (shareErr) {
        console.warn('Share error, falling back to print dialog:', shareErr);
      }

      if (!shared) {
        // Fallback to system print dialog (Android print spooler allows "Simpan sebagai PDF")
        await Print.printAsync({ html: htmlContent });
      }
    } catch (err: any) {
      console.warn('PDF generation error:', err);
      Alert.alert(
        'Gagal Mengunduh PDF',
        err?.message || 'Terjadi kendala saat memproses pembuatan dokumen PDF SKHU.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Award size={20} color="#2563EB" strokeWidth={2.4} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Rapor Hasil Ujian</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {result.subject} • {result.className}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollInner}
          >
            {/* Student Info Pill */}
            <View style={styles.studentBadge}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {result.studentName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {result.studentName}
                </Text>
                <Text style={styles.studentMeta}>
                  NISN: {result.nisn} • {result.schoolName}{result.schoolNpsn ? ` (NPSN: ${result.schoolNpsn})` : ''}
                </Text>
              </View>
            </View>

            {/* Score Hero Card */}
            <View style={styles.scoreHero}>
              <Text style={styles.examTitleText}>{result.examTitle}</Text>
              <View style={styles.scoreRow}>
                <View
                  style={[
                    styles.scoreBox,
                    isPassed
                      ? styles.scoreBoxPassed
                      : isPendingReview
                      ? styles.scoreBoxPending
                      : styles.scoreBoxRemedial,
                  ]}
                >
                  <Text style={styles.scoreBig}>{result.percentage}</Text>
                  <Text style={styles.scoreScale}>/ 100</Text>
                </View>

                <View style={styles.scoreDetails}>
                  <View style={styles.scoreDetailRow}>
                    <Text style={styles.scoreDetailLabel}>Skor Perolehan:</Text>
                    <Text style={styles.scoreDetailVal}>
                      {result.score} / {result.maxScore} Poin
                    </Text>
                  </View>
                  <View style={styles.scoreDetailRow}>
                    <Text style={styles.scoreDetailLabel}>KKTP / KKM:</Text>
                    <Text style={styles.scoreDetailVal}>75.00</Text>
                  </View>
                  <View style={styles.scoreDetailRow}>
                    <Text style={styles.scoreDetailLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusPillSmall,
                        isPassed
                          ? styles.pillPassed
                          : isPendingReview
                          ? styles.pillPending
                          : styles.pillRemedial,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTextSmall,
                          isPassed
                            ? styles.textPassed
                            : isPendingReview
                            ? styles.textPillPending
                            : styles.textRemedial,
                        ]}
                      >
                        {isPassed
                          ? 'TUNTAS (LULUS)'
                          : isPendingReview
                          ? 'MENUNGGU KOREKSI'
                          : 'REMEDIAL'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Button: Download PDF SKHU */}
              <TouchableOpacity
                style={styles.downloadPdfBtn}
                onPress={handleDownloadPdf}
                disabled={isGeneratingPdf}
                activeOpacity={0.85}
              >
                {isGeneratingPdf ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.downloadPdfText}>Membuat File PDF SKHU...</Text>
                  </>
                ) : (
                  <>
                    <Download size={15} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.downloadPdfText}>Unduh Rapor / SKHU (PDF)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* 3 Pillars Breakdown */}
            <Text style={styles.sectionTitle}>Rincian Perolehan Nilai</Text>
            <View style={styles.breakdownGrid}>
              {/* 1. PG & B/S */}
              <View style={styles.breakdownCard}>
                <View style={[styles.typeBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#1D4ED8' }]}>PG</Text>
                </View>
                <Text style={styles.breakdownLabel}>Pilihan Ganda</Text>
                <Text style={styles.breakdownScore}>
                  {safeBreakdown.objectiveScore}
                  <Text style={styles.breakdownMax}> / {safeBreakdown.objectiveMax}</Text>
                </Text>
                <Text style={styles.breakdownStatus}>✓ Otomatis</Text>
              </View>

              {/* 2. Isian Singkat */}
              <View style={styles.breakdownCard}>
                <View style={[styles.typeBadge, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#4338CA' }]}>IS</Text>
                </View>
                <Text style={styles.breakdownLabel}>Isian Singkat</Text>
                <Text style={styles.breakdownScore}>
                  {safeBreakdown.shortAnswerScore}
                  <Text style={styles.breakdownMax}> / {safeBreakdown.shortAnswerMax}</Text>
                </Text>
                <Text style={styles.breakdownStatus}>✓ Kata Kunci</Text>
              </View>

              {/* 3. Soal Uraian */}
              <View style={styles.breakdownCard}>
                <View style={[styles.typeBadge, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#7E22CE' }]}>ES</Text>
                </View>
                <Text style={styles.breakdownLabel}>Uraian / Esai</Text>
                <Text style={styles.breakdownScore}>
                  {safeBreakdown.essayScore}
                  <Text style={styles.breakdownMax}> / {safeBreakdown.essayMax}</Text>
                </Text>
                <Text
                  style={[
                    styles.breakdownStatus,
                    { color: safeBreakdown.hasPendingEssays ? '#D97706' : '#7E22CE' },
                  ]}
                >
                  {safeBreakdown.hasPendingEssays ? '⏳ Menunggu' : '✓ Dinilai Guru'}
                </Text>
              </View>
            </View>

            {/* Teacher Feedback on Essays (if any) */}
            {result.hasEssayFeedback && result.essayFeedbacks && (
              <View style={styles.feedbackContainer}>
                <View style={styles.feedbackHeader}>
                  <Sparkles size={16} color="#7E22CE" strokeWidth={2.4} />
                  <Text style={styles.feedbackTitle}>Catatan & Masukan Guru</Text>
                </View>
                {result.essayFeedbacks.map((fb, idx) => (
                  <View key={idx} style={styles.feedbackItem}>
                    <View style={styles.feedbackItemHeader}>
                      <Text style={styles.feedbackQNum}>Soal Uraian #{fb.questionNumber}</Text>
                      <Text style={styles.feedbackQScore}>
                        {fb.scoreEarned} / {fb.maxPoints} Poin
                      </Text>
                    </View>
                    <Text style={styles.feedbackText}>"{fb.feedback}"</Text>
                  </View>
                ))}
              </View>
            )}

            {/* SECTION: DETAIL LEMBAR JAWABAN (Question-by-Question Review) */}
            <View style={styles.detailAnswersSection}>
              <TouchableOpacity
                style={styles.toggleDetailBtn}
                onPress={handleToggleAnswersDetail}
                activeOpacity={0.8}
              >
                <View style={styles.toggleDetailLeft}>
                  <BookOpen size={16} color="#2563EB" strokeWidth={2.4} />
                  <Text style={styles.toggleDetailTitle}>
                    {isAnswersOpen
                      ? 'Sembunyikan Lembar Jawaban'
                      : 'Buka Rincian Lembar Jawaban Lengkap'}
                  </Text>
                </View>
                {isAnswersOpen ? (
                  <ChevronUp size={16} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {isAnswersOpen && (
                <View style={styles.detailContentWrap}>
                  {isAnswersLoading ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.loadingText}>Memuat butir soal dan jawaban...</Text>
                    </View>
                  ) : answersDetail && answersDetail.items.length > 0 ? (
                    <View style={styles.answersListWrap}>
                      {/* Summary Stats Row */}
                      <View style={styles.summaryStatsRow}>
                        <View style={styles.statPill}>
                          <Text style={styles.statLabel}>Total Butir:</Text>
                          <Text style={styles.statVal}>{answersDetail.summary.totalQuestions}</Text>
                        </View>
                        <View style={[styles.statPill, { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' }]}>
                          <Text style={[styles.statLabel, { color: '#047857' }]}>Benar:</Text>
                          <Text style={[styles.statVal, { color: '#047857' }]}>
                            {answersDetail.summary.correctCount}
                          </Text>
                        </View>
                        <View style={[styles.statPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                          <Text style={[styles.statLabel, { color: '#B91C1C' }]}>Salah:</Text>
                          <Text style={[styles.statVal, { color: '#B91C1C' }]}>
                            {answersDetail.summary.wrongCount}
                          </Text>
                        </View>
                      </View>

                      {/* Items List */}
                      {answersDetail.items.map((item, idx) => {
                        const isEssay = item.type === 'essay';
                        const isCorrect = item.isCorrect;
                        const isAnswered = !!(
                          item.selectedOptionId ||
                          item.selectedOptionLabel ||
                          item.selectedOptionText ||
                          (item.answerText && item.answerText.trim().length > 0)
                        );

                        return (
                          <View key={item.questionId || idx} style={styles.questionItemCard}>
                            {/* Card Header */}
                            <View style={styles.qCardHeader}>
                              <View style={styles.qNumBadge}>
                                <Text style={styles.qNumText}>No. {item.number}</Text>
                                <Text style={styles.qTypeMini}>
                                  {item.type === 'multiple_choice'
                                    ? 'Pilihan Ganda'
                                    : item.type === 'short_answer'
                                    ? 'Isian Singkat'
                                    : 'Uraian'}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.qStatusBadge,
                                  isEssay
                                    ? item.isGraded
                                      ? styles.statusGraded
                                      : styles.statusPending
                                    : isCorrect
                                    ? styles.statusCorrect
                                    : !isAnswered
                                    ? styles.statusUnanswered
                                    : styles.statusWrong,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.qStatusText,
                                    isEssay
                                      ? item.isGraded
                                        ? styles.textGraded
                                        : styles.textPending
                                      : isCorrect
                                      ? styles.textCorrect
                                      : !isAnswered
                                      ? styles.textUnanswered
                                      : styles.textWrong,
                                  ]}
                                >
                                  {isEssay
                                    ? item.isGraded
                                      ? `✓ Dinilai: ${item.pointsEarned}/${item.maxPoints}`
                                      : '⏳ Menunggu Guru'
                                    : isCorrect
                                    ? `✓ Benar (${item.pointsEarned}/${item.maxPoints})`
                                    : !isAnswered
                                    ? `✕ Tidak Dijawab (0/${item.maxPoints})`
                                    : `✕ Salah (0/${item.maxPoints})`}
                                </Text>
                              </View>
                            </View>

                            {/* Question Text & Formula via MathRenderer */}
                            <MathRenderer
                              text={item.questionText || 'Pertanyaan tidak tersedia.'}
                              fontSize={14.5}
                              color={colors.textPrimary}
                              fontWeight="600"
                            />
                            {item.latexFormula ? (
                              <View style={styles.latexCard}>
                                <MathRenderer math={item.latexFormula} block fontSize={14} color="#1E293B" />
                              </View>
                            ) : null}

                            {/* Image if question has illustration */}
                            {item.imageUrl ? (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.questionImage}
                                resizeMode="contain"
                              />
                            ) : null}

                            {/* Student Answer */}
                            <View
                              style={[
                                styles.answerBox,
                                !isAnswered
                                  ? styles.answerBoxUnanswered
                                  : isCorrect || isEssay
                                  ? styles.answerBoxCorrect
                                  : styles.answerBoxWrong,
                              ]}
                            >
                              <View style={styles.answerBoxHeader}>
                                <Text style={styles.answerLabel}>Jawaban Anda:</Text>
                                <View
                                  style={[
                                    styles.miniBadge,
                                    !isAnswered
                                      ? styles.miniBadgeUnanswered
                                      : isCorrect
                                      ? styles.miniBadgeCorrect
                                      : styles.miniBadgeWrong,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniBadgeText,
                                      !isAnswered
                                        ? styles.miniBadgeTextUnanswered
                                        : isCorrect
                                        ? styles.miniBadgeTextCorrect
                                        : styles.miniBadgeTextWrong,
                                    ]}
                                  >
                                    {!isAnswered
                                      ? '✕ Tidak Dijawab'
                                      : isEssay
                                      ? item.isGraded
                                        ? `✓ Dinilai (${item.pointsEarned}/${item.maxPoints})`
                                        : '⏳ Menunggu'
                                      : isCorrect
                                      ? '✓ Benar'
                                      : '✕ Salah'}
                                  </Text>
                                </View>
                              </View>

                              {item.type === 'multiple_choice' ? (
                                isAnswered ? (
                                  <View style={styles.optionRow}>
                                    <View
                                      style={[
                                        styles.optPill,
                                        isCorrect ? styles.optPillCorrect : styles.optPillWrong,
                                      ]}
                                    >
                                      <Text style={styles.optPillText}>
                                        {item.selectedOptionLabel || '-'}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <MathRenderer
                                        text={item.selectedOptionText || ''}
                                        fontSize={13.5}
                                        color={isCorrect ? '#047857' : '#B91C1C'}
                                        fontWeight="600"
                                        isOption
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <Text style={styles.unansweredText}>Tidak dijawab</Text>
                                )
                              ) : isAnswered ? (
                                <MathRenderer
                                  text={item.answerText || ''}
                                  fontSize={13.5}
                                  color={isCorrect || isEssay ? '#047857' : '#B91C1C'}
                                  fontWeight="600"
                                />
                              ) : (
                                <Text style={styles.unansweredText}>Tidak dijawab</Text>
                              )}
                            </View>

                            {/* Correct Answer / Key */}
                            {(!isCorrect || isEssay || item.type === 'short_answer') && (
                              <View style={styles.keyBox}>
                                <Text style={styles.keyLabel}>
                                  {isEssay ? 'Kunci / Kriteria Jawaban Guru:' : 'Kunci Jawaban Benar:'}
                                </Text>
                                {item.type === 'multiple_choice' ? (
                                  <View style={styles.optionRow}>
                                    <View style={[styles.optPill, styles.optPillKey]}>
                                      <Text style={styles.optPillText}>
                                        {item.correctOptionLabel || '-'}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <MathRenderer
                                        text={
                                          item.options.find(
                                            (o) => o.id === item.correctOptionId || o.label === item.correctOptionLabel
                                          )?.text || item.correctAnswerText || ''
                                        }
                                        fontSize={13.5}
                                        color="#1D4ED8"
                                        fontWeight="600"
                                        isOption
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <MathRenderer
                                    text={item.correctAnswerText || '-'}
                                    fontSize={13.5}
                                    color="#1D4ED8"
                                    fontWeight="600"
                                  />
                                )}
                              </View>
                            )}

                            {/* Teacher Feedback per question */}
                            {item.teacherFeedback ? (
                              <View style={styles.itemFeedbackBox}>
                                <Text style={styles.itemFeedbackLabel}>Catatan Guru:</Text>
                                <Text style={styles.itemFeedbackText}>"{item.teacherFeedback}"</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptyDetailText}>
                      Tidak ditemukan rekaman butir lembar jawaban untuk sesi ini.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Verification Footer Stamp */}
            <View style={styles.verifyStamp}>
              <ShieldCheck size={18} color="#059669" strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>Dokumen Asesmen Terverifikasi</Text>
                <Text style={styles.verifyDesc}>
                  Guru Pengampu: {result.teacherName}{result.teacherNip ? ` (NIP. ${result.teacherNip})` : ''} • Tanggal: {result.submittedAt}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.closeFooterBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.closeFooterBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.bgCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    maxHeight: 560,
  },
  scrollInner: {
    padding: 20,
    gap: 16,
  },
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontFamily: typography.extraBold,
    color: '#ffffff',
    fontSize: 14,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  studentMeta: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  scoreHero: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 12,
  },
  examTitleText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoxPassed: {
    backgroundColor: '#059669',
  },
  scoreBoxPending: {
    backgroundColor: '#D97706',
  },
  scoreBoxRemedial: {
    backgroundColor: '#E11D48',
  },
  scoreBig: {
    fontFamily: typography.extraBold,
    fontSize: 32,
    color: '#ffffff',
    lineHeight: 36,
  },
  scoreScale: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  scoreDetails: {
    flex: 1,
    gap: 6,
  },
  scoreDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreDetailLabel: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  scoreDetailVal: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  statusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillPassed: {
    backgroundColor: '#ECFDF5',
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillRemedial: {
    backgroundColor: '#FFE4E6',
  },
  statusTextSmall: {
    fontFamily: typography.extraBold,
    fontSize: 10,
  },
  textPassed: {
    color: '#059669',
  },
  textPillPending: {
    color: '#B45309',
  },
  textRemedial: {
    color: '#BE123C',
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadPdfText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  breakdownCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 4,
  },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typeBadgeText: {
    fontFamily: typography.extraBold,
    fontSize: 10,
  },
  breakdownLabel: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  breakdownScore: {
    fontFamily: typography.extraBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  breakdownMax: {
    fontFamily: typography.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  breakdownStatus: {
    fontFamily: typography.medium,
    fontSize: 9,
    color: '#059669',
    marginTop: 2,
  },
  feedbackContainer: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTitle: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#6B21A8',
  },
  feedbackItem: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    gap: 4,
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackQNum: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#7E22CE',
  },
  feedbackQScore: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.textMuted,
  },
  feedbackText: {
    fontFamily: typography.medium,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  detailAnswersSection: {
    gap: 10,
  },
  toggleDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  toggleDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleDetailTitle: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  detailContentWrap: {
    marginTop: 4,
    gap: 12,
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  answersListWrap: {
    gap: 12,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontFamily: typography.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  statVal: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  questionItemCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  qCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qNumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qNumText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  qTypeMini: {
    fontFamily: typography.medium,
    fontSize: 9,
    color: colors.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusCorrect: {
    backgroundColor: '#ECFDF5',
  },
  statusWrong: {
    backgroundColor: '#FEF2F2',
  },
  statusUnanswered: {
    backgroundColor: '#F1F5F9',
  },
  statusGraded: {
    backgroundColor: '#FAF5FF',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  qStatusText: {
    fontFamily: typography.bold,
    fontSize: 10,
  },
  textCorrect: {
    color: '#059669',
  },
  textWrong: {
    color: '#DC2626',
  },
  textUnanswered: {
    color: '#64748B',
  },
  textGraded: {
    color: '#7E22CE',
  },
  textPending: {
    color: '#D97706',
  },
  qText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  latexCard: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  questionImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 6,
  },
  answerBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 4,
    marginTop: 4,
  },
  answerBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  answerBoxCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  answerBoxWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  answerBoxUnanswered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeCorrect: {
    backgroundColor: '#DCFCE7',
  },
  miniBadgeWrong: {
    backgroundColor: '#FEE2E2',
  },
  miniBadgeUnanswered: {
    backgroundColor: '#E2E8F0',
  },
  miniBadgeText: {
    fontFamily: typography.bold,
    fontSize: 9.5,
  },
  miniBadgeTextCorrect: {
    color: '#15803D',
  },
  miniBadgeTextWrong: {
    color: '#B91C1C',
  },
  miniBadgeTextUnanswered: {
    color: '#64748B',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  optPill: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
  },
  optPillCorrect: {
    backgroundColor: '#059669',
  },
  optPillWrong: {
    backgroundColor: '#DC2626',
  },
  optPillKey: {
    backgroundColor: '#2563EB',
  },
  optPillText: {
    fontFamily: typography.extraBold,
    fontSize: 11,
    color: '#ffffff',
  },
  unansweredText: {
    fontFamily: typography.medium,
    fontStyle: 'italic',
    fontSize: 12,
    color: '#94A3B8',
  },
  answerLabel: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  answerText: {
    fontFamily: typography.bold,
    fontSize: 12,
  },
  answerCorrectText: {
    color: '#059669',
  },
  answerWrongText: {
    color: '#DC2626',
  },
  keyBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
    marginTop: 2,
  },
  keyLabel: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  keyText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#1E40AF',
  },
  itemFeedbackBox: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 2,
  },
  itemFeedbackLabel: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#7E22CE',
  },
  itemFeedbackText: {
    fontFamily: typography.medium,
    fontStyle: 'italic',
    fontSize: 11,
    color: '#6B21A8',
  },
  emptyDetailText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  verifyStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifyTitle: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#166534',
  },
  verifyDesc: {
    fontFamily: typography.medium,
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeFooterBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeFooterBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13,
  },
});
