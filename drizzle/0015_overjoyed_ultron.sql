ALTER TABLE "wallets" ALTER COLUMN "balance" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "dva_account_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "flutterwave_customer_id" varchar(100);--> statement-breakpoint
ALTER TABLE "wallets" DROP COLUMN "paystack_customer_code";--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id");