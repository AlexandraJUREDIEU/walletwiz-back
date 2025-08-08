-- CreateTable
CREATE TABLE `Members` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `role` ENUM('OWNER', 'COLLABORATOR', 'VIEWER') NOT NULL DEFAULT 'COLLABORATOR',
    `isPlaceholder` BOOLEAN NOT NULL DEFAULT false,
    `invitationStatus` ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `invitedEmail` VARCHAR(191) NULL,
    `inviteToken` VARCHAR(191) NULL,
    `invitedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Members_inviteToken_key`(`inviteToken`),
    INDEX `Members_sessionId_idx`(`sessionId`),
    INDEX `Members_userId_idx`(`userId`),
    UNIQUE INDEX `Members_sessionId_userId_key`(`sessionId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Members` ADD CONSTRAINT `Members_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Members` ADD CONSTRAINT `Members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
