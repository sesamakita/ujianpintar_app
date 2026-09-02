import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { X, Grid, Check, Bookmark } from 'lucide-react-native';
import type { Question } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface QuestionGridModalProps {
  visible: boolean;
  onClose: () => void;
  questions: Question[];
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  shortAnswers: Record<number, string>;
  doubtAnswers: Record<number, boolean>;
  onSelectIndex: (index: number) => void;
  onSubmitExam?: () => void;
}

export const QuestionGridModal: React.FC<QuestionGridModalProps> = ({
  visible,
  onClose,
  questions,
  currentIndex,
  selectedAnswers,
  shortAnswers,
  doubtAnswers,
  onSelectIndex,
  onSubmitExam,
}) => {
  const answeredCount = Object.keys(selectedAnswers).length + Object.keys(shortAnswers).length;
  const doubtCount = Object.values(doubtAnswers).filter(Boolean).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.gridIconBadge}>
                <Grid size={17} color={colors.primary} />
              </View>
              <Text style={styles.title}>Navigasi Nomor Soal</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Legend Badges */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.answeredBox]}>
                <Check size={11} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={styles.legendText}>Dijawab ({answeredCount})</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.doubtBox]}>
                <Bookmark size={11} color="#ffffff" fill="#ffffff" />
              </View>
              <Text style={styles.legendText}>Ragu ({doubtCount})</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.unansweredBox]} />
              <Text style={styles.legendText}>Belum ({unansweredCount})</Text>
            </View>
          </View>

          {/* Grid of Numbers */}
          <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
            {questions.map((q, idx) => {
              const isCurrent = currentIndex === idx;
              const isDoubt = !!doubtAnswers[idx];
              const isAnswered = !!selectedAnswers[idx] || (!!shortAnswers[idx] && shortAnswers[idx].trim() !== '');

              let itemStyle: object = styles.itemUnanswered;
              let textStyle: object = styles.textUnanswered;

              if (isDoubt) {
                itemStyle = styles.itemDoubt;
                textStyle = styles.textDoubt;
              } else if (isAnswered) {
                itemStyle = styles.itemAnswered;
                textStyle = styles.textAnswered;
              }

              return (
                <TouchableOpacity
                  key={q.id || idx}
                  style={[
                    styles.gridItem,
                    itemStyle,
                    isCurrent && styles.itemCurrent,
                  ]}
                  onPress={() => {
                    onSelectIndex(idx);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.itemText, textStyle]}>
                    {idx + 1}
                  </Text>
                  
                  {isAnswered && !isDoubt && (
                    <View style={styles.answeredBadgeIndicator}>
                      <Check size={8} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}

                  {isDoubt && (
                    <View style={styles.doubtBadgeIndicator}>
                      <Bookmark size={8} color="#ffffff" fill="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quick Submit Button at bottom of grid modal */}
          {onSubmitExam && (
            <TouchableOpacity
              style={styles.submitGridBtn}
              onPress={() => {
                onClose();
                onSubmitExam();
              }}
              activeOpacity={0.85}
            >
              <Check size={16} color="#ffffff" strokeWidth={2.8} />
              <Text style={styles.submitGridBtnText}>Kumpulkan Lembar Jawaban</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 20,
    maxHeight: '75%',
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gridIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bgApp,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 18,
    height: 18,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answeredBox: {
    backgroundColor: colors.success,
  },
  doubtBox: {
    backgroundColor: colors.warning,
  },
  unansweredBox: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  legendText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  gridItem: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.card,
  },
  itemUnanswered: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  textUnanswered: {
    fontFamily: typography.bold,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  itemAnswered: {
    backgroundColor: colors.success,
    borderWidth: 0,
  },
  textAnswered: {
    fontFamily: typography.bold,
    color: '#ffffff',
    includeFontPadding: false,
  },
  itemDoubt: {
    backgroundColor: colors.warning,
    borderWidth: 0,
  },
  textDoubt: {
    fontFamily: typography.bold,
    color: '#ffffff',
    includeFontPadding: false,
  },
  itemCurrent: {
    borderWidth: 2.5,
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  itemText: {
    fontSize: 15,
    includeFontPadding: false,
    textAlign: 'center',
  },
  answeredBadgeIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  doubtBadgeIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  submitGridBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: radii.md,
    marginTop: 10,
    ...shadows.card,
  },
  submitGridBtnText: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
