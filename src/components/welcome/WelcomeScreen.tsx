import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Sparkles,
  WifiOff,
  ShieldCheck,
  Sigma,
  Award,
  Sun,
  Radio,
  GraduationCap,
  Shield,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { typography, colors, radii, shadows } from '../../theme';

interface WelcomeScreenProps {
  onSelectStudent: () => void;
  onSelectTeacher: () => void;
}

interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
  accentBg: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectStudent,
  onSelectTeacher,
}) => {
  const features: FeatureItem[] = [
    {
      id: 'offline',
      title: 'Arsitektur Offline-First',
      desc: 'Unduh senyap di awal. Tetap berjalan 100% lancar meski Wi-Fi putus atau listrik padam.',
      badge: 'Andal',
      accentBg: '#eff6ff',
      icon: <WifiOff size={20} color={colors.primary} />,
    },
    {
      id: 'anticheat',
      title: 'Proteksi Anti-Curang',
      desc: 'Deteksi otomatis pindah tab, pencegatan tombol back, dan peringatan wajib Mode Game.',
      badge: 'Aman',
      accentBg: '#fef2f2',
      icon: <ShieldCheck size={20} color={colors.danger} />,
    },
    {
      id: 'math',
      title: 'Formula & Simbol Math',
      desc: 'Mesin LaTeX & KaTeX presisi untuk rendering rumus rumit, akar, matriks, dan angka.',
      badge: 'KaTeX',
      accentBg: '#f5f3ff',
      icon: <Sigma size={20} color={colors.doubt} />,
    },
    {
      id: 'scoring',
      title: 'Koreksi Instan & SHA-256',
      desc: 'Penilaian real-time langsung dengan segel kriptografi anti-manipulasi hasil ujian.',
      badge: 'Otomatis',
      accentBg: '#ecfdf5',
      icon: <Award size={20} color={colors.success} />,
    },
    {
      id: 'keepawake',
      title: 'Layar Tetap Menyala',
      desc: 'Fitur Keep-Awake otomatis menjaga layar HP tetap aktif tanpa mati/sleep saat berhitung.',
      badge: 'Nyaman',
      accentBg: '#fffbeb',
      icon: <Sun size={20} color={colors.warning} />,
    },
    {
      id: 'proctor',
      title: 'Pengawasan Real-Time',
      desc: 'Pantau langsung durasi, progres soal siswa, dan kirim peringatan jarak jauh seketika.',
      badge: 'Live',
      accentBg: '#eff6ff',
      icon: <Radio size={20} color={colors.primaryDark} />,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* 1. TOP / APP BRAND HEADER */}
      <View style={styles.headerBox}>
        <View style={styles.logoBadge}>
          <Sparkles size={28} color={colors.primary} strokeWidth={2.4} />
        </View>
        <View style={styles.brandTitleRow}>
          <Text style={styles.appTitle}>UjianPintar</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>CBT v2.0</Text>
          </View>
        </View>
        <Text style={styles.appTagline}>
          Portal Asesmen Berbasis Komputer Terstandar, Tangguh & Aman
        </Text>
      </View>

      {/* 2. FEATURE CARDS GRID */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fitur Unggulan Sistem CBT</Text>
        <Text style={styles.sectionSubtitle}>
          Didesain khusus untuk kelancaran asesmen siswa dan efisiensi pengawasan guru.
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {features.map((item) => (
          <View key={item.id} style={styles.featureCard}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconBox, { backgroundColor: item.accentBg }]}>
                {item.icon}
              </View>
              {item.badge && (
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      {/* 3. BOTTOM ROLE NAVIGATION BUTTONS */}
      <View style={styles.actionsCard}>
        <Text style={styles.actionPrompt}>Pilih Mode Masuk Aplikasi</Text>

        {/* Mode Siswa Button (Primary) */}
        <TouchableOpacity
          style={styles.studentBtn}
          onPress={onSelectStudent}
          activeOpacity={0.88}
        >
          <View style={styles.btnIconCircle}>
            <GraduationCap size={20} color="#ffffff" />
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.studentBtnTitle}>Masuk Sebagai Siswa</Text>
            <Text style={styles.studentBtnSubtitle}>
              Mulai sesi ujian menggunakan 6 digit Token PIN
            </Text>
          </View>
          <ArrowRight size={18} color="#ffffff" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Mode Guru Button (Secondary) */}
        <TouchableOpacity
          style={styles.teacherBtn}
          onPress={onSelectTeacher}
          activeOpacity={0.8}
        >
          <View style={styles.teacherIconCircle}>
            <Shield size={18} color={colors.primary} />
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.teacherBtnTitle}>Masuk Sebagai Guru / Pengawas</Text>
            <Text style={styles.teacherBtnSubtitle}>
              Kelola token, pantau live proctoring & rekap nilai
            </Text>
          </View>
          <ArrowRight size={17} color={colors.textSecondary} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Footer Guarantee Note */}
        <View style={styles.footerNote}>
          <CheckCircle2 size={13} color={colors.success} />
          <Text style={styles.footerNoteText}>
            Sistem terverifikasi anti-gangguan jaringan & auto-save aktif
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 32,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: colors.bgApp,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.card,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontFamily: typography.extraBold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  versionBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  versionText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  appTagline: {
    fontFamily: typography.medium,
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
    lineHeight: 18,
  },
  sectionHeader: {
    width: '100%',
    maxWidth: 460,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  gridContainer: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: '48.3%',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  featureBadgeText: {
    fontFamily: typography.semiBold,
    fontSize: 9.5,
    color: colors.textMuted,
  },
  featureTitle: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 17,
  },
  featureDesc: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15.5,
  },
  actionsCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
    ...shadows.card,
  },
  actionPrompt: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  studentBtn: {
    backgroundColor: colors.success,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.card,
  },
  btnIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextCol: {
    flex: 1,
  },
  studentBtnTitle: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 0.1,
  },
  studentBtnSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: '#d1fae5',
    marginTop: 1,
  },
  teacherBtn: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  teacherIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  teacherBtnTitle: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  teacherBtnSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  footerNoteText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
});
