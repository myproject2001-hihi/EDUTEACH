import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownMathProps {
  content: string;
  className?: string;
}

// Quick check if text contains LaTeX or Markdown elements
function hasMarkdownOrMath(str: string): boolean {
  if (!str) return false;
  return (
    str.includes('$') ||
    str.includes('\\(') ||
    str.includes('\\[') ||
    str.includes('\\frac') ||
    str.includes('\\sqrt') ||
    str.includes('\\cdot') ||
    str.includes('\\times') ||
    str.includes('\\pm') ||
    str.includes('\\alpha') ||
    str.includes('\\beta') ||
    str.includes('\\pi') ||
    str.includes('\\Delta') ||
    str.includes('^') ||
    str.includes('_') ||
    str.includes('*') ||
    str.includes('#') ||
    str.includes('`') ||
    str.includes('~~') ||
    str.includes('\n')
  );
}

function RawMarkdownMath({ content, className = '' }: MarkdownMathProps) {
  const text = content || '';
  const isComplex = useMemo(() => hasMarkdownOrMath(text), [text]);

  const processedContent = useMemo(() => {
    if (!isComplex) return text;
    return text
      .replace(/\\\(([\s\S]*?)\\\)/g, (_match, p1) => '$' + p1 + '$')
      .replace(/\\\[([\s\S]*?)\\\]/g, (_match, p1) => '$$' + p1 + '$$');
  }, [text, isComplex]);

  if (!isComplex) {
    return (
      <span className={`inline-block max-w-none text-inherit leading-relaxed ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <div className={`max-w-none text-inherit leading-relaxed [&_p]:text-inherit [&_p]:m-0 [&_span]:text-inherit [&_.katex]:text-inherit ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownMath = React.memo(RawMarkdownMath);
