import { describe, it, expect } from 'vitest'
import { getWeakness, getDamageMultiplier, calculateDamage } from '../../src/utils/rules.util'
import { PokemonType } from '../../src/generated/prisma/client'

describe('rules.util', () => {
  describe('getWeakness', () => {
    it('should return Fighting for Normal type', () => {
      expect(getWeakness(PokemonType.Normal)).toBe(PokemonType.Fighting)
    })

    it('should return Water for Fire type', () => {
      expect(getWeakness(PokemonType.Fire)).toBe(PokemonType.Water)
    })

    it('should return Electric for Water type', () => {
      expect(getWeakness(PokemonType.Water)).toBe(PokemonType.Electric)
    })

    it('should return Ground for Electric type', () => {
      expect(getWeakness(PokemonType.Electric)).toBe(PokemonType.Ground)
    })

    it('should return Fire for Grass type', () => {
      expect(getWeakness(PokemonType.Grass)).toBe(PokemonType.Fire)
    })

    it('should return Fire for Ice type', () => {
      expect(getWeakness(PokemonType.Ice)).toBe(PokemonType.Fire)
    })

    it('should return Psychic for Fighting type', () => {
      expect(getWeakness(PokemonType.Fighting)).toBe(PokemonType.Psychic)
    })

    it('should return Psychic for Poison type', () => {
      expect(getWeakness(PokemonType.Poison)).toBe(PokemonType.Psychic)
    })

    it('should return Water for Ground type', () => {
      expect(getWeakness(PokemonType.Ground)).toBe(PokemonType.Water)
    })

    it('should return Electric for Flying type', () => {
      expect(getWeakness(PokemonType.Flying)).toBe(PokemonType.Electric)
    })

    it('should return Dark for Psychic type', () => {
      expect(getWeakness(PokemonType.Psychic)).toBe(PokemonType.Dark)
    })

    it('should return Fire for Bug type', () => {
      expect(getWeakness(PokemonType.Bug)).toBe(PokemonType.Fire)
    })

    it('should return Water for Rock type', () => {
      expect(getWeakness(PokemonType.Rock)).toBe(PokemonType.Water)
    })

    it('should return Dark for Ghost type', () => {
      expect(getWeakness(PokemonType.Ghost)).toBe(PokemonType.Dark)
    })

    it('should return Ice for Dragon type', () => {
      expect(getWeakness(PokemonType.Dragon)).toBe(PokemonType.Ice)
    })

    it('should return Fighting for Dark type', () => {
      expect(getWeakness(PokemonType.Dark)).toBe(PokemonType.Fighting)
    })

    it('should return Fire for Steel type', () => {
      expect(getWeakness(PokemonType.Steel)).toBe(PokemonType.Fire)
    })

    it('should return Poison for Fairy type', () => {
      expect(getWeakness(PokemonType.Fairy)).toBe(PokemonType.Poison)
    })

    it('should return null for unknown type', () => {
      expect(getWeakness('Unknown' as PokemonType)).toBeNull()
    })
  })

  describe('getDamageMultiplier', () => {
    it('should return 2.0 when attacker type matches defender weakness', () => {
      // Fire is weak to Water
      expect(getDamageMultiplier(PokemonType.Water, PokemonType.Fire)).toBe(2.0)
    })

    it('should return 1.0 when attacker type does not match defender weakness', () => {
      expect(getDamageMultiplier(PokemonType.Normal, PokemonType.Fire)).toBe(1.0)
    })

    it('should return 1.0 when defender has no weakness', () => {
      expect(getDamageMultiplier(PokemonType.Fire, PokemonType.Normal)).toBe(1.0)
    })
  })

  describe('calculateDamage', () => {
    it('should calculate damage with 2x multiplier', () => {
      // Water is weak to Electric, so Electric attack on Water defender gets 2x
      expect(calculateDamage(50, PokemonType.Electric, PokemonType.Water)).toBe(100)
    })

    it('should calculate damage with 1x multiplier', () => {
      expect(calculateDamage(50, PokemonType.Normal, PokemonType.Fire)).toBe(50)
    })

    it('should return minimum 1 damage', () => {
      expect(calculateDamage(0, PokemonType.Normal, PokemonType.Fire)).toBe(1)
    })

    it('should floor the damage', () => {
      // 50 * 2.0 = 100, floor is 100
      expect(calculateDamage(50, PokemonType.Electric, PokemonType.Water)).toBe(100)
    })
  })
})
