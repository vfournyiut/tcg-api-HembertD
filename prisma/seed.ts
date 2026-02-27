import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

import { prisma } from '../src/database'
import { PokemonType } from '../src/generated/prisma/enums'
import { CardModel } from '../src/generated/prisma/models/Card'

async function main() {
  console.log('🌱 Starting database seed...')

  // Delete in correct order to respect foreign key constraints
  await prisma.deckCard.deleteMany()
  await prisma.deck.deleteMany()
  await prisma.card.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('password123', 10)

  await prisma.user.createMany({
    data: [
      {
        username: 'red',
        email: 'red@example.com',
        password: hashedPassword,
      },
      {
        username: 'blue',
        email: 'blue@example.com',
        password: hashedPassword,
      },
    ],
  })

  const redUser = await prisma.user.findUnique({
    where: { email: 'red@example.com' },
  })
  const blueUser = await prisma.user.findUnique({
    where: { email: 'blue@example.com' },
  })

  if (!redUser || !blueUser) {
    throw new Error('Failed to create users')
  }

  console.log('✅ Created users:', redUser.username, blueUser.username)

  const pokemonDataPath = join(__dirname, 'data', 'pokemon.json')
  const pokemonJson = readFileSync(pokemonDataPath, 'utf-8')
  const pokemonData: CardModel[] = JSON.parse(pokemonJson)

  // Create cards and get their actual IDs
  const createdCards = await Promise.all(
    pokemonData.map((pokemon) =>
      prisma.card.create({
        data: {
          name: pokemon.name,
          hp: pokemon.hp,
          attack: pokemon.attack,
          type: PokemonType[pokemon.type as keyof typeof PokemonType],
          pokedexNumber: pokemon.pokedexNumber,
          imgUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedexNumber}.png`,
        },
      }),
    ),
  )

  console.log(`✅ Created ${createdCards.length} Pokemon cards`)

  // Get the first 10 card IDs for the starter decks
  // Using cards with pokedex numbers 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
  // which correspond to the first 10 cards in the array
  const starterCardIds = createdCards
    .filter((card) => card.pokedexNumber >= 1 && card.pokedexNumber <= 10)
    .map((card) => card.id)

  if (starterCardIds.length < 10) {
    throw new Error('Not enough cards created for starter decks')
  }

  // Create deck for Red (userId: 1)
  const redDeck = await prisma.deck.create({
    data: {
      name: 'Starter Deck Red',
      userId: redUser.id,
      cards: {
        create: starterCardIds.map((cardId) => ({
          cardId: cardId,
        })),
      },
    },
    include: { cards: true },
  })

  // Create deck for Blue (userId: 2)
  const blueDeck = await prisma.deck.create({
    data: {
      name: 'Starter Deck Blue',
      userId: blueUser.id,
      cards: {
        create: starterCardIds.map((cardId) => ({
          cardId: cardId,
        })),
      },
    },
    include: { cards: true },
  })

  console.log(`✅ Created starter decks:`)
  console.log(
    `   - Deck ID ${redDeck.id} for Red (${redDeck.cards.length} cards)`,
  )
  console.log(
    `   - Deck ID ${blueDeck.id} for Blue (${blueDeck.cards.length} cards)`,
  )

  console.log('\n🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
