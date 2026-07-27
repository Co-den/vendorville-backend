CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"customer_name" varchar(150) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"vendor_reply" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;