import type { ReactionSession } from './domain.ts';

export function reactionMedian(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[mid] : Math.round((ordered[mid - 1] + ordered[mid]) / 2);
}

export function comparableReactionSessions(sessions: ReactionSession[], version: ReactionSession['version'], input: ReactionSession['input']) {
  return sessions.filter((session) => !session.interrupted && session.responsesMs.length > 0
    && session.version === version && session.input === input);
}
