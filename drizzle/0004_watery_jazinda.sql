ALTER TABLE `scheduledJobs` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
CREATE INDEX `export_templates_user_default_idx` ON `exportTemplates` (`userId`,`isDefault`);--> statement-breakpoint
CREATE INDEX `generations_user_created_idx` ON `generations` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `job_execution_history_job_executed_idx` ON `jobExecutionHistory` (`jobId`,`executedAt`);--> statement-breakpoint
CREATE INDEX `scheduled_jobs_user_status_idx` ON `scheduledJobs` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `scheduled_jobs_task_uid_idx` ON `scheduledJobs` (`scheduleCronTaskUid`);