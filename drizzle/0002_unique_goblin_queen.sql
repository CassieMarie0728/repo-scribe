CREATE TABLE `exportTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`headerText` text,
	`footerText` text,
	`includeMetadata` int NOT NULL DEFAULT 1,
	`includeTableOfContents` int NOT NULL DEFAULT 0,
	`fontSize` varchar(32) DEFAULT 'normal',
	`fontFamily` varchar(64) DEFAULT 'sans-serif',
	`lineSpacing` varchar(32) DEFAULT '1.5',
	`pageMargins` varchar(64) DEFAULT '1in',
	`colorScheme` varchar(64) DEFAULT 'default',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exportTemplates_id` PRIMARY KEY(`id`)
);
