import * as Crypto from 'expo-crypto';
import type { Question } from '../types/exam';

export interface StudentAnswerItem {
  questionId: string;
  selectedOptionId?: string;
  answerText?: string;
}

export interface GradeResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: 'Lulus' | 'Remedial' | 'Menunggu Koreksi';
  correctCount: number;
  totalQuestions: number;
  hasPendingEssays: boolean;
  objectiveScore: number;
  objectiveMax: number;
  shortAnswerScore: number;
  shortAnswerMax: number;
  essayScore: number;
  essayMax: number;
  details?: Record<string, { isCorrect: boolean; pointsEarned: number }>;
}

export class ScoringEngine {
  /**
   * Fast auto-grading algorithm matching Rust ujianpintar-core
   */
  static gradeExam(
    questions: Question[],
    answers: StudentAnswerItem[],
    kkmScore: number = 75
  ): GradeResult {
    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;
    let objectiveScore = 0;
    let objectiveMax = 0;
    let shortAnswerScore = 0;
    let shortAnswerMax = 0;
    let essayMax = 0;
    let hasPendingEssays = false;
    const details: Record<string, { isCorrect: boolean; pointsEarned: number }> = {};

    for (const q of questions) {
      const qPoints = q.points || 10;
      maxScore += qPoints;
      const ans = answers.find((a) => a.questionId === q.id);
      let isCorrect = false;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        objectiveMax += qPoints;
        if (ans && ans.selectedOptionId) {
          const selectedOpt = (q.options || []).find((o) => o.id === ans.selectedOptionId);
          const correctOpt = (q.options || []).find((o) => o.id === q.correctOptionId);

          const idMatch = !!(q.correctOptionId && ans.selectedOptionId === q.correctOptionId);
          const labelMatch = !!(selectedOpt && correctOpt && selectedOpt.label === correctOpt.label);
          const textMatch = !!(
            selectedOpt?.text &&
            correctOpt?.text &&
            selectedOpt.text.trim().toLowerCase() === correctOpt.text.trim().toLowerCase()
          );

          if (idMatch || labelMatch || textMatch) {
            isCorrect = true;
            totalScore += qPoints;
            objectiveScore += qPoints;
            correctCount++;
          }
        }
      } else if (q.type === 'short_answer') {
        shortAnswerMax += qPoints;
        if (ans && q.correctAnswerText && ans.answerText) {
          const cleanC = q.correctAnswerText.trim().toLowerCase().replace(/,/g, '.');
          const cleanU = ans.answerText.trim().toLowerCase().replace(/,/g, '.');
          if (cleanC === cleanU) {
            isCorrect = true;
            totalScore += qPoints;
            shortAnswerScore += qPoints;
            correctCount++;
          }
        }
      } else if (q.type === 'essay') {
        essayMax += qPoints;
        hasPendingEssays = true;
        // Essay answers require teacher / AI grading, initially 0 points pending
        isCorrect = false;
      }

      details[q.id] = {
        isCorrect,
        pointsEarned: isCorrect ? qPoints : 0,
      };
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // If exam has essays and current objective score hasn't passed KKM, status is pending essay review
    let status: 'Lulus' | 'Remedial' | 'Menunggu Koreksi' = 'Remedial';
    if (percentage >= kkmScore) {
      status = 'Lulus';
    } else if (hasPendingEssays) {
      status = 'Menunggu Koreksi';
    }

    return {
      totalScore,
      maxScore,
      percentage,
      status,
      correctCount,
      totalQuestions: questions.length,
      hasPendingEssays,
      objectiveScore,
      objectiveMax,
      shortAnswerScore,
      shortAnswerMax,
      essayScore: 0,
      essayMax,
      details,
    };
  }

  /**
   * Generate SHA-256 submission integrity seal using Expo Crypto
   */
  static async generateSubmissionSeal(
    examId: string,
    nisn: string,
    answersPayload: string,
    violationCount: number
  ): Promise<string> {
    try {
      const raw = `EXAM:${examId}:NISN:${nisn}:VIOL:${violationCount}:DATA:${answersPayload}:KEY:UJIANPINTAR_SALT_2026`;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        raw
      );
      return hash;
    } catch {
      // Fallback hash
      return `SEAL-${Date.now().toString(16)}-${Math.random().toString(36).substring(2, 8)}`;
    }
  }
}
