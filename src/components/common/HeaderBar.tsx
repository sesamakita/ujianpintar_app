import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, User, RefreshCw } from 'lucide-react-native';
import { typography, colors, radii } from '../../theme';

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
            <ShieldCheck size={18} color={colors.textPrimary} strokeWidth={2.2} />
          ) : (
            <User size={18} color={colors.primary} strokeWidth={2.2} />
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
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} activeOpacity={0.7}>
            <RefreshCw size={15} color={colors.textMuted} />
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
    paddingVertical: 13,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarStudent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  avatarTeacher: {
    backgroundColor: colors.bgCardSubtle,
    borderColor: colors.borderDefault,
  },
  titleWrapper: {
    flex: 1,
    gap: 1.5,
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
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  roleSwitchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  roleStudent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  roleTeacher: {
    backgroundColor: colors.bgCardSubtle,
    borderColor: colors.borderDefault,
  },
  roleText: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
  },
  textStudent: {
    color: colors.primary,
  },
  textTeacher: {
    color: colors.textSecondary,
  },
});
