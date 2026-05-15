CREATE TABLE `generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`repoUrl` varchar(500) NOT NULL,
	`repoName` varchar(255),
	`docType` varchar(64) NOT NULL,
	`tone` varchar(64) NOT NULL,
	`length` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generations_id` PRIMARY KEY(`id`)
);
