import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import type { ViolationLogItem } from '../../types/exam';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
          <AlertTriangle size={16} color={isDanger ? '#DC2626' : '#D97706'} strokeWidth={2.4} />
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

      <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} activeOpacity={0.75}>
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
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    ...clayShadows.badge,
  },
  containerWarning: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FDE68A',
  },
  containerDanger: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FECDD3',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
  },
  iconWarning: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#FDE68A',
  },
  iconDanger: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#FECDD3',
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
    fontFamily: typography.extraBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  timestamp: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  message: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
});
