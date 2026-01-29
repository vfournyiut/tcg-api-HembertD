/*
  Warnings:

  - A unique constraint covering the columns `[deckId,cardId]` on the table `DeckCard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_key" ON "DeckCard"("deckId", "cardId");
