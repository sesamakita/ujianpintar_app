import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import type { ViolationLogItem } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface LiveViolationTickerProps {
  logs: ViolationLogItem[];
  onDismiss: () => void;
}

export const LiveViolationTicker: React.FC<LiveViolationTickerProps> = ({ logs, onDismiss }) => {
  if (!logs || logs.length === 0) return null;

  const latest = logs[0];
  const isDanger = latest.severity === 'danger';

  return (
    <View style={[styles.container, isDanger ? styles.containerDanger : styles.containerWarning]}>
      <View style={styles.left}>
        <View style={[styles.iconBox, isDanger ? styles.iconDanger : styles.iconWarning]}>
          <AlertTriangle size={15} color={isDanger ? colors.danger : colors.warning} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.headerLine}>
            <Text style={styles.studentName}>{latest.studentName}</Text>
            <Text style={styles.timestamp}>{latest.timestamp}</Text>
          </View>
          <Text style={styles.message} numberOfLines={1}>
            {latest.message}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.7}>
        <X size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    ...shadows.card,
  },
  containerWarning: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  containerDanger: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWarning: {
    backgroundColor: colors.bgSurface,
  },
  iconDanger: {
    backgroundColor: colors.bgSurface,
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  timestamp: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  message: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.xs,
    backgroundColor: colors.bgSurface,
  },
});
