-- AlterTable
ALTER TABLE "PageVariant" ADD COLUMN     "callouts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "knowledgeCheck" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "whyLearn" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "logoAssetKey" TEXT;
