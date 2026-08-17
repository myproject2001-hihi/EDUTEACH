import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownMathProps {
  content: string;
  className?: string;
}

export function MarkdownMath({ content, className = '' }: MarkdownMathProps) {
  const processedContent = (content || '')
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, p1) => '$' + p1 + '$')
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, p1) => '$$' + p1 + '$$');
    
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
