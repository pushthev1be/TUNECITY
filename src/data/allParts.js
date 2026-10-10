import partsData from './parts.json'
import blackMarketData from './blackMarket.json'

// Every part a player can own: regular shop parts plus Black Market exclusives
export const allParts = [...partsData, ...blackMarketData]

export function findPart(partId) {
  return allParts.find(p => p.id === partId) ?? null
}
