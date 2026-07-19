CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"channel" varchar(20) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"event" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
