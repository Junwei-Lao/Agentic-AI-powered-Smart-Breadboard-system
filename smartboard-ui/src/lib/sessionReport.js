import { validateCircuit } from './circuitValidator.js';
import { applyHardwareEvent, describeEvent, initialHardwareState } from './hardwareEvents.js';

export function reportSession(events, project, boardConfig) {
  const chronological = [...events].reverse();
  const fullHistory = Boolean(chronological.length && chronological.every((event, index) => event.seq === index + 1));
  let board = initialHardwareState;
  let firstFault = null;
  let firstFix = null;

  const rows = chronological.map((event) => {
    const description = describeEvent(event);
    const row = {
      seq: event.seq,
      time: event.ts,
      source: event.source,
      type: event.type,
      title: description.title,
      detail: description.detail,
      status: '',
      issues: [],
    };
    if (!fullHistory) return row;
    board = applyHardwareEvent(board, event);
    if (event.type === 'BOARD_RESET') {
      firstFault = null;
      firstFix = null;
    }
    if (board.connection !== 'connected') {
      row.status = 'disconnected';
      return row;
    }
    const result = validateCircuit({ components: board.components, project, boardConfig });
    if (firstFault === null && result.status === 'error') firstFault = event.ts;
    if (firstFault !== null && firstFix === null && result.status === 'complete') firstFix = event.ts;
    return { ...row, status: result.status, issues: result.issues.map(issue => issue.code) };
  });

  return {
    rows,
    fullHistory,
    recoveryMs: firstFix === null ? null : Math.max(0, firstFix - firstFault),
  };
}

export function toSessionCsv(rows, project) {
  const csvField = value => {
    const text = String(value ?? '');
    const literal = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + literal.replaceAll('"', '""') + '"';
  };
  const lines = [
    ['sequence', 'timestamp_utc', 'source', 'project', 'event', 'detail', 'circuit_status', 'issue_codes'],
    ...rows.map(row => [
      row.seq, new Date(row.time).toISOString(), row.source, project.title, row.type, row.detail, row.status, row.issues.join(' | '),
    ]),
  ];
  return lines.map(line => line.map(csvField).join(',')).join('\r\n') + '\r\n';
}
