import { doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  material: doublePrecision("material").notNull(),
  labor: doublePrecision("labor").notNull(),
  price: doublePrecision("price").notNull(),
  photo: text("photo").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
