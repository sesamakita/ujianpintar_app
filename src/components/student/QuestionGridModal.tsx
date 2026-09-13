import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Grid, Check, Bookmark } from 'lucide-react-native';
import type { Question } from '../../types/exam';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(22, (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 28 : 16)) + 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: bottomPadding }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.gridIconBadge}>
                <Grid size={18} color="#2563EB" strokeWidth={2.4} />
              </View>
              <Text style={styles.title}>Navigasi Nomor Soal</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Legend Badges */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.answeredBox]} />
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

                  {isDoubt && (
                    <View style={styles.doubtBadgeIndicator}>
                      <Bookmark size={9} color="#ffffff" fill="#ffffff" />
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
              <Check size={18} color="#ffffff" strokeWidth={2.8} />
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    maxHeight: '75%',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 0,
    ...clayShadows.cardHover,
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
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  title: {
    fontFamily: typography.extraBold,
    fontSize: 16.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    marginBottom: 16,
    ...clayShadows.badge,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  answeredBox: {
    backgroundColor: '#10B981',
    borderBottomWidth: 2,
    borderBottomColor: '#047857',
  },
  doubtBox: {
    backgroundColor: '#D97706',
    borderBottomWidth: 2,
    borderBottomColor: '#92400E',
  },
  unansweredBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  legendText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  gridItem: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...clayShadows.badge,
  },
  itemUnanswered: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
  },
  textUnanswered: {
    fontFamily: typography.extraBold,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  itemAnswered: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 4.5,
    borderBottomColor: '#047857',
  },
  textAnswered: {
    fontFamily: typography.extraBold,
    color: '#ffffff',
    includeFontPadding: false,
  },
  itemDoubt: {
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 4.5,
    borderBottomColor: '#92400E',
  },
  textDoubt: {
    fontFamily: typography.extraBold,
    color: '#ffffff',
    includeFontPadding: false,
  },
  itemCurrent: {
    borderColor: '#2563EB',
    borderWidth: 2.8,
    transform: [{ scale: 1.06 }],
  },
  itemText: {
    fontSize: 15.5,
    includeFontPadding: false,
    textAlign: 'center',
  },
  doubtBadgeIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  submitGridBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    marginTop: 10,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  submitGridBtnText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
