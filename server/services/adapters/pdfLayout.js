const ATTRIBUTE = (attributes, name) => {
  const match = String(attributes || "").match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? Number(match[1]) : 0;
};

const decodeXml = (value) => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));

const parseWords = (lineMarkup) => [...String(lineMarkup || "").matchAll(/<word\b([^>]*)>([\s\S]*?)<\/word>/g)]
  .map((match) => ({
    xMin: ATTRIBUTE(match[1], "xMin"),
    xMax: ATTRIBUTE(match[1], "xMax"),
    yMin: ATTRIBUTE(match[1], "yMin"),
    yMax: ATTRIBUTE(match[1], "yMax"),
    text: decodeXml(match[2])
  }))
  .filter((word) => word.text.trim());

const parsePdfBBoxLayout = (markup) => {
  const lines = [];
  const pages = [...String(markup || "").matchAll(/<page\b([^>]*)>([\s\S]*?)<\/page>/g)];
  pages.forEach((pageMatch, pageIndex) => {
    const pageMarkup = pageMatch[2];
    [...pageMarkup.matchAll(/<line\b([^>]*)>([\s\S]*?)<\/line>/g)].forEach((lineMatch) => {
      const words = parseWords(lineMatch[2]);
      if (!words.length) return;
      lines.push({
        page: pageIndex + 1,
        xMin: Math.min(...words.map((word) => word.xMin)),
        xMax: Math.max(...words.map((word) => word.xMax)),
        yMin: Math.min(...words.map((word) => word.yMin)),
        yMax: Math.max(...words.map((word) => word.yMax)),
        words
      });
    });
  });
  return lines;
};

const EXPONENT_CHARS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "ⁿ": "n", "ⁱ": "i" };
const SUPERSCRIPT_CHARS = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿⁱ]+$/;
const toExponent = (value) => String(value || "").split("").map((char) => EXPONENT_CHARS[char] || char).join("");

const joinWords = (words) => {
  const ordered = [...words].sort((left, right) => left.xMin - right.xMin);
  let result = "";
  let previous = null;
  ordered.forEach((word) => {
    const text = word.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const gap = previous ? word.xMin - previous.xMax : 0;
    const raised = previous && word.yMin < previous.yMin - 1.4 && gap < 5 && /^[0-9A-Za-z+\-=]+$/.test(text) && /[0-9A-Za-z]$/.test(previous.text);
    const explicitSuperscript = previous && SUPERSCRIPT_CHARS.test(text) && gap < 8 && /[0-9A-Za-z)]$/.test(previous.text);
    if (raised || explicitSuperscript) result += `^${toExponent(text)}`;
    else if (previous && /^[√∛]$/.test(previous.text)) result += text;
    else if (previous && gap > 1.5) result += ` ${text}`;
    else result += text;
    previous = word;
  });
  return result.trim();
};

const isShortMathToken = (text) => /^[0-9A-Za-z𝑥𝑦𝑝𝑞𝑛𝜈]+$/.test(String(text || "").trim()) && String(text || "").trim().length <= 4;
const isOptionMarker = (text) => /^\([A-D]\)$/i.test(String(text || "").trim());
const isOptionLine = (text) => /^\([A-D]\)(?:\s|$)/i.test(String(text || "").trim());
const isQuestionMarker = (text) => /^q[.]\d{1,4}$/i.test(String(text || "").trim());

const mergeSameBaselineLines = (rawLines) => {
  const result = [];
  [...rawLines].sort((left, right) => left.page - right.page || left.yMin - right.yMin || left.xMin - right.xMin).forEach((line) => {
    const previous = result[result.length - 1];
    const lineText = line.text || joinWords(line.words);
    const previousIsMarker = isOptionMarker(previous?.text) || isOptionLine(previous?.text) || isQuestionMarker(previous?.text);
    const currentIsMarker = isOptionMarker(lineText) || isOptionLine(lineText) || isQuestionMarker(lineText);
    const markerHasContentGap = previousIsMarker && line.xMin - previous.xMax > 10;
    const sameMarkerBaseline = previous && previous.page === line.page && Math.abs(previous.yMin - line.yMin) <= 3.5 && ((previousIsMarker && (!isShortMathToken(lineText) || markerHasContentGap)) || (currentIsMarker && !isShortMathToken(previous.text)));
    if (previous && previous.page === line.page && (Math.abs(previous.yMin - line.yMin) <= 1.5 || sameMarkerBaseline)) {
      previous.words.push(...line.words);
      previous.xMin = Math.min(previous.xMin, line.xMin);
      previous.xMax = Math.max(previous.xMax, line.xMax);
      previous.yMax = Math.max(previous.yMax, line.yMax);
      previous.text = joinWords(previous.words);
    } else {
      result.push({ ...line, words: [...line.words], text: joinWords(line.words) });
    }
  });
  return result;
};

const mergeRaisedTokens = (lines) => {
  const result = [...lines];
  for (let index = 0; index < result.length - 1; index += 1) {
    const raisedLine = result[index];
    const baselineLine = result[index + 1];
    const raisedWord = raisedLine.words.length === 1 ? raisedLine.words[0] : null;
    if (!raisedWord || !isShortMathToken(raisedWord.text) && !SUPERSCRIPT_CHARS.test(raisedWord.text)) continue;
    if (raisedLine.page !== baselineLine.page) continue;
    const verticalOffset = baselineLine.yMin - raisedLine.yMin;
    if (verticalOffset < 1.5 || verticalOffset > 12) continue;
    const hasStackedCounterpart = result.slice(index + 1, index + 4).some((line) => line.page === raisedLine.page && line.words.some((word) => isShortMathToken(word.text) && Math.abs(word.xMin - raisedWord.xMin) <= 4 && word.yMin - raisedWord.yMin >= 7 && word.yMin - raisedWord.yMin <= 24));
    if (hasStackedCounterpart) continue;
    const precedingWord = baselineLine.words.filter((word) => word.xMax <= raisedWord.xMin + 0.5).sort((left, right) => right.xMax - left.xMax)[0];
    if (!precedingWord || raisedWord.xMin - precedingWord.xMax > 8) continue;
    baselineLine.words.push(raisedWord);
    baselineLine.xMin = Math.min(baselineLine.xMin, raisedLine.xMin);
    baselineLine.xMax = Math.max(baselineLine.xMax, raisedLine.xMax);
    baselineLine.yMax = Math.max(baselineLine.yMax, raisedLine.yMax);
    baselineLine.text = joinWords(baselineLine.words);
    result.splice(index, 1);
    index -= 1;
  }
  return result;
};

const restoreStackedFractions = (lines) => {
  const result = [...lines];
  for (let index = 0; index < result.length; index += 1) {
    const numerator = result[index];
    if (numerator.words.length !== 1 || !isShortMathToken(numerator.text)) continue;
    for (let next = index + 1; next < Math.min(result.length, index + 4); next += 1) {
      const denominator = result[next];
      if (denominator.page !== numerator.page) continue;
      const denominatorWord = denominator.words.find((word) => isShortMathToken(word.text) && Math.abs(word.xMin - numerator.xMin) <= 4 && word.yMin - numerator.yMin >= 7 && word.yMin - numerator.yMin <= 24);
      if (!denominatorWord) continue;
      const fraction = `${numerator.text}/${denominatorWord.text}`;
      const host = denominator.words.length === 1
        ? result.slice(index + 1, next).find((line) => line.page === numerator.page && line.yMin < denominator.yMin && line.xMax <= numerator.xMin + 20 && line.words.length > 1)
        : denominator;
      if (host) {
        if (host === denominator) denominatorWord.text = `${numerator.text}/${denominatorWord.text}`;
        else host.words.push({ ...numerator.words[0], text: fraction, yMin: host.yMin, yMax: host.yMax, xMax: denominatorWord.xMax });
        host.text = joinWords(host.words);
        if (host !== denominator) result.splice(next, 1);
        result.splice(index, 1);
        index -= 1;
      } else {
        if (denominator.words.length === 1) {
          numerator.text = fraction;
          numerator.words = [{ ...numerator.words[0], text: fraction, xMax: denominatorWord.xMax }];
          result.splice(next, 1);
        } else {
          denominatorWord.text = fraction;
          denominator.text = joinWords(denominator.words);
          result.splice(index, 1);
          index -= 1;
        }
      }
      break;
    }
  }
  return result;
};

const layoutLinesToText = (rawLines) => restoreStackedFractions(mergeRaisedTokens(mergeSameBaselineLines(rawLines)));

module.exports = { layoutLinesToText, parsePdfBBoxLayout };
