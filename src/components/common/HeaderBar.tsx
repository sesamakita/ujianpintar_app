import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, User, RefreshCw } from 'lucide-react-native';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  currentRole: 'student' | 'teacher';
  onSwitchRole: () => void;
  onRefresh?: () => void;
  showRoleSwitch?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title = 'UjianPintar Mobile',
  subtitle,
  currentRole,
  onSwitchRole,
  onRefresh,
  showRoleSwitch = true,
}) => {
  const isTeacher = currentRole === 'teacher';

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={[styles.avatarBox, isTeacher ? styles.avatarTeacher : styles.avatarStudent]}>
          {isTeacher ? (
            <ShieldCheck size={19} color="#1E293B" strokeWidth={2.4} />
          ) : (
            <User size={19} color="#2563EB" strokeWidth={2.4} />
          )}
        </View>
        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {onRefresh && (
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} activeOpacity={0.75}>
            <RefreshCw size={15} color={colors.textSecondary} strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {showRoleSwitch && (
          <TouchableOpacity
            style={[styles.roleSwitchBtn, isTeacher ? styles.roleTeacher : styles.roleStudent]}
            onPress={onSwitchRole}
            activeOpacity={0.75}
          >
            <Text style={[styles.roleText, isTeacher ? styles.textTeacher : styles.textStudent]}>
              {isTeacher ? 'Mode Guru' : 'Mode Siswa'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: clayColors.whiteBevel,
    zIndex: 10,
    ...clayShadows.badge,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: clayRadii.pod,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    ...clayShadows.iconPod,
  },
  avatarStudent: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  avatarTeacher: {
    backgroundColor: '#F1F5F9',
    borderBottomColor: '#CBD5E1',
  },
  titleWrapper: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: clayRadii.pod,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  roleSwitchBtn: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    ...clayShadows.badge,
  },
  roleStudent: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  roleTeacher: {
    backgroundColor: '#F1F5F9',
    borderBottomColor: '#CBD5E1',
  },
  roleText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
  },
  textStudent: {
    color: '#1D4ED8',
  },
  textTeacher: {
    color: '#334155',
  },
});
