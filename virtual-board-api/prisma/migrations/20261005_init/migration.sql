CREATE TABLE "Board" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardAccess" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "boardId" INTEGER NOT NULL,
  CONSTRAINT "BoardAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Note" (
  "id" SERIAL NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "x" INTEGER NOT NULL DEFAULT 40,
  "y" INTEGER NOT NULL DEFAULT 40,
  "color" TEXT NOT NULL DEFAULT 'yellow',
  "boardId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardAccess_userId_boardId_key" ON "BoardAccess"("userId", "boardId");
CREATE INDEX "BoardAccess_userId_idx" ON "BoardAccess"("userId");
CREATE INDEX "Note_boardId_idx" ON "Note"("boardId");
ALTER TABLE "BoardAccess" ADD CONSTRAINT "BoardAccess_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
