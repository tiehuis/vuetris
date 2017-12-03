import { Piece } from "./game";
import { Pieces, PieceType } from "./types"

class SmallPrng {
  s: Uint32Array
  seed: number

  constructor(seed: number = Math.floor(Math.random() * 0xFFFFFFFF)) {
    this.reseed(seed)
  }

  reseed(seed: number) {
    this.seed = seed
    this.s = new Uint32Array([0xf1ea5eed, seed, seed, seed])

    for (let i = 0; i < 20; ++i) {
      this.next()
    }
  }

  next(): number {
    const r = (x: number, n: number) => (x << n) | (x >> (32 - n))

    // Uint32Array's have modulo arithmetic operators
    const e = this.s[0] - r(this.s[1], 27)
    this.s[0] = this.s[1] ^ r(this.s[2], 17)
    this.s[1] = this.s[2] + this.s[3]
    this.s[2] = this.s[3] + e
    this.s[3] = e + this.s[0]

    return this.s[3]
  }

  // Return a number between [min, max)
  range(min: number, max: number): number {
    const range = max - min
    const rem = 0xFFFFFFFF % range

    let x
    do { x = this.next() } while (x >= 0xFFFFFFFF - rem);

    return min + x % range
  }

  shuffle<T>(a: T[]) {
    for (let i = a.length - 1; i >= 1; --i) {
      const j = this.range(0, i + 1)
      const tmp = a[j];
      a[j] = a[i];
      a[i] = tmp;
    }
  }
}

export abstract class IRandomizer {
  prng: SmallPrng

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.prng = new SmallPrng(seed)
    } else {
      this.prng = new SmallPrng()
    }
  }

  abstract next(): PieceType
}

export class SimpleRandomizer extends IRandomizer {
  next(): PieceType {
    return Pieces[this.prng.range(0, Pieces.length)]
  }
}

export class BagRandomizer extends IRandomizer {
  bag: number[]

  constructor(seed?: number) {
    super(seed)
    this.bag = []
    this.fillBag()
  }

  next(): PieceType {
    const first = this.bag.shift() as number
    if (this.bag.length === 0) {
      this.fillBag()
    }
    return Pieces[first]
  }

  private fillBag() {
    for (let i = 0; i < 7; ++i) {
      this.bag.push(i)
    }
    this.prng.shuffle(this.bag)
  }
}
