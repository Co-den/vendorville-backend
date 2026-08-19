ALTER TABLE "customer_accounts" DROP CONSTRAINT "customer_accounts_email_unique";--> statement-breakpoint
ALTER TABLE "customer_accounts" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_accounts" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_accounts" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_accounts" ADD COLUMN "notes" text;