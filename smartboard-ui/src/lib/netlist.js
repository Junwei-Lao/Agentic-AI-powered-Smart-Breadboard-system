/**
 * Netlist builder: turns placed components into electrical nets.
 *
 * Wires short their two nodes together. Other parts (resistors, LEDs) keep
 * their pins on separate nets. Rails can be linked by the device config.
 */
import { componentPins, nodeOfHole, RAILS } from './boardModel.js';

function createUnionFind() {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    let n = x;
    while (parent.get(n) !== r) {
      const next = parent.get(n);
      parent.set(n, r);
      n = next;
    }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  return { find, union, keys: () => [...parent.keys()] };
}

/**
 * @returns {{
 *   netOfNode: (node:string)=>string,
 *   netOfPin: (componentId:string, pin:string)=>string|null,
 *   nets: Map<string, {id, nodes:string[], pins:{componentId,pin,hole}[], isVcc:boolean, isGnd:boolean}>,
 *   vccNet: string, gndNet: string, shorted: boolean
 * }}
 */
export function buildNetlist(components, config) {
  const uf = createUnionFind();
  RAILS.forEach((r) => uf.find(r));
  for (const [a, b] of config.linkedRails || []) uf.union(a, b);

  const pinNode = new Map(); // `${id}.${pin}` -> node
  for (const c of components) {
    for (const [pin, hole] of componentPins(c)) {
      const node = nodeOfHole(hole);
      if (!node) continue;
      uf.find(node);
      pinNode.set(`${c.id}.${pin}`, node);
    }
  }
  for (const c of components) {
    if (c.type !== 'wire') continue;
    const [[, h1] = [], [, h2] = []] = componentPins(c);
    const n1 = nodeOfHole(h1);
    const n2 = nodeOfHole(h2);
    if (n1 && n2) uf.union(n1, n2);
  }

  const vccNet = uf.find(config.vccRails[0]);
  const gndNet = uf.find(config.gndRails[0]);

  const nets = new Map();
  const ensure = (id) => {
    if (!nets.has(id)) nets.set(id, { id, nodes: [], pins: [], isVcc: id === vccNet, isGnd: id === gndNet });
    return nets.get(id);
  };
  for (const node of uf.keys()) ensure(uf.find(node)).nodes.push(node);
  for (const c of components) {
    for (const [pin, hole] of componentPins(c)) {
      const node = pinNode.get(`${c.id}.${pin}`);
      if (node) ensure(uf.find(node)).pins.push({ componentId: c.id, pin, hole, type: c.type });
    }
  }

  return {
    netOfNode: (node) => uf.find(node),
    netOfPin: (componentId, pin) => {
      const node = pinNode.get(`${componentId}.${pin}`);
      return node ? uf.find(node) : null;
    },
    nodeOfPin: (componentId, pin) => pinNode.get(`${componentId}.${pin}`) || null,
    nets,
    vccNet,
    gndNet,
    shorted: vccNet === gndNet,
  };
}
