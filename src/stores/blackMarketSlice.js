import blackMarketData from '../data/blackMarket.json'

const STOCK_SIZE = 3
const LISTING_FEE_PCT = 0.05

function pickRandomStock(seed) {
  // Deterministic shuffle via seeded Fisher-Yates so the same session seed gives the same 3 items
  const arr = [...blackMarketData]
  let s = seed
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, STOCK_SIZE)
}

export function createBlackMarketSlice(set, get) {
  const sessionSeed = Date.now() & 0xffffffff
  const initialStock = pickRandomStock(sessionSeed)

  return {
    bmStock: initialStock,
    bmUnlocked: false,
    bmListings: [],   // player-listed items: { id, partId, askPrice, listedAt }

    unlockBlackMarket() {
      set({ bmUnlocked: true })
    },

    refreshBMStock() {
      const newSeed = Date.now() & 0xffffffff
      set({ bmStock: pickRandomStock(newSeed) })
    },

    buyBMPart(partId) {
      const { bmUnlocked, bmStock } = get()
      if (!bmUnlocked) return
      const item = bmStock.find(p => p.id === partId)
      if (!item) return
      const { currency } = get()
      if (currency < item.cost) return

      // Remove from stock, add to inventory
      set({
        currency: currency - item.cost,
        bmStock: bmStock.filter(p => p.id !== partId),
      })
      get().addPart(partId)
    },

    listPartForSale(partId, askPrice) {
      const { ownedParts, bmListings } = get()
      if ((ownedParts[partId] ?? 0) < 1) return
      const fee = Math.floor(askPrice * LISTING_FEE_PCT)
      if (get().currency < fee) return

      get().removePart(partId)
      set({
        currency: get().currency - fee,
        bmListings: [
          ...bmListings,
          { id: `${partId}_${Date.now()}`, partId, askPrice, listedAt: Date.now() }
        ],
      })
    },

    cancelListing(listingId) {
      const { bmListings } = get()
      const listing = bmListings.find(l => l.id === listingId)
      if (!listing) return
      get().addPart(listing.partId)
      set({ bmListings: bmListings.filter(l => l.id !== listingId) })
    },

    // Called when AI "buyer" purchases a listing (triggered from UI timer or manually)
    sellListing(listingId) {
      const { bmListings } = get()
      const listing = bmListings.find(l => l.id === listingId)
      if (!listing) return
      get().addCurrency(listing.askPrice)
      set({ bmListings: bmListings.filter(l => l.id !== listingId) })
    },
  }
}
