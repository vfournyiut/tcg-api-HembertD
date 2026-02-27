import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { vi, beforeEach } from 'vitest'
import { PrismaClient } from '../src/generated/prisma/client'
import { prisma } from '../src/database'

// Mock database for all possible import paths
vi.mock('../src/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

vi.mock('../database', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

beforeEach(() => {
  mockReset(prismaMock)
})

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
