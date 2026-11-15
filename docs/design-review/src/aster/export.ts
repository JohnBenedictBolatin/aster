import { METRICS, type ScenarioWorkspace } from './domain.ts';

/** Prepare optional private material for an on-device handoff after an explicit user opt-in. */
export function privateMaterialForHandoff(workspace: ScenarioWorkspace, draftNote = ''): string {
  const lines = draftNote.trim() ? [draftNote.trim()] : [];
  for (const observation of workspace.observations) {
    if (observation.note.trim()) lines.push(`${METRICS[observation.metric].label} · ${observation.at}: ${observation.note.trim()}`);
  }
  for (const context of workspace.contexts) {
    if (context.private || context.kind === 'crew note') {
      lines.push(`${context.kind} · ${context.at}: ${context.value}${context.note.trim() ? ` — ${context.note.trim()}` : ''}`);
    }
  }
  for (const investigation of workspace.investigations) {
    if (investigation.note.trim()) lines.push(`${investigation.title}: ${investigation.note.trim()}`);
  }
  return [...new Set(lines)].join('\n');
}

/** Remove private note text from every exportable path unless the crew member opts in. */
export function workspaceForExport(workspace: ScenarioWorkspace, includePrivateNotes: boolean): ScenarioWorkspace {
  return {
    ...workspace,
    observations: workspace.observations.map((item) => ({ ...item, note: includePrivateNotes ? item.note : '' })),
    contexts: workspace.contexts.map((item) => ({
      ...item,
      value: !includePrivateNotes && (item.private || item.kind === 'crew note') ? 'Private crew check-in omitted from this export' : item.value,
      note: includePrivateNotes ? item.note : '',
    })),
    events: workspace.events.map((item) => ({
      ...item,
      detail: !includePrivateNotes && (item.private || item.provenance === 'Private local crew note')
        ? 'Private crew text omitted from this export.' : item.detail,
    })),
    investigations: workspace.investigations.map((item) => ({ ...item, note: includePrivateNotes ? item.note : '' })),
    handoffs: workspace.handoffs.map((item) => ({
      ...item,
      privateNotes: includePrivateNotes ? item.privateNotes : '',
      includePrivateNotes: includePrivateNotes && item.includePrivateNotes,
    })),
  };
}
