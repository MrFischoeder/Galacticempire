import type { PlayerView } from '@ge/shared';
import { esc } from './html';

/**
 * Alliances and non-aggression pacts (spec 16, question 34): the player's alliance, invitations,
 * pacts and offers, with the actions. Actions use data-action (handled in main.ts).
 */
export function diplomacyHTML(
  me: string,
  players: PlayerView['players'],
  d: PlayerView['diplomacy'],
): string {
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const others = players.filter((p) => p.id !== me);
  const parts: string[] = ['<div class="panel-title">DIPLOMACY</div>'];

  parts.push('<div class="section">ALLIANCE</div>');
  if (d.alliance) {
    const al = d.alliance;
    parts.push(
      `<div><b>${esc(al.name)}</b> · ${al.members.length} / 6 members</div>`,
      `<div class="small">${al.members.map((m) => esc(name(m))).join(', ')}</div>`,
      al.invites.length
        ? `<div class="small dim">Invited: ${al.invites.map((m) => esc(name(m))).join(', ')}</div>`
        : '',
    );
    const invitable = others.filter(
      (p) => !al.members.includes(p.id) && !al.invites.includes(p.id),
    );
    if (invitable.length)
      parts.push(
        `<div class="row">${invitable.map((p) => `<button data-action="invite:${p.id}">Invite ${esc(p.name)}</button>`).join('')}</div>`,
      );
    parts.push(
      '<div class="row"><button data-action="leaveAlliance">Leave the alliance</button></div>',
    );
  } else {
    parts.push(
      '<div class="dim small">Allies see each other\'s planets, share the map and warnings, can carry resources to each other and station fleets to defend each other. They cannot attack each other.</div>',
      '<div class="row"><input id="allianceName" type="text" maxlength="24" placeholder="Alliance name" /><button data-action="createAlliance">Create</button></div>',
    );
  }
  for (const inv of d.invites)
    parts.push(
      `<div class="row-line"><span>Invitation: ${esc(inv.name)}</span><button data-action="acceptAlliance:${inv.id}">Join</button></div>`,
    );

  parts.push('<div class="section">NON-AGGRESSION PACTS</div>');
  for (const p of d.pacts) {
    const other = p.a === me ? p.b : p.a;
    parts.push(
      `<div class="row-line"><span>${esc(name(other))}${p.breakAt !== undefined ? ' · <span class="bad">ending</span>' : ''}</span>${p.breakAt === undefined ? `<button data-action="breakPact:${other}">Break (12 h)</button>` : ''}</div>`,
    );
  }
  for (const o of d.pactOffers) {
    if (o.to === me)
      parts.push(
        `<div class="row-line"><span>${esc(name(o.from))} offers a pact</span><button data-action="acceptPact:${o.from}">Accept</button></div>`,
      );
    else parts.push(`<div class="dim small">Offer sent to ${esc(name(o.to))}.</div>`);
  }
  const busy = new Set([
    ...d.pacts.flatMap((p) => [p.a, p.b]),
    ...d.pactOffers.flatMap((o) => [o.from, o.to]),
    ...(d.alliance?.members ?? []),
  ]);
  const free = others.filter((p) => !busy.has(p.id));
  parts.push(
    free.length
      ? `<div class="row">${free.map((p) => `<button data-action="proposePact:${p.id}">Pact with ${esc(p.name)}</button>`).join('')}</div>`
      : others.length === 0
        ? '<div class="dim small">No other players yet (debug: "+ rival").</div>'
        : '',
  );
  return parts.join('\n');
}
