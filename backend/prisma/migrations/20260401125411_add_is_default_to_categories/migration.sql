-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subcategories" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;
