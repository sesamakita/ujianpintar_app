import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, clayColors, clayShadows, clayRadii } from '../../theme';

interface StatusBadgeProps {
  status: 'working' | 'submitted' | 'violation_flagged' | 'timed_out' | 'online' | 'offline' | 'Lulus' | 'Remedial';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  let label = status as string;
  let bg: string = '#F1F5F9';
  let bevel: string = '#CBD5E1';
  let textColor: string = '#475569';
  let dotColor: string = '#64748B';

  switch (status) {
    case 'working':
      label = 'Sedang Mengerjakan';
      bg = '#EFF6FF';
      bevel = '#BFDBFE';
      textColor = '#1E40AF';
      dotColor = '#2563EB';
      break;
    case 'submitted':
      label = 'Selesai';
      bg = '#ECFDF5';
      bevel = '#A7F3D0';
      textColor = '#065F46';
      dotColor = '#059669';
      break;
    case 'violation_flagged':
      label = 'Pelanggaran';
      bg = '#FFF1F2';
      bevel = '#FECDD3';
      textColor = '#9F1239';
      dotColor = '#DC2626';
      break;
    case 'timed_out':
      label = 'Waktu Habis';
      bg = '#FFFBEB';
      bevel = '#FDE68A';
      textColor = '#92400E';
      dotColor = '#D97706';
      break;
    case 'online':
      label = 'Online';
      bg = '#ECFDF5';
      bevel = '#A7F3D0';
      textColor = '#065F46';
      dotColor = '#10B981';
      break;
    case 'offline':
      label = 'Offline';
      bg = '#F1F5F9';
      bevel = '#CBD5E1';
      textColor = '#64748B';
      dotColor = '#94A3B8';
      break;
    case 'Lulus':
      label = 'LULUS KKM';
      bg = '#ECFDF5';
      bevel = '#A7F3D0';
      textColor = '#065F46';
      dotColor = '#059669';
      break;
    case 'Remedial':
      label = 'REMEDIAL';
      bg = '#FFF1F2';
      bevel = '#FECDD3';
      textColor = '#9F1239';
      dotColor = '#DC2626';
      break;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderBottomColor: bevel },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSm]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: clayRadii.badge,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    gap: 6,
    ...clayShadows.badge,
  },
  badgeSm: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderBottomWidth: 2.5,
    gap: 5,
  },
  dot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  text: {
    fontFamily: typography.bold,
    fontSize: 12,
  },
  textSm: {
    fontFamily: typography.bold,
    fontSize: 11,
  },
});
