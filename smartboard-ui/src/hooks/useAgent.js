/**
 * Agent runtime hook.
 *
 * Watches the hardware event stream. Every new event triggers a proactive
 * run: tools execute one by one (animated), then the agent posts its message
 * and publishes the diagnostics snapshot it reported on (`assessment`).
 * The workspace highlights come from that published assessment so the board
 * only shows an error once the agent has "found" it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { disconnectedMessage, newMessageId, planAgentRun } from '../lib/agentEngine.js';
import { askAgent } from '../lib/agentService.js';
import { eventTriggerLabel } from '../lib/hardwareEvents.js';

const TOOL_MS = 520;
const TYPING_MS = 800;

const markTool = (s, idx, status) =>
  s.run ? { ...s, run: { ...s.run, tools: s.run.tools.map((t, i) => (i === idx ? { ...t, status } : t)) } } : s;

export function useAgent({ hardware, diagnostics, project }) {
  const connected = hardware.connection === 'connected';
  const [state, setState] = useState({
    status: connected ? 'monitoring' : 'standby', // standby | monitoring | analyzing | responding
    messages: [],
    run: null,
    activity: [],
    assessment: null,
  });

  const timers = useRef([]);
  const pending = useRef(null); // { message, diag } of a run still animating
  const lastEventId = useRef(undefined);
  const prevDiag = useRef(null);
  const latest = useRef({});
  latest.current = { hardware, diagnostics, project };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const schedule = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  /** Animate a list of tools, then deliver `finish`. */
  const animate = useCallback((tools, startAt, toolMs, finish) => {
    let t = startAt;
    tools.forEach((tool, idx) => {
      schedule(() => setState((s) => markTool(s, idx, 'running')), t);
      t += toolMs;
      schedule(
        () =>
          setState((s) => ({
            ...markTool(s, idx, 'done'),
            activity: [
              { id: newMessageId('act'), ts: Date.now(), tool: tool.id, label: tool.label, detail: tool.detail, tone: tool.tone },
              ...s.activity,
            ].slice(0, 80),
          })),
        t,
      );
    });
    schedule(() => setState((s) => ({ ...s, status: 'responding' })), t + 60);
    schedule(finish, t + TYPING_MS);
  }, []);

  const startRun = useCallback(
    (event) => {
      clearTimers();
      // A newer event interrupts the current run: deliver its message now so
      // no observation is lost, then start the new analysis.
      const interrupted = pending.current;
      pending.current = null;
      const { hardware: hw, diagnostics: diag, project: proj } = latest.current;
      const plan = planAgentRun({ event, prevDiagnostics: prevDiag.current, diagnostics: diag, project: proj, hardware: hw });
      prevDiag.current = diag;
      pending.current = { message: plan.message };
      setState((s) => ({
        ...s,
        messages: interrupted ? [...s.messages, interrupted.message].slice(-60) : s.messages,
        status: 'analyzing',
        run: {
          id: newMessageId('run'),
          kind: 'proactive',
          trigger: eventTriggerLabel(event),
          startedAt: Date.now(),
          tools: plan.tools.map((t) => ({ ...t, status: 'pending' })),
        },
      }));
      animate(plan.tools, 220, TOOL_MS, () => {
        pending.current = null;
        setState((s) => ({
          ...s,
          status: latest.current.hardware.connection === 'connected' ? 'monitoring' : 'standby',
          assessment: diag,
          messages: [...s.messages, plan.message].slice(-60),
          run: s.run && { ...s.run, finishedAt: Date.now() },
        }));
      });
    },
    [animate],
  );

  // React to the hardware event stream.
  const latestEvent = hardware.events[0];
  useEffect(() => {
    const id = latestEvent?.id ?? null;
    if (lastEventId.current === undefined) {
      lastEventId.current = id;
      if (connected) startRun(null);
      else setState((s) => ({ ...s, status: 'standby', messages: [disconnectedMessage()] }));
      return;
    }
    if (id === lastEventId.current) return;
    lastEventId.current = id;
    if (id) startRun(latestEvent);
    else {
      // Session cleared.
      clearTimers();
      pending.current = null;
      prevDiag.current = null;
      setState({ status: 'standby', messages: [disconnectedMessage()], run: null, activity: [], assessment: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEvent?.id]);

  // Track plain connection changes (e.g. "connecting") without a run.
  useEffect(() => {
    setState((s) =>
      s.status === 'analyzing' || s.status === 'responding'
        ? s
        : { ...s, status: hardware.connection === 'connected' ? 'monitoring' : 'standby' },
    );
  }, [hardware.connection]);

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q) return;
      setState((s) => ({
        ...s,
        status: 'analyzing',
        messages: [...s.messages, { id: newMessageId('user'), role: 'user', text: q, ts: Date.now() }],
        run: { id: newMessageId('run'), kind: 'chat', trigger: 'USER_QUESTION', startedAt: Date.now(), tools: [] },
      }));
      const { hardware: hw, project: proj } = latest.current;
      const diag = state.assessment || latest.current.diagnostics;
      const { tools, message } = await askAgent(q, { diagnostics: diag, project: proj, hardware: hw });
      setState((s) => ({ ...s, run: { ...s.run, tools: tools.map((t) => ({ ...t, status: 'pending' })) } }));
      animate(tools, 0, 260, () =>
        setState((s) => ({
          ...s,
          status: latest.current.hardware.connection === 'connected' ? 'monitoring' : 'standby',
          messages: [...s.messages, message].slice(-60),
          run: s.run && { ...s.run, finishedAt: Date.now() },
        })),
      );
    },
    [animate, state.assessment],
  );

  return { ...state, ask };
}
