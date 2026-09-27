-- AlterTable
ALTER TABLE "sitter_profiles" ADD COLUMN     "averageRating" DECIMAL(3,2);

-- CreateIndex
CREATE INDEX "sitter_profiles_averageRating_idx" ON "sitter_profiles"("averageRating");
