"use client";

import { useEffect } from "react";

/**
 * 「当前单词」全局总线：学习卡片/听写/详情页把正在看的单词注册进来，
 * Ctrl+Q 快捷键据此收藏。模块级单例，同标签页内所有客户端组件共享。
 */
let current: string | null = null;

export function setCurrentWord(wordId: string | null) {
  current = wordId;
}

export function getCurrentWord(): string | null {
  return current;
}

/** 在组件里把当前单词注册进总线（卸载时若仍是自己则清空）。 */
export function useCurrentWord(wordId: string | null | undefined) {
  useEffect(() => {
    if (!wordId) return;
    setCurrentWord(wordId);
    return () => {
      if (getCurrentWord() === wordId) setCurrentWord(null);
    };
  }, [wordId]);
}