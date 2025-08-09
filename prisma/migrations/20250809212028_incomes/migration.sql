-- CreateTable
CREATE TABLE `Incomes` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `day` INTEGER NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Incomes_sessionId_idx`(`sessionId`),
    INDEX `Incomes_memberId_idx`(`memberId`),
    INDEX `Incomes_bankAccountId_idx`(`bankAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Incomes` ADD CONSTRAINT `Incomes_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incomes` ADD CONSTRAINT `Incomes_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incomes` ADD CONSTRAINT `Incomes_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
