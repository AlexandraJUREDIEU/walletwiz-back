-- CreateTable
CREATE TABLE `Transactions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NULL,
    `budgetId` VARCHAR(191) NULL,
    `type` ENUM('INFLOW', 'OUTFLOW') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `category` ENUM('HOUSING', 'UTILITIES', 'HEALTH', 'FOOD', 'TRANSPORT', 'SUBSCRIPTIONS', 'OTHER') NULL,
    `isCleared` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Transactions_sessionId_idx`(`sessionId`),
    INDEX `Transactions_bankAccountId_idx`(`bankAccountId`),
    INDEX `Transactions_budgetId_idx`(`budgetId`),
    INDEX `Transactions_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transactions` ADD CONSTRAINT `Transactions_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transactions` ADD CONSTRAINT `Transactions_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transactions` ADD CONSTRAINT `Transactions_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transactions` ADD CONSTRAINT `Transactions_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `Budgets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
