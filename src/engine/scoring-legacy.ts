/**
 * PHASE-1 "UGLY" PORT — do not clean up.
 *
 * Statement-for-statement port of the scoring core of the decompiled
 * Engine.cs (Unity, PokerStraights): GetNameOfHand, HandIDValue,
 * LookupHandPointValue, LookUpFactorPointValue, AddScoreToHand and the
 * CalculateScoreForHand driver, plus the CardWithScoringInfo / SameKind
 * helper classes. Field-mutation order is preserved exactly; variable names
 * mirror the decompile (num, num3, flag2, ...) with meaning noted once.
 *
 * Deliberately preserved quirks (all verified against the decompile):
 * - LookupHandPointValue MUTATES the `points` field and returns it; callers
 *   rely on both the return value and the side effect.
 * - HandIDValue's `handIDString` parameter SHADOWS the field of the same
 *   name: assignments inside stay local and are returned; the field is only
 *   written inside GetNameOfHand (quad + golf branches). `points` inside
 *   HandIDValue is the field and IS mutated.
 * - CalculateScoreForHand calls GetNameOfHand TWICE before scoring.
 * - Non-royal straight flush, poker branch: `num = num10` is assigned
 *   OUTSIDE the `if (num10 > num)` guard.
 * - Golf-mode 3-card royal (Q,K,A suited): LookupHandPointValue(14, 3) has
 *   no matching case, so `points` is returned unchanged (stale-state bug in
 *   the original). With per-hand-reset state this yields 0.
 * - The _isEagleSF / _isEagle4K / _is4K flags are reset when a new card is
 *   drawn in the original (CreateNewPlayingCard), i.e. before each hand
 *   completes in normal play. resetPerCardFlags() reproduces that reset; the
 *   original can score two simultaneously-completed hands without a reset in
 *   between, which is a gameplay-sequence artifact not reproduced by
 *   board-state scoring.
 *
 * The letter → hand-type mapping decoded from HandIDValue / GetNameOfHand:
 *   nameID  1 Royal Flush      5A
 *   nameID  2 Straight Flush   5B 4A 3A   (royal below 5 cards = plain SF)
 *   nameID  3 Four of a Kind   5C 4B
 *   nameID  4 Full House       5D
 *   nameID  5 Flush            5E 4F 3D
 *   nameID  6 Straight         5F 4D 3C
 *   nameID  7 Three of a Kind  5G 4C 3B
 *   nameID  8 Two Pairs        5H 4E
 *   nameID  9 Pair             5I 4G 3E
 *   nameID 10 High Card        5J 4H 3F
 * (golf-mode nameIDs 12-19 = Albatross..Double share the same letters)
 */

/* eslint-disable prefer-const */

export enum GameMode {
  Unknown = 0,
  GolfMode = 1,
  PokerStraightsMode = 2,
}

/** Port of CardWithScoringInfo: id = (type-1)*100 + number; blank id 500 → number 0, type 6. */
export class CardWithScoringInfo {
  id: number;
  number: number;
  type: number;

  constructor(id: number) {
    this.id = id;
    this.number = id % 100;
    this.type = Math.floor(id / 100) + 1; // Spades 1, Hearts 2, Clubs 3, Diamonds 4
  }
}

/** Port of SameKind. */
class SameKind {
  cardNumber: number;
  count = 0;
  constructor(cardNumber: number) {
    this.cardNumber = cardNumber;
  }
}

export interface HandScore {
  points: number;
  handID: string;
  factorValue: string;
  handName: string;
}

export class LegacyScoringEngine {
  gameMode: GameMode;
  private mode = 0; // never set in the original; always 0

  // mutated instance fields, exactly as in Engine.cs
  points = 0;
  handIDString = "";
  factorValues = "";
  factorValue01 = "";
  factorValue02 = "";
  factorString = "";
  primaryFactor = 0;
  secondaryFactor = 0;
  totalScore = 0;
  doNotAddToScore = false;
  _isEagleSF = false;
  _isEagle4K = false;
  _is4K = false;
  /** display text produced by AddScoreToHand (the Unity popup text). */
  lastHandName = "";

  constructor(gameMode: GameMode = GameMode.PokerStraightsMode) {
    this.gameMode = gameMode;
  }

  /** CreateNewPlayingCard resets these when a new card is drawn (before the next hand completes). */
  resetPerCardFlags(): void {
    this._isEagle4K = false;
    this._isEagleSF = false;
    this._is4K = false;
  }

  /** Port of CalculateScoreForHand (minus Unity/CardHand plumbing). */
  calculateScoreForHand(cards: readonly CardWithScoringInfo[], addToTotalScore: boolean): HandScore | null {
    const nameOfHand = this.getNameOfHand(cards);
    if (cards.length < 6) {
      const nameOfHand2 = this.getNameOfHand(cards);
      const text = this.handIDValue(nameOfHand2, cards.length, this.handIDString, nameOfHand);
      const factorValue = this.factorValues;
      this.addScoreToHand(nameOfHand2, this.points, addToTotalScore);
      return { points: this.points, handID: text, factorValue, handName: this.lastHandName };
    }
    return null;
  }

  /** Port of GetNameOfHand. Returns the hand-name ID; mutates points/handIDString/factor fields. */
  getNameOfHand(cards: readonly CardWithScoringInfo[]): number {
    let num = 0; // best point value found so far
    let result = 0; // hand-name id to return
    if (this.gameMode === GameMode.PokerStraightsMode) {
      num = -20;
      result = 10;
    }
    if (this.gameMode === GameMode.GolfMode) {
      if (cards.length === 4 || cards.length === 5) {
        num = -20;
        result = 19;
      }
      if (cards.length === 3) {
        num = -20;
        result = 19;
      } else {
        num = -20;
        result = 19;
      }
    }
    // flag: all cards share one suit
    let flag = true;
    let num2 = -1;
    for (const card of cards) {
      if (num2 === -1) {
        num2 = card.type;
      } else if (num2 !== card.type) {
        flag = false;
        break;
      }
    }
    // flag2: straight
    let flag2 = false;
    const linkedList: number[] = [];
    for (const card2 of cards) {
      if (card2.number === 1) {
        linkedList.push(1);
      } else {
        linkedList.push(card2.number);
      }
    }
    let num3 = 50; // lowest card number
    let num4 = 0; // primary factor card number
    let num5 = 0;
    let num6 = 0; // secondary factor card number
    let num7 = 0; // three-of-a-kind card number
    let num8 = 0; // first pair card number
    let num9 = 0; // second pair card number
    let flag3 = false; // four of a kind
    let flag4 = false; // full house
    let flag5 = false; // flush
    let flag6 = false; // straight (branch bookkeeping)
    let flag7 = false; // three of a kind (only)
    let flag8 = false; // two pairs
    let flag9 = false; // one pair
    let flag10 = false; // high card / nothing
    for (const item of linkedList) {
      if (item < num3) {
        num3 = item;
      }
    }
    let flag11 = false; // has Ace
    let flag12 = false; // has King
    let flag13 = false; // has Ten
    let flag14 = false; // has three of a kind
    let flag15 = false; // has (at least) one pair
    let flag16 = false; // has a second pair
    for (const card3 of cards) {
      if (card3.number === 1) {
        flag11 = true;
      } else if (card3.number === 13) {
        flag12 = true;
      }
      if (card3.number === 10) {
        flag13 = true;
      }
    }
    if (cards.length === 5) {
      if (flag13) {
        if (flag11) {
          num3 = 10;
          if (
            linkedList.includes(num3 + 1) &&
            linkedList.includes(num3 + 2) &&
            linkedList.includes(num3 + 3) &&
            linkedList.includes(1)
          ) {
            flag2 = true;
          }
        } else if (
          linkedList.includes(num3 + 1) &&
          linkedList.includes(num3 + 2) &&
          linkedList.includes(num3 + 3) &&
          linkedList.includes(num3 + 4)
        ) {
          flag2 = true;
        }
      }
      if (
        linkedList.includes(num3 + 1) &&
        linkedList.includes(num3 + 2) &&
        linkedList.includes(num3 + 3) &&
        linkedList.includes(num3 + 4)
      ) {
        flag2 = true;
      }
    } else if (cards.length === 4) {
      if (flag12) {
        if (flag11) {
          if (linkedList.includes(11)) {
            num3 = 11;
            if (linkedList.includes(num3 + 1) && linkedList.includes(num3 + 2) && linkedList.includes(1)) {
              flag2 = true;
            }
          }
        } else if (
          linkedList.includes(num3 + 1) &&
          linkedList.includes(num3 + 2) &&
          linkedList.includes(num3 + 3)
        ) {
          flag2 = true;
        }
      }
      if (linkedList.includes(num3 + 1) && linkedList.includes(num3 + 2) && linkedList.includes(num3 + 3)) {
        flag2 = true;
      }
    } else if (cards.length === 3) {
      if (flag12) {
        if (flag11) {
          if (linkedList.includes(12)) {
            num3 = 12;
            if (linkedList.includes(num3 + 1) && linkedList.includes(1)) {
              flag2 = true;
            }
          }
        } else if (linkedList.includes(num3 + 1) && linkedList.includes(num3 + 2)) {
          flag2 = true;
        }
      }
      if (linkedList.includes(num3 + 1) && linkedList.includes(num3 + 2)) {
        flag2 = true;
      }
    }
    // distinct card numbers, in first-seen order
    const linkedList2: number[] = [];
    for (const card4 of cards) {
      if (!linkedList2.includes(card4.number)) {
        linkedList2.push(card4.number);
      }
    }
    const linkedList3: SameKind[] = [];
    for (const item2 of linkedList2) {
      const sameKind = new SameKind(item2);
      for (const card5 of cards) {
        if (card5.number === item2) {
          sameKind.count++;
        }
      }
      linkedList3.push(sameKind);
    }
    for (const item3 of linkedList3) {
      if (item3.count === 4) {
        flag3 = true;
        num4 = item3.cardNumber;
        num6 = num4;
        const num10 = this.lookupHandPointValue(3, cards.length);
        if (num10 <= num) {
          continue;
        }
        if (this.gameMode === GameMode.PokerStraightsMode) {
          this._is4K = true;
          result = 3;
          if (cards.length === 5) {
            this.handIDString = "5C";
          } else if (cards.length === 4) {
            this.handIDString = "4B";
          }
          num = num10;
        } else {
          if (this.gameMode !== GameMode.GolfMode) {
            continue;
          }
          this._isEagle4K = true;
          if (this._isEagle4K) {
            if (cards.length === 5) {
              result = 13;
              this.handIDString = "5C";
            } else if (cards.length === 4) {
              result = 13;
              this.handIDString = "4B";
            }
            num = num10;
          }
        }
      } else if (item3.count === 3) {
        num7 = item3.cardNumber;
        flag14 = true;
      } else {
        if (item3.count !== 2) {
          continue;
        }
        if (flag15) {
          num9 = item3.cardNumber;
          if (flag11) {
            if (num8 === 1) {
              num4 = num8;
              num6 = num9;
            } else if (num9 === 1) {
              num4 = num9;
              num6 = num8;
            }
          }
          if (num8 > num9) {
            num4 = num8;
            num6 = num9;
          } else {
            num4 = num9;
            num6 = num8;
          }
          flag16 = true;
          flag8 = true;
          flag9 = false;
        } else {
          num8 = item3.cardNumber;
          flag9 = true;
          flag15 = true;
          if (flag14) {
            void item3.cardNumber; // `_ = item3.cardNumber;` in the decompile
          }
        }
      }
    }
    if (flag14 && flag15) {
      flag4 = true;
      flag9 = false;
      flag8 = false;
      const num10 = this.lookupHandPointValue(4, cards.length);
      if (num10 > num) {
        result = 4;
        if (this.gameMode === GameMode.GolfMode) {
          result = 15;
          this.handIDString = "5D";
        }
        num = num10;
      }
    } else if (flag14) {
      flag7 = true;
      const num10 = this.lookupHandPointValue(7, cards.length);
      if (num10 > num) {
        result = 7;
        if (this.gameMode === GameMode.GolfMode) {
          if (cards.length === 5) {
            result = 17;
            this.handIDString = "5G";
          } else if (cards.length === 4) {
            result = 15;
            this.handIDString = "4C";
          } else if (cards.length === 3) {
            result = 15;
            this.handIDString = "3B";
          }
        }
        num = num10;
      }
    } else if (flag15 && flag16) {
      flag8 = true;
      const num10 = this.lookupHandPointValue(8, cards.length);
      if (num10 > num) {
        result = 8;
        if (this.gameMode === GameMode.GolfMode) {
          result = 17;
          if (cards.length === 5) {
            this.handIDString = "5H";
          } else if (cards.length === 4) {
            this.handIDString = "4E";
          }
        }
        num = num10;
      }
    } else if (flag15) {
      flag9 = true;
      const num10 = this.lookupHandPointValue(9, cards.length);
      if (num10 > num) {
        result = 9;
        if (this.gameMode === GameMode.GolfMode) {
          if (cards.length === 5) {
            result = 18;
            this.handIDString = "5I";
          } else if (cards.length === 4) {
            result = 18;
            this.handIDString = "4G";
          } else if (cards.length === 3) {
            result = 17;
            this.handIDString = "3E";
          }
        }
        num = num10;
      }
    }
    if (flag) {
      if (flag2) {
        flag5 = true;
        flag6 = true;
        if (flag12 && flag11) {
          if (cards.length === 5) {
            const num10 = this.lookupHandPointValue(1, cards.length);
            if (this.gameMode === GameMode.GolfMode) {
              if (num10 > num) {
                result = 12;
                this.handIDString = "5A";
                num = num10;
              }
            } else if (this.gameMode === GameMode.PokerStraightsMode && num10 > num) {
              result = 1;
              num = num10;
            }
          }
          if (cards.length === 4) {
            if (this.gameMode === GameMode.GolfMode) {
              this._isEagleSF = true;
              const num10 = this.lookupHandPointValue(13, cards.length);
              if (num10 > num) {
                result = 13;
                this.handIDString = "4A";
                num = num10;
              }
            } else if (this.gameMode === GameMode.PokerStraightsMode) {
              const num10 = this.lookupHandPointValue(2, cards.length);
              if (num10 > num) {
                result = 2;
                num = num10;
              }
            }
          }
          if (cards.length === 3) {
            if (this.gameMode === GameMode.GolfMode) {
              this._isEagleSF = true;
              const num10 = this.lookupHandPointValue(14, cards.length);
              if (num10 > num) {
                result = 14;
                this.handIDString = "3A";
                num = num10;
              }
            } else if (this.gameMode === GameMode.PokerStraightsMode) {
              const num10 = this.lookupHandPointValue(2, cards.length);
              if (num10 > num) {
                result = 2;
                num = num10;
              }
            }
          }
        } else {
          this._isEagleSF = true;
          if (this.gameMode === GameMode.PokerStraightsMode) {
            const num10 = this.lookupHandPointValue(2, cards.length);
            if (num10 > num) {
              result = 2;
            }
            num = num10; // unconditional in the original
          }
          if (this.gameMode === GameMode.GolfMode) {
            const num10 = this.lookupHandPointValue(13, cards.length);
            if (num10 > num) {
              if ((this.gameMode as GameMode) === GameMode.PokerStraightsMode) {
                result = 13; // dead code in the original, preserved
              }
              if (this.gameMode === GameMode.GolfMode) {
                if (this._isEagleSF) {
                  if (cards.length === 5) {
                    result = 13;
                    this.handIDString = "5B";
                  } else if (cards.length === 4) {
                    result = 13;
                    this.handIDString = "4A";
                  } else if (cards.length === 3) {
                    result = 14;
                    this.handIDString = "3A";
                  }
                }
                num = num10;
              }
            }
          }
        }
      } else {
        flag5 = true;
        const num10 = this.lookupHandPointValue(5, cards.length);
        if (num10 > num) {
          if (this.gameMode === GameMode.PokerStraightsMode) {
            result = 5;
          }
          if (this.gameMode === GameMode.GolfMode) {
            result = 5;
            if (!this._isEagleSF) {
              if (cards.length === 5) {
                result = 15;
                this.handIDString = "5E";
              } else if (cards.length === 4) {
                result = 17;
                this.handIDString = "4F";
              } else if (cards.length === 3) {
                result = 17;
                this.handIDString = "3D";
              }
            }
          }
          num = num10;
        }
      }
    }
    if (flag2 && !flag) {
      flag6 = true;
      const num10 = this.lookupHandPointValue(6, cards.length);
      if (num10 > num) {
        result = 6;
        if (this.gameMode === GameMode.GolfMode) {
          if (cards.length === 5) {
            result = 17;
            this.handIDString = "5F";
          } else if (cards.length === 4) {
            result = 15;
            this.handIDString = "4D";
          } else if (cards.length === 3) {
            result = 15;
            this.handIDString = "3C";
          }
        }
        num = num10;
      }
    }
    if (
      !flag15 &&
      !this._isEagleSF &&
      !this._isEagle4K &&
      !this._is4K &&
      !flag2 &&
      !flag16 &&
      !flag14 &&
      !flag
    ) {
      flag10 = true;
      let num10 = this.lookupHandPointValue(10, cards.length);
      if (num10 > num) {
        result = 10;
        if (this.gameMode === GameMode.GolfMode) {
          num10 = this.lookupHandPointValue(19, cards.length);
          if (cards.length === 5) {
            result = 19;
            this.handIDString = "5J";
            this.points = 7;
          } else if (cards.length === 4) {
            result = 19;
            this.handIDString = "4H";
            this.points = 6;
          } else if (cards.length === 3) {
            result = 18;
            this.handIDString = "3F";
            this.points = 4;
          }
        }
      }
    }
    // factor-value blocks (display metadata; ported for mutation-order fidelity)
    if (flag4) {
      num4 = num7;
      this.primaryFactor = num4;
      if (num9 === 1) {
        num9 = num6;
      }
      num6 = num8;
      this.secondaryFactor = num6;
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
    }
    if (flag9 && num9 === 0 && !flag7 && !flag8) {
      num4 = num8;
      if (num8 === 1) {
        num4 = 1;
      }
      for (const item4 of linkedList) {
        if (item4 !== num4) {
          if (flag11 && num4 !== 1) {
            num6 = 1;
          } else if (item4 > num5) {
            num5 = item4;
            num6 = num5;
          }
        } else if (item4 === num7) {
          num7 = item4;
        }
      }
      num4 = num8;
      this.primaryFactor = num4;
      if (flag11) {
        this.secondaryFactor = num6;
      } else {
        this.secondaryFactor = num6;
      }
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
    }
    if (flag8) {
      this.primaryFactor = num4;
      this.secondaryFactor = num6;
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
    }
    if (flag3) {
      if (cards.length === 5) {
        for (const item5 of linkedList) {
          if (item5 !== num4) {
            num6 = item5;
          } else {
            num4 = item5;
          }
        }
      }
      this.primaryFactor = num4;
      this.secondaryFactor = num6;
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
      if (cards.length === 4) {
        this.secondaryFactor = this.primaryFactor;
      }
    }
    if (flag7) {
      if (flag11 && 1 === num7) {
        num7 = 1;
      }
      let num11 = 0;
      for (const item6 of linkedList) {
        if (item6 !== num7) {
          if (flag11 && 1 !== num7) {
            num6 = 1;
          } else if (item6 > num11) {
            num11 = item6;
            num6 = num11;
          }
        } else if (item6 === num7) {
          num7 = item6;
        }
      }
      num4 = num7;
      this.secondaryFactor = num11;
      this.primaryFactor = num4;
      this.secondaryFactor = num6;
      if (cards.length === 3) {
        this.secondaryFactor = num7;
      }
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
    }
    if (flag5 || flag6 || flag10 || (flag5 && flag6)) {
      for (const item7 of linkedList) {
        if (flag11) {
          if (flag6) {
            num6 = 1;
            if (item7 > num4) {
              num4 = item7;
            }
            continue;
          }
          num4 = 1;
          if (item7 > num4) {
            num5 = item7;
            if (item7 > num6 || item7 === num6) {
              num6 = item7;
            }
          }
        } else if (item7 > num4) {
          num6 = num4;
          num4 = item7;
        } else if (item7 > num6) {
          num6 = item7;
        }
      }
      this.primaryFactor = num4;
      this.secondaryFactor = num6;
      this.factorValue01 = this.lookUpFactorPointValue(this.primaryFactor, 0, this.factorString);
      this.factorValue02 = this.lookUpFactorPointValue(0, this.secondaryFactor, this.factorString);
      this.factorValues = this.factorValue01 + this.factorValue02;
    }
    return result;
  }

  /**
   * Port of HandIDValue. NOTE: the handIDString PARAMETER shadows the field —
   * assignments below are local and returned; the field is untouched here.
   * `points` IS the instance field and is mutated.
   */
  handIDValue(
    handNameID: number,
    numberOfCardsInHand: number,
    handIDString: string,
    _highestPointValueNameID: number,
  ): string {
    if (this.mode === 0) {
      switch (handNameID) {
        case 1:
          if (numberOfCardsInHand === 5) {
            handIDString = "5A";
          }
          break;
        case 2:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5B";
              break;
            case 4:
              handIDString = "4A";
              break;
            case 3:
              handIDString = "3A";
              break;
          }
          break;
        case 13:
          if (this._isEagleSF) {
            switch (numberOfCardsInHand) {
              case 5:
                handIDString = "5B";
                break;
              case 4:
                handIDString = "4A";
                break;
              case 3:
                handIDString = "3A";
                break;
            }
          }
          if (this._isEagle4K) {
            if (numberOfCardsInHand === 5) {
              handIDString = "5C";
            }
            if (numberOfCardsInHand === 4) {
              handIDString = "4B";
            }
          }
          break;
        case 3:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5C";
              break;
            case 4:
              handIDString = "4B";
              break;
          }
          break;
        case 4:
          if (numberOfCardsInHand === 5) {
            handIDString = "5D";
          }
          break;
        case 5:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5E";
              break;
            case 4:
              handIDString = "4F";
              break;
            case 3:
              handIDString = "3D";
              break;
          }
          break;
        case 6:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5F";
              break;
            case 4:
              handIDString = "4D";
              break;
            case 3:
              handIDString = "3C";
              break;
          }
          break;
        case 7:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5G";
              break;
            case 4:
              handIDString = "4C";
              break;
            case 3:
              handIDString = "3B";
              break;
          }
          break;
        case 8:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5H";
              break;
            case 4:
              handIDString = "4E";
              break;
          }
          break;
        case 9:
          switch (numberOfCardsInHand) {
            case 5:
              handIDString = "5I";
              break;
            case 4:
              handIDString = "4G";
              break;
            case 3:
              handIDString = "3E";
              break;
          }
          break;
      }
      if (handNameID === 10 && !this._is4K) {
        switch (numberOfCardsInHand) {
          case 5:
            handIDString = "5J";
            this.points = -5;
            break;
          case 4:
            handIDString = "4H";
            this.points = -4;
            break;
          case 3:
            handIDString = "3F";
            this.points = -3;
            break;
        }
      }
      if (handNameID === 19) {
        switch (numberOfCardsInHand) {
          case 5:
            handIDString = "5J";
            this.points = 7;
            break;
          case 4:
            handIDString = "4H";
            this.points = 6;
            break;
        }
      }
      if (handNameID === 18 && numberOfCardsInHand === 3) {
        handIDString = "3F";
        this.points = 4;
      }
    }
    return handIDString;
  }

  /** Port of LookUpFactorPointValue. */
  lookUpFactorPointValue(primaryFactor: number, secondaryFactor: number, factorString: string): string {
    if (primaryFactor === 2 || secondaryFactor === 2) {
      factorString = "2";
    } else if (primaryFactor === 3 || secondaryFactor === 3) {
      factorString = "3";
    } else if (primaryFactor === 4 || secondaryFactor === 4) {
      factorString = "4";
    } else if (primaryFactor === 5 || secondaryFactor === 5) {
      factorString = "5";
    } else if (primaryFactor === 6 || secondaryFactor === 6) {
      factorString = "6";
    } else if (primaryFactor === 7 || secondaryFactor === 7) {
      factorString = "7";
    } else if (primaryFactor === 8 || secondaryFactor === 8) {
      factorString = "8";
    } else if (primaryFactor === 9 || secondaryFactor === 9) {
      factorString = "9";
    } else if (primaryFactor === 10 || secondaryFactor === 10) {
      factorString = "T";
    } else if (primaryFactor === 11 || secondaryFactor === 11) {
      factorString = "J";
    } else if (primaryFactor === 12 || secondaryFactor === 12) {
      factorString = "Q";
    } else if (primaryFactor === 13 || secondaryFactor === 13) {
      factorString = "K";
    } else if (primaryFactor === 1 || secondaryFactor === 1) {
      factorString = "A";
    }
    return factorString;
  }

  /** Port of LookupHandPointValue. MUTATES this.points and returns it. */
  lookupHandPointValue(handNameID: number, numberOfCardsInHand: number): number {
    if (this.mode === 0) {
      switch (handNameID) {
        case 1:
          if (numberOfCardsInHand === 5) {
            this.points = 2;
            handNameID = 12;
            if (this.gameMode === GameMode.PokerStraightsMode) {
              this.points = 58;
            }
          }
          break;
        case 13:
          if (this._isEagleSF) {
            switch (numberOfCardsInHand) {
              case 5:
                this.points = 3;
                break;
              case 4:
                this.points = 2;
                break;
              case 3:
                this.points = 1;
                handNameID = 14;
                break;
            }
          }
          if (this._isEagle4K) {
            switch (numberOfCardsInHand) {
              case 5:
                this.points = 3;
                break;
              case 4:
                this.points = 2;
                break;
            }
          }
          break;
        case 2:
          switch (numberOfCardsInHand) {
            case 5:
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 50;
              }
              break;
            case 4:
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 47;
              }
              break;
            case 3:
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 35;
              }
              break;
          }
          break;
        case 3:
          switch (numberOfCardsInHand) {
            case 5:
              if (this.gameMode === GameMode.GolfMode) {
                this.points = 3;
                handNameID = 13;
              } else if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 42;
              }
              break;
            case 4:
              if (this.gameMode === GameMode.GolfMode) {
                this.points = 2;
                handNameID = 13;
              } else if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 43;
              }
              break;
          }
          break;
        case 4:
          if (numberOfCardsInHand === 5) {
            this.points = 4;
            handNameID = 15;
            if (this.gameMode === GameMode.PokerStraightsMode) {
              this.points = 38;
            }
          }
          break;
        case 5:
          switch (numberOfCardsInHand) {
            case 5:
              this.points = 4;
              handNameID = 15;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 34;
              }
              break;
            case 4:
              this.points = 4;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 22;
              }
              break;
            case 3:
              this.points = 3;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 14;
              }
              break;
          }
          break;
        case 6:
          switch (numberOfCardsInHand) {
            case 5:
              this.points = 5;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 31;
              }
              break;
            case 4:
              this.points = 3;
              handNameID = 15;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 25;
              }
              break;
            case 3:
              this.points = 2;
              handNameID = 15;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 18;
              }
              break;
          }
          break;
        case 7:
          switch (numberOfCardsInHand) {
            case 5:
              this.points = 5;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 19;
              }
              break;
            case 4:
              this.points = 3;
              handNameID = 15;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 28;
              }
              break;
            case 3:
              this.points = 2;
              handNameID = 15;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 33;
              }
              break;
          }
          break;
        case 8:
          switch (numberOfCardsInHand) {
            case 5:
              this.points = 5;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 16;
              }
              break;
            case 4:
              this.points = 4;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 23;
              }
              break;
          }
          break;
        case 9:
          switch (numberOfCardsInHand) {
            case 5:
              this.points = 6;
              handNameID = 18;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 5;
              }
              break;
            case 4:
              this.points = 5;
              handNameID = 18;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 7;
              }
              break;
            case 3:
              this.points = 3;
              handNameID = 17;
              if (this.gameMode === GameMode.PokerStraightsMode) {
                this.points = 9;
              }
              break;
          }
          break;
      }
      if (handNameID === 10 && !this._is4K) {
        switch (numberOfCardsInHand) {
          case 5:
            this.points = -5;
            handNameID = 10;
            break;
          case 4:
            this.points = -4;
            handNameID = 10;
            break;
          case 3:
            this.points = -3;
            handNameID = 10;
            break;
        }
      }
    }
    if (handNameID === 19) {
      switch (numberOfCardsInHand) {
        case 5:
          if (this.gameMode === GameMode.GolfMode) {
            this.points = 7;
          }
          break;
        case 4:
          if (this.gameMode === GameMode.GolfMode) {
            this.points = 6;
          }
          break;
      }
    }
    if (handNameID === 18 && numberOfCardsInHand === 3 && this.gameMode === GameMode.GolfMode) {
      this.points = 4;
    }
    return this.points;
  }

  /** Port of AddScoreToHand (minus the Unity popup plumbing). */
  addScoreToHand(handNameID: number, numberOfPoints: number, _addToTotalScore: boolean): void {
    let text = "";
    switch (handNameID) {
      case 1:
        text = "Royal Flush";
        break;
      case 2:
        text = "Straight Flush";
        break;
      case 3:
        text = "Four of a Kind";
        break;
      case 4:
        text = "Full House";
        break;
      case 5:
        text = "Flush";
        break;
      case 6:
        text = "Straight";
        break;
      case 7:
        text = "Three of a Kind";
        break;
      case 8:
        text = "Two Pairs";
        break;
      case 9:
        text = "Pair";
        break;
      case 10:
        text = "High Card";
        break;
    }
    if (this.gameMode === GameMode.GolfMode) {
      switch (handNameID) {
        case 12:
          text = "Albatross";
          break;
        case 13:
          text = "Eagle";
          break;
        case 14:
          text = "Eagle Hole In One";
          break;
        case 15:
          text = "Birdie";
          break;
        case 16:
          text = "Irdie";
          break;
        case 17:
          text = "Par";
          break;
        case 18:
          text = "Bogey";
          break;
        case 19:
          text = "Double";
          break;
      }
    }
    if (!this.doNotAddToScore) {
      this.totalScore += numberOfPoints;
    }
    this.lastHandName = text;
  }
}
