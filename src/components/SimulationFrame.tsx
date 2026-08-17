import React, { useState, useEffect } from 'react';
import { HTMLSimulation } from '../types';
import { loadSimulationHtmlContent } from '../lib/simulationStorage';

interface SimulationFrameProps {
  simulation?: HTMLSimulation | null;
  fallbackUrl?: string;
  className?: string;
  title?: string;
  sandbox?: string;
}

export function SimulationFrame({
  simulation,
  fallbackUrl,
  className = "absolute inset-0 w-full h-full border-0 bg-white",
  title = "Mô phỏng",
  sandbox,
}: SimulationFrameProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (simulation && simulation.htmlContent) {
      setLoading(true);
      loadSimulationHtmlContent(simulation)
        .then((decompressed) => {
          if (isMounted) {
            setRenderedHtml(decompressed);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Lỗi giải nén mô phỏng:', err);
          if (isMounted) {
            setRenderedHtml(simulation.htmlContent || '');
            setLoading(false);
          }
        });
    } else {
      setRenderedHtml('');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [simulation]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 z-10">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-200">Đang khởi chạy mô phỏng Tương tác...</p>
      </div>
    );
  }

  if (renderedHtml) {
    return (
      <iframe
        srcDoc={renderedHtml}
        className={className}
        allowFullScreen
        sandbox={sandbox}
        title={title || simulation?.title}
      />
    );
  }

  const targetUrl = simulation?.url || fallbackUrl;

  if (targetUrl) {
    return (
      <iframe
        src={targetUrl}
        className={className}
        allowFullScreen
        sandbox={sandbox}
        title={title || simulation?.title}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 font-medium">
      Chưa có nội dung mô phỏng
    </div>
  );
}
