import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react-native';
import {
  clayColors,
  clayShadows,
  clayRadii,
  colors,
  typography,
} from '../../theme';
import type { AppUpdateInfo } from '../../services/updateService';

interface UpdateAppModalProps {
  visible: boolean;
  updateInfo: AppUpdateInfo | null;
  onClose: () => void;
}

export const UpdateAppModal: React.FC<UpdateAppModalProps> = ({
  visible,
  updateInfo,
  onClose,
}) => {
  const [isOpeningUrl, setIsOpeningUrl] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!visible || !updateInfo) {
    return null;
  }

  const handleDownload = async () => {
    try {
      setIsOpeningUrl(true);
      const supported = await Linking.canOpenURL(updateInfo.apkUrl);
      if (supported) {
        await Linking.openURL(updateInfo.apkUrl);
        setDownloadStarted(true);
      } else {
        await Linking.openURL(updateInfo.apkUrl);
        setDownloadStarted(true);
      }
    } catch (err) {
      console.warn('Gagal membuka URL APK:', err);
    } finally {
      setIsOpeningUrl(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!updateInfo.isForceUpdate) {
          onClose();
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Close button (only if not forced) */}
          {!updateInfo.isForceUpdate && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#64748B" strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          {/* Icon Pod Clay */}
          <View style={styles.iconPodContainer}>
            <View style={styles.iconPod}>
              <DownloadCloud size={28} color="#047857" strokeWidth={2.4} />
            </View>
            <View style={styles.badgePod}>
              <Sparkles size={11} color="#4338CA" strokeWidth={2.5} />
              <Text style={styles.badgePodText}>UPDATE BARU</Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.modalTitle}>{updateInfo.title}</Text>
          <Text style={styles.modalSubtitle}>
            Versi baru aplikasi Ujian Pintar telah tersedia untuk perangkat Anda.
          </Text>

          {/* Version Comparison Pill */}
          <View style={styles.versionCompareRow}>
            <View style={styles.versionChipCurrent}>
              <Text style={styles.versionChipLabel}>Saat Ini</Text>
              <Text style={styles.versionChipValue}>v{updateInfo.currentVersion}</Text>
            </View>
            <View style={styles.versionArrowCircle}>
              <ArrowRight size={14} color="#64748B" strokeWidth={2.5} />
            </View>
            <View style={styles.versionChipNew}>
              <Text style={styles.versionChipNewLabel}>Terbaru</Text>
              <Text style={styles.versionChipNewValue}>v{updateInfo.latestVersion}</Text>
            </View>
          </View>

          {/* Release Notes */}
          {updateInfo.releaseNotes.length > 0 && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesHeader}>Apa yang Baru:</Text>
              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {updateInfo.releaseNotes.map((note, index) => (
                  <View key={index} style={styles.noteItemRow}>
                    <CheckCircle2 size={15} color="#10B981" strokeWidth={2.5} style={styles.noteIcon} />
                    <Text style={styles.noteItemText}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Force Update Warning Notice */}
          {updateInfo.isForceUpdate && (
            <View style={styles.forceUpdateNotice}>
              <AlertTriangle size={16} color="#B45309" strokeWidth={2.5} />
              <Text style={styles.forceUpdateText}>
                Pembaruan ini wajib dipasang sebelum melanjutkan sesi asesmen demi kestabilan & integritas ujian.
              </Text>
            </View>
          )}

          {/* Download Guide Notice after clicking update */}
          {downloadStarted && (
            <View style={styles.downloadSuccessNotice}>
              <CheckCircle2 size={16} color="#047857" strokeWidth={2.5} />
              <Text style={styles.downloadSuccessText}>
                File APK sedang diunduh di browser HP Anda. Buka notifikasi unduhan untuk menginstal pembaruan.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnDownload}
              onPress={handleDownload}
              disabled={isOpeningUrl}
              activeOpacity={0.85}
            >
              {isOpeningUrl ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ExternalLink size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.btnDownloadText}>
                    {downloadStarted ? 'Unduh Ulang APK' : 'Update Sekarang'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!updateInfo.isForceUpdate && (
              <TouchableOpacity
                style={styles.btnLater}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Text style={styles.btnLaterText}>Nanti Saja</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 22,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    alignItems: 'center',
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
    zIndex: 10,
  },
  iconPodContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconPod: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderBottomWidth: 4,
    borderBottomColor: '#6EE7B7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...clayShadows.iconPod,
  },
  badgePod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: clayRadii.badge,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  badgePodText: {
    fontFamily: typography.bold,
    fontSize: 9.5,
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontFamily: typography.extraBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  versionCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  versionChipCurrent: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  versionChipLabel: {
    fontFamily: typography.medium,
    fontSize: 9.5,
    color: '#64748B',
  },
  versionChipValue: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#334155',
  },
  versionArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionChipNew: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  versionChipNewLabel: {
    fontFamily: typography.bold,
    fontSize: 9.5,
    color: '#047857',
  },
  versionChipNewValue: {
    fontFamily: typography.extraBold,
    fontSize: 12,
    color: '#065F46',
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  notesHeader: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#1E293B',
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 120,
  },
  notesScrollContent: {
    gap: 6,
  },
  noteItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteItemText: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  forceUpdateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    marginBottom: 14,
    width: '100%',
  },
  forceUpdateText: {
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 10.5,
    color: '#92400E',
    lineHeight: 15,
  },
  downloadSuccessNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    marginBottom: 14,
    width: '100%',
  },
  downloadSuccessText: {
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 10.5,
    color: '#065F46',
    lineHeight: 15,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  btnDownload: {
    width: '100%',
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  btnDownloadText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnLater: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLaterText: {
    fontFamily: typography.semiBold,
    fontSize: 12.5,
    color: '#64748B',
  },
});
