// Recipes (Costos y Precios → Recetas). A recipe for a product+empanado holds
// its ingredients + packaging and computes a cost per kg. When active, it drives
// Product.costs[empanado] (and logs CostHistory), making that cost read-only in
// the master table.

import { prisma } from "@/lib/db";
import { BREADCRUMB_LABELS } from "@/lib/products";
import { setProductCost } from "@/lib/pricing";

export const RECIPE_UNITS = ["KG", "G", "UNIDAD", "L", "ML"] as const;

export type RecipeIngredientInput = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type RecipeInput = {
  productId: string;
  breadcrumbType: string;
  yieldKg: number;
  packagingPerKg: number;
  active: boolean;
  ingredients: RecipeIngredientInput[];
};

// computedCostPerKg = Σ(ingredient subtotals) / yieldKg + packagingPerKg.
// Ingredient subtotal = quantity × unitPrice (the unit is informational).
function computeCost(
  ingredients: { quantity: number; unitPrice: number }[],
  yieldKg: number,
  packagingPerKg: number
): { subtotals: number[]; total: number; computedCostPerKg: number } {
  const subtotals = ingredients.map((i) =>
    Math.round(Number(i.quantity) * Number(i.unitPrice))
  );
  const total = subtotals.reduce((a, b) => a + b, 0);
  const perKg = yieldKg > 0 ? total / yieldKg : 0;
  const computedCostPerKg = Math.round(perKg + packagingPerKg);
  return { subtotals, total, computedCostPerKg };
}

function clean(input: RecipeInput) {
  if (!input.productId || !input.breadcrumbType)
    throw new Error("Elegí un producto y un empanado.");
  const yieldKg = Number(input.yieldKg);
  if (!Number.isFinite(yieldKg) || yieldKg <= 0)
    throw new Error("El rendimiento por batch (kg) tiene que ser mayor a 0.");
  const packagingPerKg = Math.max(0, Math.round(Number(input.packagingPerKg) || 0));
  const ingredients = (input.ingredients ?? [])
    .filter((i) => i.name?.trim() && Number(i.quantity) > 0)
    .map((i) => ({
      name: i.name.trim(),
      quantity: Number(i.quantity),
      unit: RECIPE_UNITS.includes(i.unit as (typeof RECIPE_UNITS)[number])
        ? i.unit
        : "UNIDAD",
      unitPrice: Math.max(0, Math.round(Number(i.unitPrice) || 0)),
    }));
  if (ingredients.length === 0)
    throw new Error("Agregá al menos un ingrediente.");
  return { yieldKg, packagingPerKg, ingredients };
}

// Create or update the recipe for a product+empanado (unique pair). If active,
// pushes the computed cost into Product.costs (+ CostHistory).
export async function saveRecipe(input: RecipeInput): Promise<void> {
  const { yieldKg, packagingPerKg, ingredients } = clean(input);
  const { subtotals, computedCostPerKg } = computeCost(
    ingredients,
    yieldKg,
    packagingPerKg
  );

  const existing = await prisma.recipe.findUnique({
    where: {
      productId_breadcrumbType: {
        productId: input.productId,
        breadcrumbType: input.breadcrumbType,
      },
    },
    select: { id: true },
  });

  const data = {
    yieldKg,
    packagingPerKg,
    active: Boolean(input.active),
    computedCostPerKg,
  };
  const ingredientCreate = ingredients.map((i, idx) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    unitPrice: i.unitPrice,
    subtotal: subtotals[idx],
  }));

  let recipeId: string;
  if (existing) {
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
    await prisma.recipe.update({
      where: { id: existing.id },
      data: { ...data, ingredients: { create: ingredientCreate } },
    });
    recipeId = existing.id;
  } else {
    const created = await prisma.recipe.create({
      data: {
        productId: input.productId,
        breadcrumbType: input.breadcrumbType,
        ...data,
        ingredients: { create: ingredientCreate },
      },
      select: { id: true },
    });
    recipeId = created.id;
  }

  // When active, drive the product cost from the recipe.
  if (input.active) {
    await setProductCost(
      input.productId,
      input.breadcrumbType,
      computedCostPerKg,
      { allowRecipeOverride: true }
    );
  }
  void recipeId;
}

export async function deleteRecipe(id: string): Promise<void> {
  await prisma.recipe.delete({ where: { id } });
  // Note: the product cost stays at its last value; edit it in the master table.
}

export async function listRecipes() {
  const recipes = await prisma.recipe.findMany({
    orderBy: [{ product: { name: "asc" } }, { breadcrumbType: "asc" }],
    include: {
      product: { select: { name: true } },
      ingredients: true,
    },
  });
  return recipes.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    breadcrumbType: r.breadcrumbType,
    breadcrumbLabel: BREADCRUMB_LABELS[r.breadcrumbType] ?? r.breadcrumbType,
    yieldKg: r.yieldKg,
    packagingPerKg: r.packagingPerKg,
    active: r.active,
    computedCostPerKg: r.computedCostPerKg,
    ingredientsCount: r.ingredients.length,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
  }));
}

export async function getRecipe(productId: string, breadcrumbType: string) {
  const r = await prisma.recipe.findUnique({
    where: { productId_breadcrumbType: { productId, breadcrumbType } },
    include: { ingredients: true },
  });
  if (!r) return null;
  return {
    id: r.id,
    productId: r.productId,
    breadcrumbType: r.breadcrumbType,
    yieldKg: r.yieldKg,
    packagingPerKg: r.packagingPerKg,
    active: r.active,
    computedCostPerKg: r.computedCostPerKg,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
  };
}
