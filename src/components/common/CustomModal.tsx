import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Clock,
  Lock,
  X,
} from 'lucide-react-native';
import { typography, colors, radii, shadows } from '../../theme';

export type ModalType = 'confirm' | 'danger' | 'warning' | 'success' | 'info' | 'time' | 'lock';

export interface CustomModalProps {
  visible: boolean;
  type?: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}) => {
  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle size={24} color={colors.danger} strokeWidth={2.2} />,
          bg: colors.dangerLight,
          border: colors.dangerBorder,
          btnBg: colors.danger,
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={24} color={colors.warning} strokeWidth={2.2} />,
          bg: colors.warningLight,
          border: colors.warningBorder,
          btnBg: colors.warning,
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={24} color={colors.success} strokeWidth={2.2} />,
          bg: colors.successLight,
          border: colors.successBorder,
          btnBg: colors.success,
        };
      case 'time':
        return {
          icon: <Clock size={24} color={colors.primary} strokeWidth={2.2} />,
          bg: colors.primaryLight,
          border: colors.primaryBorder,
          btnBg: colors.primary,
        };
      case 'lock':
        return {
          icon: <Lock size={24} color={colors.danger} strokeWidth={2.2} />,
          bg: colors.dangerLight,
          border: colors.dangerBorder,
          btnBg: colors.danger,
        };
      case 'confirm':
        return {
          icon: <HelpCircle size={24} color={colors.primary} strokeWidth={2.2} />,
          bg: colors.primaryLight,
          border: colors.primaryBorder,
          btnBg: colors.primary,
        };
      case 'info':
      default:
        return {
          icon: <Info size={24} color={colors.primary} strokeWidth={2.2} />,
          bg: colors.primaryLight,
          border: colors.primaryBorder,
          btnBg: colors.primary,
        };
    }
  };

  const { icon, bg, border, btnBg } = getIconAndColors();
  const showCancel = !!cancelText || (type === 'confirm' || type === 'danger' || type === 'lock' || type === 'time');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button if needed */}
          {onClose && !showCancel && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Icon Box */}
          <View style={[styles.iconBox, { backgroundColor: bg, borderColor: border }]}>
            {icon}
          </View>

          {/* Text Info */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {showCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelBtnText}>{cancelText || 'Batal'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: btnBg },
                !showCancel && styles.confirmBtnFull,
              ]}
              onPress={onConfirm || handleClose}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    position: 'relative',
    ...shadows.modal,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.bgCardSubtle,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  confirmBtnFull: {
    flex: undefined,
    width: '100%',
  },
  confirmBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
