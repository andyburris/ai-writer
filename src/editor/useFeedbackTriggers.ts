// useSentenceHashesFromHTML.ts
import { useEffect, useState } from "react";

function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function splitSentences(text: string): string[] {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(text), s => s.segment.trim()).filter(Boolean);
  } else {
    return text.split(/(?<=[.?!])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  }
}

export interface SentenceHash {
  id: string;
  text: string;
  hash: string;
  paragraphID: string;
  sentenceIndex: number;
}

export function useSentenceHashesFromHTML(html: string): Record<string, SentenceHash> {
  const [hashMap, setHashMap] = useState<Record<string, SentenceHash>>({});

  useEffect(() => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const paragraphs = Array.from(container.querySelectorAll("p"));
    const result: Record<string, SentenceHash> = {};

    paragraphs.forEach((p, paraIndex) => {
      const text = p.textContent || "";
      const sentences = splitSentences(text);
      const paraId = p.getAttribute("data-id") || `${paraIndex}`;

      sentences.forEach((sentence, sentIndex) => {
        const id = `${paraId}:${sentIndex}`;
        result[id] = {
          id,
          text: sentence,
          hash: hashString(sentence),
          paragraphID: paraId,
          sentenceIndex: sentIndex,
        };
      });
    });

    setHashMap(result);
  }, [html]);

  return hashMap;
}

// useReadyParagraphsOnCursorExit.ts
import { useRef } from "react";
import { Editor } from "@tiptap/react";

export function useReadyParagraphsOnCursorExit(editor: Editor | null) {
  const [readyParagraphs, setReadyParagraphs] = useState<Set<string>>(new Set());
  const lastParagraphID = useRef<string | null>(null);

  function getCurrentParagraphID(): string | null {
    const selection = editor?.state?.selection;
    if (!selection) return null;

    const pos = selection.$from;
    for (let i = pos.depth; i >= 0; i--) {
      const node = pos.node(i);
      if (node.type.name === "paragraph") {
        const dataId = node.attrs.dataId;
        if (dataId) return dataId;
        return `${pos.index(i)}`;
      }
    }
    return null;
  }

  useEffect(() => {
    if (!editor) return;

    const callback = () => {
      const currentParaId = getCurrentParagraphID();
      const previousParaId = lastParagraphID.current;

      if (previousParaId && previousParaId !== currentParaId) {
        setReadyParagraphs(prev => new Set(prev).add(previousParaId));
      }

      lastParagraphID.current = currentParaId;
    };

    editor.on("selectionUpdate", callback);

    return () => {
      editor.off("selectionUpdate", callback);
    };
  }, [editor]);

  function markParagraphSent(paragraphID: string) {
    setReadyParagraphs(prev => {
      const next = new Set(prev);
      next.delete(paragraphID);
      return next;
    });
  }

  return {
    readyParagraphs,
    markParagraphSent,
  };
}


// useFeedbackCoordinator.ts
interface ParagraphSnapshot {
  paragraphID: string;
  hashes: string[];
}

export function useFeedbackCoordinator(editor: Editor | null, html: string) {
    const sentenceHashes = useSentenceHashesFromHTML(html);
    const { readyParagraphs, markParagraphSent } = useReadyParagraphsOnCursorExit(editor);
  
    const lastParagraphSnapshots = useRef<Record<string, ParagraphSnapshot>>({});
  
    useEffect(() => {
      if (!editor) return;
      if (readyParagraphs.size === 0) return;
  
      const toSend: { paragraphID: string; sentences: { text: string; hash: string }[] }[] = [];
      const skipped: string[] = [];
  
      readyParagraphs.forEach(paragraphID => {
        const sentencesInParagraph = Object.values(sentenceHashes).filter(
          s => s.paragraphID === paragraphID
        );
  
        const currentHashes = sentencesInParagraph.map(s => s.hash);
        const previousSnapshot = lastParagraphSnapshots.current[paragraphID];
  
        const isEmpty = sentencesInParagraph.length === 0;
        const hasChanged =
          !previousSnapshot ||
          currentHashes.length !== previousSnapshot.hashes.length ||
          currentHashes.some((h, i) => h !== previousSnapshot.hashes[i]);
  
        if (isEmpty || !hasChanged) {
            skipped.push(paragraphID);
        } else {
            toSend.push({
                paragraphID,
                sentences: sentencesInParagraph.map(s => ({ text: s.text, hash: s.hash })),
            });
        }
        
        // Always update the snapshot, even if skipped
        lastParagraphSnapshots.current[paragraphID] = {
            paragraphID,
            hashes: currentHashes,
        };
  
        markParagraphSent(paragraphID);
      });
  
      // Grouped Logging
      if (toSend.length > 0) {
        console.groupCollapsed(`✉️ Sending feedback for ${toSend.length} paragraph(s)`);
        toSend.forEach(p => {
          console.group(`Paragraph ${p.paragraphID}`);
          p.sentences.forEach(s =>
            console.log(`- "${s.text}" [hash: ${s.hash}]`)
          );
          console.groupEnd();
        });
        console.groupEnd();
      }
  
      if (skipped.length > 0) {
        console.groupCollapsed(`🔁 Skipped ${skipped.length} paragraph(s)`);
        skipped.forEach(pid => console.log(`- Paragraph ${pid}`));
        console.groupEnd();
      }
  
      // 🛠️ Later: instead of console.group, call sendFeedbackBatch(toSend)
    }, [readyParagraphs, sentenceHashes, editor]);
  }
