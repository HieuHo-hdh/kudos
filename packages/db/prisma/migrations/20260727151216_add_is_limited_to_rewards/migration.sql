/*
  Warnings:

  - Made the column `stock` on table `rewards` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "is_limited" BOOLEAN NOT NULL DEFAULT false;

-- Update existing NULL stock values to 1
UPDATE "rewards" SET "stock" = 1 WHERE "stock" IS NULL;

-- Make stock NOT NULL with default
ALTER TABLE "rewards" ALTER COLUMN "stock" SET NOT NULL,
ALTER COLUMN "stock" SET DEFAULT 1;
