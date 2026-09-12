/**
 * Claymorphism Design System Tokens & Presets
 * Memberikan efek 3D cembung/puffy seperti plastisin/tanah liat lembut
 * dengan double-rim highlight putih, extruded bottom edge, dan soft drop shadow.
 */

import { Platform, StyleSheet, ViewStyle } from 'react-native';

export const clayColors = {
  // Kanvas dasar yang kontras lembut dengan kartu clay
  canvas: '#EDF2F7',

  // Clay Card Pastels & Extruded Bevel (Bagian Bawah 3D)
  whiteSurface: '#FFFFFF',
  whiteBevel: '#D9E2EC',

  blueClay: '#EFF6FF',
  blueClayBevel: '#BFDBFE',
  blueClayText: '#1E40AF',

  redClay: '#FFF1F2',
  redClayBevel: '#FECDD3',
  redClayText: '#9F1239',

  purpleClay: '#FAF5FF',
  purpleClayBevel: '#E9D5FF',
  purpleClayText: '#6B21A8',

  emeraldClay: '#ECFDF5',
  emeraldClayBevel: '#A7F3D0',
  emeraldClayText: '#065F46',

  amberClay: '#FFFBEB',
  amberClayBevel: '#FDE68A',
  amberClayText: '#92400E',

  cyanClay: '#ECFEFF',
  cyanClayBevel: '#A5F3FC',
  cyanClayText: '#155E75',

  // Tombol CTA Clay
  primaryBtnBg: '#2563EB',
  primaryBtnBevel: '#1D4ED8',
  primaryBtnBorder: 'rgba(255, 255, 255, 0.45)',

  studentBtnBg: '#10B981', // Emerald Clay
  studentBtnBevel: '#047857', // Extruded darker base
  studentBtnBorder: 'rgba(255, 255, 255, 0.45)',

  teacherBtnBg: '#FFFFFF',
  teacherBtnBevel: '#CBD5E1',
  teacherBtnBorder: '#F1F5F9',

  dangerBtnBg: '#DC2626',
  dangerBtnBevel: '#991B1B',
  dangerBtnBorder: 'rgba(255, 255, 255, 0.35)',

  warningBtnBg: '#D97706',
  warningBtnBevel: '#92400E',
  warningBtnBorder: 'rgba(255, 255, 255, 0.4)',

  doubtBtnBg: '#7C3AED',
  doubtBtnBevel: '#5B21B6',
  doubtBtnBorder: 'rgba(255, 255, 255, 0.4)',
} as const;

export const clayShadows = {
  card: {
    shadowColor: '#486581',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: Platform.OS === 'ios' ? 0.14 : 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  cardHover: {
    shadowColor: '#334E68',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  iconPod: {
    shadowColor: '#486581',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  btnStudent: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnPrimary: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnTeacher: {
    shadowColor: '#486581',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDanger: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  badge: {
    shadowColor: '#627D98',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  logo: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

export const clayRadii = {
  card: 22,
  button: 20,
  pod: 16,
  badge: 9999,
  logo: 26,
  input: 16,
  modal: 28,
} as const;

export const clayPresets = StyleSheet.create({
  // Kartu putih porselen 3D standar
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.card,
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.card,
  },
  // Kartu modal porselen 3D
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
  },
  // Input form clay 3D
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: clayRadii.input,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderBottomWidth: 4,
    borderBottomColor: '#2563EB',
  },
  // Tombol Primer 3D (Biru)
  btnPrimary: {
    backgroundColor: clayColors.primaryBtnBg,
    borderRadius: clayRadii.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: clayColors.primaryBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.primaryBtnBevel,
    ...clayShadows.btnPrimary,
  },
  // Tombol Siswa 3D (Zamrud)
  btnStudent: {
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  // Tombol Sekunder / Guru 3D (Putih Porselen)
  btnSecondary: {
    backgroundColor: '#F8FAFC',
    borderRadius: clayRadii.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.teacherBtnBevel,
    ...clayShadows.btnTeacher,
  },
  // Tombol Bahaya 3D (Merah)
  btnDanger: {
    backgroundColor: clayColors.dangerBtnBg,
    borderRadius: clayRadii.button,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: clayColors.dangerBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.dangerBtnBevel,
    ...clayShadows.btnDanger,
  },
});
