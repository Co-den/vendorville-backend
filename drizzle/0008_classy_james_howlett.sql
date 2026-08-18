ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_dispatch" ADD COLUMN "tracking_token" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "order_dispatch" ADD COLUMN "current_lat" varchar(20);--> statement-breakpoint
ALTER TABLE "order_dispatch" ADD COLUMN "current_lng" varchar(20);--> statement-breakpoint
ALTER TABLE "order_dispatch" ADD COLUMN "location_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_dispatch" ADD CONSTRAINT "order_dispatch_tracking_token_unique" UNIQUE("tracking_token");