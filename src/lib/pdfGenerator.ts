import type { StudentPublicExamSummary, StudentAnswerDetailItem } from '../types/exam';
import { formatMathAndText } from '../components/common/MathRenderer';
import { KATEX_EMBEDDED_CSS } from '../components/common/katexEmbeddedCss';

function escapeHtml(str?: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateSkhuHtml(
  summary: StudentPublicExamSummary,
  items: StudentAnswerDetailItem[] = []
): string {
  const isPassed = summary.status === 'Lulus' || (summary.percentage ?? 0) >= 75;
  const examIdSafe = summary.examId || summary.sessionId || 'EXAM';
  const docNumber = `SKHU/UP/${examIdSafe.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}/${summary.nisn || '000000'}`;

  const breakdown = summary.breakdown || {
    objectiveScore: summary.score || 0,
    objectiveMax: summary.maxScore || 100,
    shortAnswerScore: 0,
    shortAnswerMax: 0,
    essayScore: 0,
    essayMax: 0,
    hasPendingEssays: false,
  };

  // 1. Build Detail Items Table Rows if items exist
  let detailRowsHtml = '';
  if (items && items.length > 0) {
    detailRowsHtml = items
      .map((item) => {
        const typeLabel =
          item.type === 'multiple_choice'
            ? 'Pilihan Ganda'
            : item.type === 'short_answer'
            ? 'Isian Singkat'
            : item.type === 'true_false'
            ? 'Benar/Salah'
            : 'Uraian / Esai';

        const opts = Array.isArray(item.options) ? item.options : [];

        let studentAns = '-';
        if (item.type === 'multiple_choice' || item.type === 'true_false') {
          const opt = opts.find(
            (o) => o.id === item.selectedOptionId || o.label === item.selectedOptionLabel || o.id === item.selectedOptionLabel
          );
          const chosenLabel = item.selectedOptionLabel || opt?.label;
          const chosenText = item.selectedOptionText || opt?.text || item.answerText;
          studentAns = chosenLabel
            ? `<strong>(${chosenLabel})</strong> ${formatMathAndText(chosenText || '')}`
            : (chosenText ? formatMathAndText(chosenText) : '<span style="color:#94a3b8; font-style:italic;">Tidak dijawab</span>');
        } else {
          studentAns = item.answerText
            ? formatMathAndText(item.answerText)
            : '<span style="color:#94a3b8; font-style:italic;">Tidak dijawab</span>';
        }

        let correctAns = '-';
        if (item.type === 'multiple_choice' || item.type === 'true_false') {
          const opt = opts.find(
            (o) => o.id === item.correctOptionId || o.label === item.correctOptionLabel || o.id === item.correctOptionLabel
          );
          const cLabel = item.correctOptionLabel || opt?.label;
          const cText = opt?.text || item.correctAnswerText;
          correctAns = cLabel
            ? `<strong>(${cLabel})</strong> ${formatMathAndText(cText || '')}`
            : (cText ? formatMathAndText(cText) : '-');
        } else {
          correctAns = item.correctAnswerText ? formatMathAndText(item.correctAnswerText) : '-';
        }

        let statusBadge = '';
        if (item.type === 'essay') {
          statusBadge = item.isGraded
            ? `<span style="color:#7e22ce; font-weight:bold;">✓ Dinilai Guru</span>`
            : `<span style="color:#d97706; font-weight:bold;">⏳ Menunggu</span>`;
        } else {
          const isAnswered = !!(
            item.selectedOptionId ||
            item.selectedOptionLabel ||
            item.selectedOptionText ||
            (item.answerText && item.answerText.trim().length > 0)
          );
          if (item.isCorrect) {
            statusBadge = `<span style="color:#059669; font-weight:bold;">✓ Benar</span>`;
          } else if (!isAnswered) {
            statusBadge = `<span style="color:#64748b; font-weight:bold;">✕ Kosong</span>`;
          } else {
            statusBadge = `<span style="color:#dc2626; font-weight:bold;">✕ Salah</span>`;
          }
        }

        const teacherFb = item.teacherFeedback
          ? `<div style="margin-top:4px; font-style:italic; color:#6b21a8; font-size:9px; background:#faf5ff; padding:3px 6px; border-radius:3px; border:1px solid #f3e8ff;">Catatan Guru: &ldquo;${escapeHtml(item.teacherFeedback)}&rdquo;</div>`
          : '';

        const optionsListHtml = (item.type === 'multiple_choice' || item.type === 'true_false') && opts.length > 0
          ? `<div style="margin-top:5px; padding-top:4px; border-top:1px dashed #e2e8f0; font-size:9px; color:#475569; line-height:1.4;">
              ${opts.map((o) => `<div><span style="font-weight:bold; color:#334155;">${escapeHtml(o.label)}.</span> ${formatMathAndText(o.text)}</div>`).join('')}
            </div>`
          : '';

        return `
          <tr>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${item.number}</td>
            <td>
              <span style="font-size:8px; font-weight:bold; color:#64748b; text-transform:uppercase;">${typeLabel}</span><br/>
              <div class="math-rendered-content" style="font-weight:600; color:#1e293b; margin-top:2px;">
                ${formatMathAndText(item.questionText)}
              </div>
              ${optionsListHtml}
              ${item.latexFormula ? `
                <div class="math-rendered-content" style="background:#f8fafc; padding:3px 6px; margin-top:4px; border-radius:4px; border:1px solid #e2e8f0;">
                  ${formatMathAndText(item.latexFormula, true)}
                </div>` : ''}
              ${teacherFb}
            </td>
            <td class="math-rendered-content">${studentAns}</td>
            <td class="math-rendered-content">${correctAns}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${item.pointsEarned} / ${item.maxPoints}</td>
          </tr>
        `;
      })
      .join('');
  } else {
    // Resilient fallback rows if individual question items are not available
    const fallbackRows = [
      {
        num: 1,
        type: 'Pilihan Ganda & B/S',
        text: 'Instrumen Penilaian Objektif (Pilihan Ganda & Benar/Salah)',
        studentAns: 'Terekam di Lembar Jawaban CBT',
        correctAns: 'Kunci Sistem CBT Terverifikasi',
        status: '<span style="color:#059669; font-weight:bold;">✓ Terkoreksi Otomatis</span>',
        score: `${breakdown.objectiveScore} / ${breakdown.objectiveMax}`,
      },
    ];

    if (breakdown.shortAnswerMax > 0) {
      fallbackRows.push({
        num: 2,
        type: 'Isian Singkat',
        text: 'Instrumen Penilaian Isian Singkat',
        studentAns: 'Terekam di Lembar Jawaban CBT',
        correctAns: 'Pencocokan Kata Kunci',
        status: '<span style="color:#2563eb; font-weight:bold;">✓ Terkoreksi</span>',
        score: `${breakdown.shortAnswerScore} / ${breakdown.shortAnswerMax}`,
      });
    }

    if (breakdown.essayMax > 0) {
      fallbackRows.push({
        num: breakdown.shortAnswerMax > 0 ? 3 : 2,
        type: 'Uraian / Esai',
        text: 'Instrumen Penilaian Uraian / Esai Komprehensif',
        studentAns: 'Terekam di Lembar Jawaban Siswa',
        correctAns: 'Rubrik Evaluasi Guru Pengampu',
        status: breakdown.hasPendingEssays
          ? '<span style="color:#d97706; font-weight:bold;">⏳ Menunggu Penilaian</span>'
          : '<span style="color:#7e22ce; font-weight:bold;">✓ Dinilai Guru</span>',
        score: `${breakdown.essayScore} / ${breakdown.essayMax}`,
      });
    }

    detailRowsHtml = fallbackRows
      .map(
        (row) => `
      <tr>
        <td style="text-align:center; font-family:monospace; font-weight:bold;">${row.num}</td>
        <td>
          <span style="font-size:8px; font-weight:bold; color:#64748b; text-transform:uppercase;">${row.type}</span><br/>
          <div style="font-weight:600; color:#1e293b; margin-top:2px;">${row.text}</div>
        </td>
        <td>${row.studentAns}</td>
        <td>${row.correctAns}</td>
        <td style="text-align:center;">${row.status}</td>
        <td style="text-align:center; font-family:monospace; font-weight:bold;">${row.score}</td>
      </tr>
    `
      )
      .join('');
  }

  // 2. Build Essay Feedback Callouts
  let essayFeedbackHtml = '';
  if (summary.essayFeedbacks && summary.essayFeedbacks.length > 0) {
    essayFeedbackHtml = `
      <div style="border: 1px solid #e9d5ff; background: #faf5ff; border-radius: 6px; padding: 10px; margin-top: 14px;">
        <div style="font-size: 11px; font-weight: bold; color: #6b21a8; margin-bottom: 6px;">
          Catatan &amp; Evaluasi Guru untuk Soal Uraian:
        </div>
        ${summary.essayFeedbacks
          .map(
            (fb) => `
          <div style="background: #ffffff; border: 1px solid #f3e8ff; border-radius: 4px; padding: 6px 8px; margin-top: 4px; font-size: 10px;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:#7e22ce;">
              <span>Soal Uraian #${fb.questionNumber}</span>
              <span style="font-family:monospace;">Skor: ${fb.scoreEarned} / ${fb.maxPoints} Poin</span>
            </div>
            <p style="margin: 3px 0 0 0; font-style: italic; color: #475569; line-height: 1.4;">
              &ldquo;${escapeHtml(fb.feedback)}&rdquo;
            </p>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SKHU - ${escapeHtml(summary.studentName)}</title>
  <style>
    ${KATEX_EMBEDDED_CSS}
    .math-rendered-content {
      word-break: break-word;
    }
    .math-rendered-content .normal-text {
      font-variant-numeric: normal;
    }
    .math-rendered-content .katex {
      font-size: 1.05em;
    }
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      font-size: 10px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .kop {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .kop-logo {
      width: 50px;
      height: 50px;
      background: #2563eb;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .kop-text {
      flex: 1;
      text-align: center;
    }
    .kop-gov {
      font-size: 8px;
      font-weight: bold;
      letter-spacing: 1px;
      color: #64748b;
      text-transform: uppercase;
      margin: 0;
    }
    .kop-school {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }
    .kop-sub {
      font-size: 8.5px;
      color: #475569;
      margin: 0;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      text-decoration: underline;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .doc-num {
      font-size: 9px;
      font-family: monospace;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .ident-table {
      width: 100%;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .ident-table td {
      padding: 4px 8px;
      font-size: 9.5px;
      vertical-align: top;
    }
    .ident-label {
      width: 100px;
      color: #64748b;
      font-weight: 600;
    }
    .ident-val {
      font-weight: bold;
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.5px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
    }
    table.data-table th {
      background: #f1f5f9;
      font-weight: bold;
      text-align: left;
      color: #334155;
    }
    .status-container {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }
    .status-card {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f8fafc;
    }
    .status-card.passed {
      border-color: #86efac;
      background: #f0fdf4;
      color: #166534;
    }
    .status-card.remedial {
      border-color: #fde047;
      background: #fefce8;
      color: #854d0e;
    }
    .status-title {
      font-size: 8.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
      opacity: 0.8;
    }
    .status-val {
      font-size: 13px;
      font-weight: 900;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      color: #1e293b;
      margin: 14px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
    }
    .footer-sign {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .stamp-box {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 6px 10px;
      max-width: 250px;
      font-size: 8.5px;
      color: #475569;
    }
    .stamp-title {
      font-weight: bold;
      color: #059669;
      font-size: 9.5px;
      margin-bottom: 2px;
    }
    .sign-box {
      text-align: center;
      font-size: 9.5px;
      min-width: 170px;
    }
    .sign-space {
      height: 40px;
    }
  </style>
</head>
<body>
  <!-- KOP SEKOLAH -->
  <div class="kop">
    <div class="kop-logo">UP</div>
    <div class="kop-text">
      <div class="kop-gov">PEMERINTAH DAERAH PROVINSI / KABUPATEN</div>
      <div class="kop-school">${escapeHtml(summary.schoolName || 'SMA NEGERI 1 INDONESIA')}</div>
      ${summary.schoolNpsn && summary.schoolNpsn.trim() !== '' ? `<div style="font-size: 8.5px; font-family: monospace; color: #475569; margin-top: 1px;">NPSN: ${escapeHtml(summary.schoolNpsn)}</div>` : ''}
      <div class="kop-sub">Sistem Asesmen &amp; Ujian Berbasis Komputer / Smartphone (CBT Cloud Digital)</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="doc-header">
    <div class="doc-title">SURAT KETERANGAN HASIL UJIAN (SKHU) DIGITAL</div>
    <div class="doc-num">Nomor: ${docNumber}</div>
  </div>

  <!-- IDENTITAS -->
  <table class="ident-table">
    <tr>
      <td class="ident-label">Nama Siswa</td>
      <td class="ident-val">: ${escapeHtml(summary.studentName)}</td>
      <td class="ident-label">Mata Pelajaran</td>
      <td class="ident-val">: ${escapeHtml(summary.subject)}</td>
    </tr>
    <tr>
      <td class="ident-label">NISN / NIS</td>
      <td class="ident-val" style="font-family:monospace;">: ${escapeHtml(summary.nisn)}</td>
      <td class="ident-label">Jenis Penilaian</td>
      <td class="ident-val">: ${escapeHtml(summary.examTitle)}</td>
    </tr>
    <tr>
      <td class="ident-label">Kelas / Rombel</td>
      <td class="ident-val">: ${escapeHtml(summary.className)}</td>
      <td class="ident-label">Tanggal Ujian</td>
      <td class="ident-val">: ${escapeHtml(summary.submittedAt)}</td>
    </tr>
  </table>

  <!-- SCORE SUMMARY TABLE -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">No</th>
        <th>Komponen Instrumen Asesmen</th>
        <th style="width: 70px; text-align: center;">Bobot Maks.</th>
        <th style="width: 80px; text-align: center;">Skor Diperoleh</th>
        <th>Keterangan Evaluasi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center; font-family: monospace;">1</td>
        <td style="font-weight: 600;">Soal Objektif (Pilihan Ganda &amp; B/S)</td>
        <td style="text-align: center; font-family: monospace;">${breakdown.objectiveMax}</td>
        <td style="text-align: center; font-family: monospace; font-weight: bold; color: #1d4ed8;">${breakdown.objectiveScore}</td>
        <td style="color: #64748b; font-size: 8.5px;">Koreksi Otomatis Sistem CBT</td>
      </tr>
      ${breakdown.shortAnswerMax > 0 ? `
      <tr>
        <td style="text-align: center; font-family: monospace;">2</td>
        <td style="font-weight: 600;">Soal Isian Singkat</td>
        <td style="text-align: center; font-family: monospace;">${breakdown.shortAnswerMax}</td>
        <td style="text-align: center; font-family: monospace; font-weight: bold; color: #1d4ed8;">${breakdown.shortAnswerScore}</td>
        <td style="color: #64748b; font-size: 8.5px;">Koreksi Pencocokan Kata Kunci</td>
      </tr>
      ` : ''}
      ${breakdown.essayMax > 0 ? `
      <tr>
        <td style="text-align: center; font-family: monospace;">${breakdown.shortAnswerMax > 0 ? '3' : '2'}</td>
        <td style="font-weight: 600;">Soal Uraian / Esai Komprehensif</td>
        <td style="text-align: center; font-family: monospace;">${breakdown.essayMax}</td>
        <td style="text-align: center; font-family: monospace; font-weight: bold; color: #7e22ce;">${breakdown.essayScore}</td>
        <td style="color: #64748b; font-size: 8.5px;">${breakdown.hasPendingEssays ? 'Menunggu Penilaian Guru' : 'Penilaian Guru Berbantuan AI'}</td>
      </tr>
      ` : ''}
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="2" style="text-align: right; padding-right: 12px;">TOTAL SKOR AKHIR SISWA</td>
        <td style="text-align: center; font-family: monospace;">${summary.maxScore}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 900; font-size: 11px; color: #059669;">${summary.score}</td>
        <td style="color: #0f172a; font-weight: bold;">Nilai Akhir: <span style="font-size: 12px; color: #059669;">${summary.percentage}</span> / 100</td>
      </tr>
    </tbody>
  </table>

  <!-- STATUS KKM -->
  <div class="status-container">
    <div class="status-card">
      <div class="status-title">Kriteria Ketuntasan (KKTP / KKM)</div>
      <div class="status-val" style="font-family: monospace; color: #0f172a;">75.00</div>
    </div>
    <div class="status-card ${isPassed ? 'passed' : 'remedial'}">
      <div class="status-title">Status Kelulusan Siswa</div>
      <div class="status-val">${isPassed ? 'TUNTAS (LULUS)' : 'BELUM TUNTAS (REMEDIAL)'}</div>
    </div>
  </div>

  <!-- ESSAY FEEDBACK -->
  ${essayFeedbackHtml}

  <!-- DETAIL LEMBAR JAWABAN JIKA ADA -->
  ${detailRowsHtml ? `
    <div class="section-title">Lembar Rincian Jawaban Siswa Per Butir Soal</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20px; text-align: center;">No</th>
          <th>Pertanyaan &amp; Tipe Soal</th>
          <th style="width: 120px;">Jawaban Siswa</th>
          <th style="width: 120px;">Kunci Jawaban</th>
          <th style="width: 65px; text-align: center;">Status</th>
          <th style="width: 55px; text-align: center;">Poin</th>
        </tr>
      </thead>
      <tbody>
        ${detailRowsHtml}
      </tbody>
    </table>
  ` : ''}

  <!-- TANDA TANGAN & STEMPEL -->
  <div class="footer-sign">
    <div class="stamp-box">
      <div class="stamp-title">✓ Dokumen Digital Sah &amp; Terverifikasi</div>
      <div>Diterbitkan otomatis melalui sistem UjianPintar CBT Cloud.</div>
      <div style="font-family: monospace; font-size: 8px; margin-top: 3px; color: #94a3b8;">
        Session ID: ${summary.sessionId}
      </div>
    </div>
    <div class="sign-box">
      <div>Mengetahui,</div>
      <div>Guru Pengampu Mata Pelajaran</div>
      <div class="sign-space"></div>
      <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(summary.teacherName || 'Guru Pengampu')}</div>
      <div style="font-size: 8.5px; color: #64748b; font-family: monospace;">
        ${summary.teacherNip && summary.teacherNip.trim() !== '' ? `NIP. ${escapeHtml(summary.teacherNip)}` : 'NIP. Guru Pengampu'}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
