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
  status: 'Lulus' | 'Remedial';
  correctCount: number;
  totalQuestions: number;
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

    for (const q of questions) {
      const qPoints = q.points || 10;
      maxScore += qPoints;
      const ans = answers.find((a) => a.questionId === q.id);

      if (ans) {
        let isCorrect = false;

        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          isCorrect = !!q.correctOptionId && ans.selectedOptionId === q.correctOptionId;
        } else if (q.type === 'short_answer') {
          if (q.correctAnswerText && ans.answerText) {
            const cleanC = q.correctAnswerText.trim().toLowerCase().replace(/,/g, '.');
            const cleanU = ans.answerText.trim().toLowerCase().replace(/,/g, '.');
            isCorrect = cleanC === cleanU;
          }
        }

        if (isCorrect) {
          totalScore += qPoints;
          correctCount++;
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const status: 'Lulus' | 'Remedial' = percentage >= kkmScore ? 'Lulus' : 'Remedial';

    return {
      totalScore,
      maxScore,
      percentage,
      status,
      correctCount,
      totalQuestions: questions.length,
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
