import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, colors, radii } from '../../theme';

interface StatusBadgeProps {
  status: 'working' | 'submitted' | 'violation_flagged' | 'timed_out' | 'online' | 'offline' | 'Lulus' | 'Remedial';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  let label = status as string;
  let bg: string = colors.bgCardSubtle;
  let textColor: string = colors.textSecondary;
  let dotColor: string = colors.textMuted;
  let borderColor: string = colors.borderDefault;

  switch (status) {
    case 'working':
      label = 'Sedang Mengerjakan';
      bg = colors.primaryLight;
      textColor = colors.primaryDark;
      dotColor = colors.primary;
      borderColor = colors.primaryBorder;
      break;
    case 'submitted':
      label = 'Selesai';
      bg = colors.successLight;
      textColor = colors.successText;
      dotColor = colors.success;
      borderColor = colors.successBorder;
      break;
    case 'violation_flagged':
      label = 'Pelanggaran';
      bg = colors.dangerLight;
      textColor = colors.dangerText;
      dotColor = colors.danger;
      borderColor = colors.dangerBorder;
      break;
    case 'timed_out':
      label = 'Waktu Habis';
      bg = colors.warningLight;
      textColor = colors.warningText;
      dotColor = colors.warning;
      borderColor = colors.warningBorder;
      break;
    case 'online':
      label = 'Online';
      bg = colors.successLight;
      textColor = colors.successText;
      dotColor = colors.success;
      borderColor = colors.successBorder;
      break;
    case 'offline':
      label = 'Offline';
      bg = colors.bgCardSubtle;
      textColor = colors.textMuted;
      dotColor = colors.textSubtle;
      borderColor = colors.borderLight;
      break;
    case 'Lulus':
      label = 'LULUS KKM';
      bg = colors.successLight;
      textColor = colors.successText;
      dotColor = colors.success;
      borderColor = colors.successBorder;
      break;
    case 'Remedial':
      label = 'REMEDIAL';
      bg = colors.dangerLight;
      textColor = colors.dangerText;
      dotColor = colors.danger;
      borderColor = colors.dangerBorder;
      break;
  }

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSm]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    gap: 6,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  textSm: {
    fontFamily: typography.semiBold,
    fontSize: 11,
  },
});
