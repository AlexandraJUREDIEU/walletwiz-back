-- DropForeignKey
ALTER TABLE `Members` DROP FOREIGN KEY `Members_sessionId_fkey`;

-- AddForeignKey
ALTER TABLE `Members` ADD CONSTRAINT `Members_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
