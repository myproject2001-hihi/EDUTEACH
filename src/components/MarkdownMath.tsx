import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function MarkdownMath({ content }: { content: string }) {
  const processedContent = content
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, p1) => '$' + p1 + '$')
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => '$$' + p1 + '$$');
    
  return (
    <div className="prose prose-sm max-w-none prose-slate">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
