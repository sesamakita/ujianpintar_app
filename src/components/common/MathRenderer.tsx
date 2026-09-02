import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TextStyle, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import katex from 'katex';
import { KATEX_EMBEDDED_CSS } from './katexEmbeddedCss';
import { typography, colors } from '../../theme';

interface MathRendererProps {
  text?: string;
  math?: string;
  block?: boolean;
  fontSize?: number;
  color?: string;
  fontWeight?: TextStyle['fontWeight'];
  style?: ViewStyle;
  isOption?: boolean;
  className?: string;
}

/**
 * Escapes HTML characters in plain text to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely renders LaTeX string via KaTeX to clean HTML string.
 */
function renderKatexSafe(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch (err) {
    console.warn('KaTeX render error:', err);
    return `<span class="font-mono" style="font-family: monospace; color: #1e293b;">${escapeHtml(latex)}</span>`;
  }
}

/**
 * Checks whether an input text contains genuine LaTeX math commands or delimiters.
 * Will NOT flag normal text containing numbers (e.g. "15 m/s", "Tahun 1945", "150 meter"),
 * underscores ("___"), or common punctuation.
 */
export function hasMath(input?: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;

  // 1. Explicit math delimiters ($...$, $$...$$, \(...\), \[...\])
  if (
    /\$\$[\s\S]+?\$\$/.test(trimmed) ||
    /\\\[[\s\S]+?\\\]/.test(trimmed) ||
    /\$[^\$\n]+?\$/.test(trimmed) ||
    /\\\([\s\S]+?\\\)/.test(trimmed)
  ) {
    return true;
  }

  // 2. Specific LaTeX commands starting with backslash followed by a word
  const latexCommandRegex = /\\(frac|sqrt|times|div|pm|sum|int|alpha|beta|gamma|delta|theta|pi|le|ge|neq|in|begin|cos|sin|tan|cot|sec|csc|log|ln|lim|circ|cdot|approx|infty|vec|bar|hat|partial|degree)\b/;
  if (latexCommandRegex.test(trimmed)) {
    return true;
  }

  // 3. Isolated mathematical expressions like x^2, y_1, 10^{-3} (attached to a variable or number)
  if (/[a-zA-Z0-9]\^[0-9a-zA-Z\{]/.test(trimmed) || /[a-zA-Z]_[0-9a-zA-Z\{]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Parses mixed text containing LaTeX formulas ($...$, $$...$$, \[...\], \(...\))
 * or pure LaTeX expressions and returns cleanly formatted HTML.
 * Applies dedicated KaTeX Math font to numbers and mathematical formulas,
 * while keeping general Indonesian text in Plus Jakarta Sans.
 */
export function formatMathAndText(input?: string, forceBlock = false): string {
  if (!input) return '';

  const trimmed = input.trim();
  if (!trimmed) return '';

  // 1. If explicitly passed as pure math without delimiters
  if (
    trimmed.startsWith('\\begin') ||
    (trimmed.startsWith('\\') && !trimmed.includes(' ') && trimmed.length > 2)
  ) {
    return renderKatexSafe(trimmed, forceBlock);
  }

  // 2. Check if the string has math delimiters ($$...$$, $...$, \[...\], \(...\))
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\))/g;

  // Function to process text parts outside explicit $ ... $
  // It renders standalone numbers or simple math expressions with KaTeX math font,
  // and regular words with Plus Jakarta Sans
  function processPlainText(rawText: string): string {
    if (!rawText) return '';

    // If string is an option like "x = 3" or "x = -4" or "0.5"
    if (/^[a-zA-Z]\s*=\s*-?\d+(?:\.\d+)?$/.test(rawText.trim())) {
      return renderKatexSafe(rawText.trim(), false);
    }

    // Match numbers with optional decimal/negative (e.g. 15, 20, 150, 0.5, -3)
    const tokenRegex = /(-?\b\d+(?:[\.,]\d+)?\b)/g;
    let lastIdx = 0;
    let out = '';
    let m: RegExpExecArray | null;

    while ((m = tokenRegex.exec(rawText)) !== null) {
      const before = rawText.slice(lastIdx, m.index);
      if (before) {
        out += `<span class="normal-text">${escapeHtml(before).replace(/\n/g, '<br/>')}</span>`;
      }
      // Render the number with dedicated KaTeX math font
      out += renderKatexSafe(m[0], false);
      lastIdx = m.index + m[0].length;
    }

    const rest = rawText.slice(lastIdx);
    if (rest) {
      out += `<span class="normal-text">${escapeHtml(rest).replace(/\n/g, '<br/>')}</span>`;
    }

    return out;
  }

  if (!mathRegex.test(trimmed)) {
    // Check if the entire string looks like an isolated formula without dollar signs
    const latexCommandRegex = /\\(frac|sqrt|times|div|pm|sum|int|alpha|beta|gamma|delta|theta|pi|le|ge|neq|in|cos|sin|tan|cot|sec|csc|log|ln|lim|circ|cdot|approx|infty|vec|bar|hat)\b/;
    if (latexCommandRegex.test(trimmed) && !trimmed.includes('<')) {
      return renderKatexSafe(trimmed, forceBlock);
    }

    return processPlainText(trimmed);
  }

  // Reset regex index
  mathRegex.lastIndex = 0;

  // Split and replace math parts smoothly
  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(trimmed)) !== null) {
    // Text before match
    const textBefore = trimmed.slice(lastIndex, match.index);
    if (textBefore) {
      result += processPlainText(textBefore);
    }

    const matchedStr = match[0];
    let formula = matchedStr;
    let isBlock = false;

    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      formula = matchedStr.slice(2, -2);
      isBlock = true;
    } else if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      formula = matchedStr.slice(2, -2);
      isBlock = true;
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      formula = matchedStr.slice(2, -2);
      isBlock = false;
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      formula = matchedStr.slice(1, -1);
      isBlock = false;
    }

    result += renderKatexSafe(formula, isBlock || forceBlock);
    lastIndex = match.index + matchedStr.length;
  }

  // Remaining text after last match
  const remaining = trimmed.slice(lastIndex);
  if (remaining) {
    result += processPlainText(remaining);
  }

  return result;
}

/**
 * Injects Google Fonts Plus Jakarta Sans + KaTeX stylesheet synchronously in Web DOM
 */
const ensureKatexWebStyles = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (!document.getElementById('plus-jakarta-sans-font')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'plus-jakarta-sans-font';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600;1,700&display=swap';
      document.head.appendChild(fontLink);
    }

    if (!document.getElementById('katex-embedded-style')) {
      const style = document.createElement('style');
      style.id = 'katex-embedded-style';
      style.textContent = `
        ${KATEX_EMBEDDED_CSS}
        .math-rendered-content {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          word-break: break-word;
        }
        .math-rendered-content .normal-text {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-variant-numeric: normal;
        }
        .math-rendered-content .katex {
          font-size: 1.18em;
        }
        .math-rendered-option .katex {
          font-size: 1.22em !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
};

// Immediately execute on script evaluation in Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  ensureKatexWebStyles();
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  math,
  block = false,
  fontSize = 15.5,
  color = '#0f172a',
  fontWeight = '500',
  style,
  isOption = false,
  className = '',
}) => {
  const defaultInitialHeight = block ? 44 : isOption ? 24 : 28;
  const [webViewHeight, setWebViewHeight] = useState<number>(defaultInitialHeight);

  const contentToRender = math || text || '';

  // CRITICAL: Reset height when content or index changes to prevent height accumulation
  useEffect(() => {
    setWebViewHeight(defaultInitialHeight);
  }, [contentToRender, block, isOption, defaultInitialHeight]);

  useEffect(() => {
    ensureKatexWebStyles();
  }, []);

  if (!contentToRender || contentToRender.trim() === '') return null;

  const html = formatMathAndText(contentToRender, block);

  // 1. WEB PLATFORM: Direct DOM injection with embedded KaTeX CSS & unified Plus Jakarta Sans
  if (Platform.OS === 'web') {
    return (
      <div
        className={`math-rendered-content ${isOption ? 'math-rendered-option' : ''} ${className}`}
        style={{
          fontSize: isOption ? '15.5px' : `${fontSize}px`,
          color,
          fontWeight: (fontWeight as any) || (isOption ? '600' : '500'),
          lineHeight: isOption ? '1.4' : '1.6',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: block ? 'center' : 'left',
          width: '100%',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // 2. NATIVE ANDROID / IOS PLATFORM: Self-contained Base64 KaTeX & stable height measurement
  const htmlFullPage = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          ${KATEX_EMBEDDED_CSS}
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          html, body {
            background-color: transparent !important;
            background: transparent !important;
            margin: 0;
            padding: 0;
            width: 100%;
            overflow: hidden;
            height: auto !important;
          }
          #math-measure-box {
            display: block;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
          }
          body, .normal-text {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            color: ${color};
            font-size: ${isOption ? 15.5 : fontSize}px;
            font-weight: ${fontWeight};
            line-height: ${isOption ? 1.35 : 1.55};
            text-align: ${block ? 'center' : 'left'};
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .katex {
            font-size: ${isOption ? '1.2em' : '1.18em'};
          }
          .katex-display {
            margin: 4px 0;
            text-align: center;
          }
          .katex-mathml {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="math-measure-box">${html}</div>
        <script>
          function reportHeight() {
            var el = document.getElementById('math-measure-box');
            if (el && window.ReactNativeWebView) {
              var w = document.body.clientWidth || window.innerWidth || 0;
              // Guard against premature measurement before flexbox layout width settles
              if (w < 20) return;
              var h = Math.ceil(el.getBoundingClientRect().height || el.offsetHeight || 26);
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));
            }
          }
          window.addEventListener('resize', reportHeight);
          window.addEventListener('DOMContentLoaded', reportHeight);
          window.addEventListener('load', reportHeight);
          setTimeout(reportHeight, 40);
          setTimeout(reportHeight, 150);
          setTimeout(reportHeight, 400);
        </script>
      </body>
    </html>
  `;

  // For short single-line options, clamp height to prevent temporary premature wrapping
  const effectiveHeight = isOption && contentToRender.length < 40 && !contentToRender.includes('\\begin')
    ? Math.min(webViewHeight, 36)
    : webViewHeight;

  return (
    <View
      pointerEvents={isOption ? 'none' : 'auto'}
      style={[
        styles.nativeContainer,
        { height: effectiveHeight },
        style,
      ]}
    >
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlFullPage, baseUrl: '' }}
        style={styles.webview}
        scrollEnabled={false}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidLayerType="software"
        injectedJavaScript="reportHeight(); true;"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height && data.height > 10) {
              setWebViewHeight((prev) => (Math.abs(prev - data.height) > 2 ? data.height : prev));
            }
          } catch {}
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  nativeContainer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    width: '100%',
    justifyContent: 'center',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
