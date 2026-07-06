/**
 * Renders a CardId as a crisp SVG playing card. If a matching PNG has been
 * dropped into /assets/cards/<Name>.png (using the original sprite names from
 * Engine.LookupAndLoadCardSprite), it is used instead — probed once and cached,
 * with the SVG always shown as the immediate fallback so a missing file never
 * produces a broken image.
 */

import { type CardId, BLANK_CARD_ID, rankOf, Suit, suitOf } from "../engine/index.js";

const SUIT_GLYPH: Record<Suit, string> = {
  [Suit.Spades]: "♠",
  [Suit.Hearts]: "♥",
  [Suit.Clubs]: "♣",
  [Suit.Diamonds]: "♦",
};

const SUIT_NAME: Record<Suit, string> = {
  [Suit.Spades]: "Spades",
  [Suit.Hearts]: "Hearts",
  [Suit.Clubs]: "Clubs",
  [Suit.Diamonds]: "Diamonds",
};

const RANK_LABEL: Record<number, string> = {
  1: "A", 11: "J", 12: "Q", 13: "K",
};

function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

/** Original sprite asset name, e.g. "Spades_A", "Hearts_10", "RBC" for blank. */
export function spriteName(id: CardId): string {
  if (id === BLANK_CARD_ID) return "RBC";
  const rank = rankOf(id);
  const label = rank === 10 ? "10" : rankLabel(rank);
  return `${SUIT_NAME[suitOf(id)]}_${label}`;
}

const artCache = new Map<string, boolean>();

function tryLoadArt(el: HTMLElement, id: CardId): void {
  if (id === BLANK_CARD_ID) return;
  const name = spriteName(id);
  const url = `assets/cards/${name}.png`;
  if (artCache.get(name) === false) return;
  const img = new Image();
  img.alt = name;
  img.className = "card-art";
  img.onload = () => {
    artCache.set(name, true);
    el.classList.add("has-art");
    el.appendChild(img);
  };
  img.onerror = () => artCache.set(name, false);
  img.src = url;
}

export function isRed(id: CardId): boolean {
  const s = suitOf(id);
  return s === Suit.Hearts || s === Suit.Diamonds;
}

/** Build a card face element (SVG-style CSS card + optional PNG overlay). */
export function cardFace(id: CardId): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  if (id === BLANK_CARD_ID) {
    el.classList.add("card-blank");
    return el;
  }
  const rank = rankLabel(rankOf(id));
  const glyph = SUIT_GLYPH[suitOf(id)];
  el.classList.add(isRed(id) ? "card-red" : "card-black");
  el.innerHTML = `
    <span class="corner tl">${rank}<i>${glyph}</i></span>
    <span class="pip">${glyph}</span>
    <span class="corner br">${rank}<i>${glyph}</i></span>`;
  tryLoadArt(el, id);
  return el;
}

/** An empty board slot (optionally interactive). */
export function emptySlot(): HTMLElement {
  const el = document.createElement("div");
  el.className = "card card-empty";
  return el;
}
