/**
 * Converts diagnostics into a purely visual highlight description consumed
 * by <Breadboard />. Keeps the board component free of validation logic.
 */
import { formatHole, nodeOfHole } from './boardModel.js';

export const EMPTY_HIGHLIGHTS = {
  errorHoles: [],
  suggestedHoles: [],
  errorNodes: [],
  suggestedNodes: [],
  errorComponentIds: [],
  guides: [],
  corrections: [],
  tags: [],
  ghosts: [],
};

export function deriveBoardHighlights(diagnostics, project, components, { showGhosts = true } = {}) {
  if (!diagnostics) return EMPTY_HIGHLIGHTS;
  const h = {
    errorHoles: [],
    suggestedHoles: [],
    errorNodes: [],
    suggestedNodes: [],
    errorComponentIds: [],
    guides: [],
    corrections: [],
    tags: [],
    ghosts: [],
  };

  for (const issue of diagnostics.issues || []) {
    if (issue.severity === 'warning') continue;
    if (issue.componentId) h.errorComponentIds.push(issue.componentId);

    if (issue.code === 'MISPLACED_WIRE_END') {
      h.errorHoles.push(issue.wrongHole);
      h.errorNodes.push(issue.wrongNode);
      h.tags.push({ hole: issue.wrongHole, text: `${formatHole(issue.wrongHole)} · dead column`, tone: 'error', placement: 'below-right' });
      if (issue.suggestedHole) {
        h.suggestedHoles.push(issue.suggestedHole);
        h.suggestedNodes.push(issue.targetNode);
        h.guides.push({ from: issue.wrongHole, to: issue.suggestedHole });
        const wire = components.find((c) => c.id === issue.componentId);
        const anchor = wire && Object.entries(wire.pins).find(([pin]) => pin !== issue.wrongPin)?.[1];
        if (anchor) h.corrections.push({ anchor, to: issue.suggestedHole });
        h.tags.push({ hole: issue.suggestedHole, text: `Move here · ${formatHole(issue.suggestedHole)}`, tone: 'suggest', placement: 'above-left' });
      }
    }
    if (issue.code === 'LED_REVERSED') {
      (issue.holes || []).forEach((hole) => {
        h.errorHoles.push(hole);
        h.errorNodes.push(nodeOfHole(hole));
      });
      h.tags.push({ hole: issue.context.anode, text: 'LED reversed', tone: 'error', placement: 'below-right' });
    }
    if (issue.code === 'SHORT_CIRCUIT') {
      h.errorNodes.push('tp', 'tn');
    }
  }

  // Ghost placement hint for the active step when nothing is wrong.
  const active = diagnostics.activeStep;
  if (showGhosts && active && diagnostics.status !== 'error' && project?.steps) {
    const step = project.steps.find((s) => s.id === active.id);
    const ghost = step?.ghost;
    const alreadyPlaced = ghost && components.some((c) => c.id === ghost.id.replace('ghost-', ''));
    if (ghost && !alreadyPlaced) h.ghosts.push(ghost);
  }

  return h;
}
