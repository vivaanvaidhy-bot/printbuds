import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";

type ProductInput = {
  name?: unknown;
  qty?: unknown;
  material?: unknown;
  labor?: unknown;
  price?: unknown;
  photo?: unknown;
};

const productResponse = (product: typeof products.$inferSelect) => ({
  id: product.id,
  name: product.name,
  qty: product.quantity,
  material: product.material,
  labor: product.labor,
  price: product.price,
  photo: product.photo,
});

const positiveNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const getPhotoStore = () => getStore("inventory-photos");
const decodeBase64 = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

export default async (request: Request) => {
  try {
    const photoStore = getPhotoStore();
    const url = new URL(request.url);
    const photoMatch = url.pathname.match(/^\/api\/inventory\/photo\/([0-9a-f-]+)$/);
    if (request.method === "GET" && photoMatch) {
      const photo = await photoStore.get(photoMatch[1], { type: "blob" });
      if (!photo) return new Response("Photo not found", { status: 404 });
      return new Response(photo, {
        headers: {
          "Content-Type": url.searchParams.get("type") || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    if (request.method === "GET") {
      const inventory = await db.select().from(products).orderBy(asc(products.createdAt));
      return Response.json(inventory.map(productResponse));
    }

    if (request.method === "POST") {
      const input = (await request.json()) as ProductInput;
      const name = typeof input.name === "string" ? input.name.trim() : "";
      const qty = Number(input.qty);
      const material = Number(input.material);
      const labor = Number(input.labor);
      const price = Number(input.price);
      const photo = typeof input.photo === "string" ? input.photo : "";

      if (!name || !Number.isInteger(qty) || qty < 1 || !positiveNumber(material) || !positiveNumber(labor) || !positiveNumber(price)) {
        return Response.json({ error: "Please enter valid toy and pricing details." }, { status: 400 });
      }

      if (photo.length > 2_000_000) {
        return Response.json({ error: "The photo is too large. Please choose a smaller image." }, { status: 413 });
      }

      let [created] = await db.insert(products).values({ name, quantity: qty, material, labor, price }).returning();
      const photoMatch = photo.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if (photoMatch) {
        const image = new Blob([decodeBase64(photoMatch[2])], { type: photoMatch[1] });
        await photoStore.set(created.id, image);
        const photoUrl = `/api/inventory/photo/${created.id}?type=${encodeURIComponent(photoMatch[1])}`;
        [created] = await db.update(products).set({ photo: photoUrl }).where(eq(products.id, created.id)).returning();
      }
      return Response.json(productResponse(created), { status: 201 });
    }

    if (request.method === "PATCH") {
      const input = (await request.json()) as { id?: unknown; qty?: unknown };
      const id = typeof input.id === "string" ? input.id : "";
      const qty = Number(input.qty);

      if (!id || !Number.isInteger(qty) || qty < 0) {
        return Response.json({ error: "Please enter a valid inventory quantity." }, { status: 400 });
      }

      const [updated] = await db.update(products).set({ quantity: qty }).where(eq(products.id, id)).returning();
      if (!updated) return Response.json({ error: "Toy not found." }, { status: 404 });
      return Response.json(productResponse(updated));
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH" } });
  } catch (error) {
    console.error("Inventory request failed", error);
    return Response.json({ error: "Inventory could not be saved right now. Please try again." }, { status: 500 });
  }
};

export const config: Config = {
  path: ["/api/inventory", "/api/inventory/photo/:id"],
};
