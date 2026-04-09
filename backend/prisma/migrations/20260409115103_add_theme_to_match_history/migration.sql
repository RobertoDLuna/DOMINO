-- AlterTable
ALTER TABLE "game_matches" ADD COLUMN     "theme_id" TEXT;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
