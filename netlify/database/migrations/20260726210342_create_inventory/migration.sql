CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"material" double precision NOT NULL,
	"labor" double precision NOT NULL,
	"price" double precision NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
