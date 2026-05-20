CREATE TABLE `jobExecutionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('success','failed','partial') NOT NULL,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`totalCount` int NOT NULL,
	`errorMessage` text,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `jobExecutionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduledJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`generationIds` text NOT NULL,
	`docType` varchar(64) NOT NULL,
	`tone` varchar(64) NOT NULL,
	`length` varchar(64) NOT NULL,
	`cronExpression` varchar(64) NOT NULL,
	`status` enum('active','paused','completed','failed') NOT NULL DEFAULT 'active',
	`nextRun` timestamp,
	`lastRun` timestamp,
	`lastError` text,
	`executionCount` int NOT NULL DEFAULT 0,
	`notifyOnSuccess` int NOT NULL DEFAULT 1,
	`notifyOnFailure` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduledJobs_id` PRIMARY KEY(`id`)
);
