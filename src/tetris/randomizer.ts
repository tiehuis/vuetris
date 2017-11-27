import { Pieces } from "./types"

// Return a number between [min, max)
function randomInt(min: number, max: number): number {
  const imin = Math.ceil(min)
  const imax = Math.floor(max)
  return Math.floor(Math.random() * (imax - imin) + imin)
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i >= 1; --i) {
    const j = randomInt(0, i + 1)
    const tmp = a[j];
    a[j] = a[i];
    a[i] = tmp;
  }
}

export interface IRandomizer {
  next(): string
}

export class SimpleRandomizer implements IRandomizer {
  next(): string {
    return Pieces[randomInt(0, Pieces.length)]
  }
}

export class BagRandomizer implements IRandomizer {
  bag: number[]

  constructor() {
    this.bag = []
    this.fillBag()
  }

  next(): string {
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
    shuffle(this.bag)
  }
}
