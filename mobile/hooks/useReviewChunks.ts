/**
 * useReviewChunks — Hook que quebra o texto da review em pedaços navegáveis.
 * Retorna os chunks, o texto atualmente exibido e funções de navegação.
 */
import { useState, useMemo } from 'react';
import { REVIEW_CHUNK_SIZE } from '../constants/storyConfig';

/** Quebra o texto da review em pedaços menores */
function splitReviewText(text: string): string[] {
  if (!text || text.length <= REVIEW_CHUNK_SIZE) return [text];

  // Tenta separar por parágrafos primeiro
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  if (paragraphs.length > 1) return paragraphs;

  // Fallback: separa por sentenças respeitando o tamanho máximo
  const chunks: string[] = [];
  let current = '';
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (current.length + sentence.length > REVIEW_CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export function useReviewChunks(reviewText: string) {
  const [selectedChunk, setSelectedChunk] = useState(0);

  const chunks = useMemo(() => splitReviewText(reviewText), [reviewText]);
  const displayText = chunks.length > 0 ? chunks[selectedChunk] ?? '' : '';

  const goNext = () => setSelectedChunk(prev => Math.min(chunks.length - 1, prev + 1));
  const goPrev = () => setSelectedChunk(prev => Math.max(0, prev - 1));
  const goTo = (index: number) => setSelectedChunk(index);
  const reset = () => setSelectedChunk(0);

  return {
    chunks,
    displayText,
    selectedChunk,
    totalChunks: chunks.length,
    hasMultipleChunks: chunks.length > 1,
    isFirst: selectedChunk === 0,
    isLast: selectedChunk >= chunks.length - 1,
    goNext,
    goPrev,
    goTo,
    reset,
  };
}
