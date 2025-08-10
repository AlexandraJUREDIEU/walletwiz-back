-- CreateTable
CREATE TABLE `Expenses` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `day` INTEGER NOT NULL,
    `category` ENUM('HOUSING', 'UTILITIES', 'HEALTH', 'FOOD', 'TRANSPORT', 'SUBSCRIPTIONS', 'OTHER') NOT NULL,
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `sessionId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expenses_sessionId_idx`(`sessionId`),
    INDEX `Expenses_memberId_idx`(`memberId`),
    INDEX `Expenses_bankAccountId_idx`(`bankAccountId`),
    UNIQUE INDEX `Expenses_sessionId_label_day_amount_key`(`sessionId`, `label`, `day`, `amount`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Expenses` ADD CONSTRAINT `Expenses_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expenses` ADD CONSTRAINT `Expenses_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expenses` ADD CONSTRAINT `Expenses_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
