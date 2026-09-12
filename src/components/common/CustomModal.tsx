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
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
          icon: <AlertTriangle size={26} color="#DC2626" strokeWidth={2.4} />,
          bg: '#FFF1F2',
          bevel: '#FECDD3',
          btnBg: clayColors.dangerBtnBg,
          btnBevel: clayColors.dangerBtnBevel,
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={26} color="#D97706" strokeWidth={2.4} />,
          bg: '#FFFBEB',
          bevel: '#FDE68A',
          btnBg: clayColors.warningBtnBg,
          btnBevel: clayColors.warningBtnBevel,
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={26} color="#059669" strokeWidth={2.4} />,
          bg: '#ECFDF5',
          bevel: '#A7F3D0',
          btnBg: clayColors.studentBtnBg,
          btnBevel: clayColors.studentBtnBevel,
        };
      case 'time':
        return {
          icon: <Clock size={26} color="#2563EB" strokeWidth={2.4} />,
          bg: '#EFF6FF',
          bevel: '#BFDBFE',
          btnBg: clayColors.primaryBtnBg,
          btnBevel: clayColors.primaryBtnBevel,
        };
      case 'lock':
        return {
          icon: <Lock size={26} color="#DC2626" strokeWidth={2.4} />,
          bg: '#FFF1F2',
          bevel: '#FECDD3',
          btnBg: clayColors.dangerBtnBg,
          btnBevel: clayColors.dangerBtnBevel,
        };
      case 'confirm':
        return {
          icon: <HelpCircle size={26} color="#2563EB" strokeWidth={2.4} />,
          bg: '#EFF6FF',
          bevel: '#BFDBFE',
          btnBg: clayColors.primaryBtnBg,
          btnBevel: clayColors.primaryBtnBevel,
        };
      case 'info':
      default:
        return {
          icon: <Info size={26} color="#2563EB" strokeWidth={2.4} />,
          bg: '#EFF6FF',
          bevel: '#BFDBFE',
          btnBg: clayColors.primaryBtnBg,
          btnBevel: clayColors.primaryBtnBevel,
        };
    }
  };

  const { icon, bg, bevel, btnBg, btnBevel } = getIconAndColors();
  const showCancel = !!cancelText || (type === 'confirm' || type === 'danger' || type === 'lock' || type === 'time');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          {onClose && !showCancel && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* 3D Icon Pod */}
          <View style={[styles.iconBox, { backgroundColor: bg, borderBottomColor: bevel }]}>
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
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{cancelText || 'Batal'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: btnBg, borderBottomColor: btnBevel },
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    position: 'relative',
    ...clayShadows.cardHover,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
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
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 22,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 2,
    ...clayShadows.iconPod,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 17.5,
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
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: clayRadii.button,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  cancelBtnText: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: clayRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 4.5,
    ...clayShadows.btnPrimary,
  },
  confirmBtnFull: {
    flex: undefined,
    width: '100%',
  },
  confirmBtnText: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: '#ffffff',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
