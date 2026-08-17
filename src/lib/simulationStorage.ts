import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { HTMLSimulation } from '../types';

/**
 * Compresses HTML text using native Web API CompressionStream (GZIP)
 */
export async function compressHtml(text: string): Promise<string> {
  if (!text) return '';
  try {
    const stream = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'GZIP:' + btoa(binary);
  } catch (err) {
    console.warn('CompressionStream not supported or failed, using raw string:', err);
    return text;
  }
}

/**
 * Decompresses HTML text using native Web API DecompressionStream (GZIP)
 */
export async function decompressHtml(compressed: string): Promise<string> {
  if (!compressed) return '';
  if (!compressed.startsWith('GZIP:')) return compressed;
  try {
    const base64 = compressed.slice(5);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return await response.text();
  } catch (err) {
    console.error('Decompression failed:', err);
    return compressed;
  }
}

/**
 * Saves a simulation to Firestore with automatic compression and chunking if payload is large.
 */
export async function saveSimulationToFirestore(simData: HTMLSimulation): Promise<void> {
  const simId = simData.id || `sim_${Date.now()}`;
  const rawHtml = simData.htmlContent || '';

  let processedHtml = '';
  let isChunked = false;
  let chunks: string[] = [];

  if (rawHtml) {
    const compressed = await compressHtml(rawHtml);
    // Firestore doc size limit is 1,048,576 bytes. We use 700,000 chars as safe limit per doc.
    if (compressed.length > 700000) {
      isChunked = true;
      processedHtml = 'CHUNKED_GZIP';
      const chunkSize = 500000;
      for (let i = 0; i < compressed.length; i += chunkSize) {
        chunks.push(compressed.slice(i, i + chunkSize));
      }
    } else {
      processedHtml = compressed;
    }
  }

  const cleanSim: HTMLSimulation = {
    id: simId,
    title: simData.title || 'Mô phỏng mới',
    description: simData.description || '',
    url: simData.url || '',
    htmlContent: processedHtml,
    thumbnail: simData.thumbnail || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
    category: simData.category || 'Khác',
    hasQuiz: !!simData.hasQuiz,
    teacherId: simData.teacherId || '',
    teacherName: simData.teacherName || 'Giáo viên',
  };

  // 1. Write main simulation document
  await setDoc(doc(db, 'simulations', simId), cleanSim);

  // 2. If chunked, write subcollection docs
  if (isChunked && chunks.length > 0) {
    const batch = writeBatch(db);
    chunks.forEach((chunkStr, index) => {
      const chunkRef = doc(db, 'simulations', simId, 'chunks', `chunk_${index}`);
      batch.set(chunkRef, { index, content: chunkStr });
    });
    await batch.commit();
  }
}

/**
 * Loads the full HTML content for a simulation, handling decompression and chunks if necessary.
 */
export async function loadSimulationHtmlContent(sim: HTMLSimulation): Promise<string> {
  if (!sim.htmlContent) return '';

  if (sim.htmlContent === 'CHUNKED_GZIP') {
    try {
      const chunksSnap = await getDocs(collection(db, 'simulations', sim.id, 'chunks'));
      const chunkList: { index: number; content: string }[] = [];
      chunksSnap.forEach((d) => {
        const data = d.data();
        chunkList.push({ index: data.index ?? 0, content: data.content || '' });
      });
      chunkList.sort((a, b) => a.index - b.index);
      const fullCompressed = chunkList.map((c) => c.content).join('');
      return await decompressHtml(fullCompressed);
    } catch (err) {
      console.error('Lỗi khi tải chunks mô phỏng:', err);
      return '';
    }
  }

  if (sim.htmlContent.startsWith('GZIP:')) {
    return await decompressHtml(sim.htmlContent);
  }

  return sim.htmlContent;
}
