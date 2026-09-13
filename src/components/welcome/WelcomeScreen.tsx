import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  WifiOff,
  ShieldCheck,
  Sigma,
  Award,
  Sun,
  Radio,
  GraduationCap,
  ArrowRight,
} from 'lucide-react-native';
import {
  typography,
  colors,
  clayColors,
  clayShadows,
  clayRadii,
} from '../../theme';
import { UjianPintarLogo } from '../common/UjianPintarLogo';

interface WelcomeScreenProps {
  onSelectStudent: () => void;
  onSelectTeacher?: () => void;
}

interface FeatureItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
  clayBg: string;
  clayBevel: string;
  clayIconBg: string;
  clayIconBevel: string;
  badgeBg: string;
  badgeText: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectStudent,
  onSelectTeacher,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 14;

  const features: FeatureItem[] = [
    {
      id: 'offline',
      title: 'Arsitektur Offline-First',
      desc: 'Unduh senyap di awal. Tetap berjalan 100% lancar meski Wi-Fi putus atau listrik padam.',
      badge: 'Andal',
      clayBg: clayColors.blueClay,
      clayBevel: clayColors.blueClayBevel,
      clayIconBg: '#DBEAFE',
      clayIconBevel: '#93C5FD',
      badgeBg: '#DBEAFE',
      badgeText: clayColors.blueClayText,
      icon: <WifiOff size={20} color="#1D4ED8" strokeWidth={2.4} />,
    },
    {
      id: 'anticheat',
      title: 'Proteksi Anti-Curang',
      desc: 'Deteksi otomatis pindah tab, pencegatan tombol back, dan peringatan wajib Mode Game.',
      badge: 'Aman',
      clayBg: clayColors.redClay,
      clayBevel: clayColors.redClayBevel,
      clayIconBg: '#FFE4E6',
      clayIconBevel: '#FDA4AF',
      badgeBg: '#FFE4E6',
      badgeText: clayColors.redClayText,
      icon: <ShieldCheck size={20} color="#DC2626" strokeWidth={2.4} />,
    },
    {
      id: 'math',
      title: 'Formula & Simbol Math',
      desc: 'Mesin LaTeX & KaTeX presisi untuk rendering rumus rumit, akar, matriks, dan angka.',
      badge: 'KaTeX',
      clayBg: clayColors.purpleClay,
      clayBevel: clayColors.purpleClayBevel,
      clayIconBg: '#F3E8FF',
      clayIconBevel: '#D8B4FE',
      badgeBg: '#F3E8FF',
      badgeText: clayColors.purpleClayText,
      icon: <Sigma size={20} color="#7C3AED" strokeWidth={2.4} />,
    },
    {
      id: 'scoring',
      title: 'Koreksi Instan & SHA-256',
      desc: 'Penilaian real-time langsung dengan segel kriptografi anti-manipulasi hasil ujian.',
      badge: 'Otomatis',
      clayBg: clayColors.emeraldClay,
      clayBevel: clayColors.emeraldClayBevel,
      clayIconBg: '#D1FAE5',
      clayIconBevel: '#6EE7B7',
      badgeBg: '#D1FAE5',
      badgeText: clayColors.emeraldClayText,
      icon: <Award size={20} color="#059669" strokeWidth={2.4} />,
    },
    {
      id: 'keepawake',
      title: 'Layar Tetap Menyala',
      desc: 'Fitur Keep-Awake otomatis menjaga layar HP tetap aktif tanpa mati/sleep saat berhitung.',
      badge: 'Nyaman',
      clayBg: clayColors.amberClay,
      clayBevel: clayColors.amberClayBevel,
      clayIconBg: '#FEF3C7',
      clayIconBevel: '#FCD34D',
      badgeBg: '#FEF3C7',
      badgeText: clayColors.amberClayText,
      icon: <Sun size={20} color="#D97706" strokeWidth={2.4} />,
    },
    {
      id: 'proctor',
      title: 'Pengawasan Real-Time',
      desc: 'Pantau langsung durasi, progres soal siswa, dan kirim peringatan jarak jauh seketika.',
      badge: 'Live',
      clayBg: clayColors.cyanClay,
      clayBevel: clayColors.cyanClayBevel,
      clayIconBg: '#CFFAFE',
      clayIconBevel: '#67E8F9',
      badgeBg: '#CFFAFE',
      badgeText: clayColors.cyanClayText,
      icon: <Radio size={20} color="#0284C7" strokeWidth={2.4} />,
    },
  ];

  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* 1. TOP / APP BRAND HEADER */}
      <View style={styles.headerBox}>
        <View style={styles.logoBadge}>
          <UjianPintarLogo width={46} height={24} />
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
      </View>

      <View style={styles.gridContainer}>
        {features.map((item) => (
          <View
            key={item.id}
            style={[
              styles.featureCard,
              {
                backgroundColor: item.clayBg,
                borderBottomColor: item.clayBevel,
              },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: item.clayIconBg,
                    borderBottomColor: item.clayIconBevel,
                  },
                ]}
              >
                {item.icon}
              </View>
              {item.badge && (
                <View style={[styles.featureBadge, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.featureBadgeText, { color: item.badgeText }]}>
                    {item.badge}
                  </Text>
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
        <View style={styles.actionHeaderRow}>
          <Text style={styles.actionPrompt}>SESI ASESMEN CBT</Text>
          <View style={styles.tactileDot} />
        </View>

        {/* Masuk Sesi Ujian Button */}
        <TouchableOpacity
          style={styles.studentBtn}
          onPress={onSelectStudent}
          activeOpacity={0.82}
        >
          <View style={styles.btnIconCircle}>
            <GraduationCap size={22} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View style={styles.btnTextCol}>
            <Text style={styles.studentBtnTitle}>Masuk Sesi Ujian</Text>
            <Text style={styles.studentBtnSubtitle}>
              Mulai asesmen untuk Siswa & akses portal Pengawas
            </Text>
          </View>
          <ArrowRight size={19} color="#ffffff" strokeWidth={2.6} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
    backgroundColor: clayColors.canvas,
  },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 24,
    paddingBottom: 40,
    alignItems: 'center',
  },

  /* 1. BRAND HEADER */
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: clayRadii.logo,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...clayShadows.logo,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontFamily: typography.extraBold,
    fontSize: 25,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  versionText: {
    fontFamily: typography.extraBold,
    fontSize: 10,
    color: '#1D4ED8',
    letterSpacing: 0.3,
  },
  appTagline: {
    fontFamily: typography.medium,
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },

  /* 2. SECTION HEADER */
  sectionHeader: {
    width: '100%',
    maxWidth: 460,
    marginBottom: 14,
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  /* 3. FEATURE CARDS GRID */
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
    borderRadius: clayRadii.card,
    padding: 14,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    ...clayShadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: clayRadii.pod,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.iconPod,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: clayRadii.badge,
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    ...clayShadows.badge,
  },
  featureBadgeText: {
    fontFamily: typography.bold,
    fontSize: 9.5,
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

  /* 4. ACTIONS CARD (BOTTOM CTAs) */
  actionsCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    gap: 13,
    ...clayShadows.cardHover,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionPrompt: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tactileDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },

  // Student Button
  studentBtn: {
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  btnIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextCol: {
    flex: 1,
  },
  studentBtnTitle: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: '#ffffff',
    letterSpacing: 0.1,
  },
  studentBtnSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: '#e6fffa',
    marginTop: 1,
  },
});
