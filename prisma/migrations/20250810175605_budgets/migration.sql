-- CreateTable
CREATE TABLE `Budgets` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `month` VARCHAR(191) NOT NULL,
    `openingBalance` DECIMAL(18, 2) NULL,
    `notes` VARCHAR(191) NULL,
    `locked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Budgets_sessionId_idx`(`sessionId`),
    UNIQUE INDEX `Budgets_sessionId_month_key`(`sessionId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Budgets` ADD CONSTRAINT `Budgets_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
