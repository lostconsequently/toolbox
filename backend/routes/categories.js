const express = require("express");
const router = express.Router();

const { all, get, run } = require("../database/db");
const { validate, validationError } = require("../utils/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const categorySchema = {
  name: { type: "string", required: true, label: "Name" },
  color: { type: "string", default: "#2563eb" },
  icon: { type: "string", default: "category" },
  sortOrder: { type: "number", default: 0 },
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await all(
      `
SELECT
  id,
  name,
  color,
  icon,
        sort_order,
        created_at,
        updated_at
      FROM categories
      ORDER BY sort_order ASC, name ASC
      `,
    );

    res.json(categories);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await get(
      `
      SELECT
        id,
        name,
        color,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (!category) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    res.json(category);
  }),
);

// Lets the frontend show what a delete would actually take with it before
// the admin commits - categories cascade to subcategories, tools, and
// scripts (schema.sql), so "delete category" can silently be a much bigger
// blast radius than the label implies.
router.get(
  "/:id/dependents",
  asyncHandler(async (req, res) => {
    const category = await get("SELECT id FROM categories WHERE id = ?", [
      req.params.id,
    ]);

    if (!category) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    const [subcategoryCount, toolCount, scriptCount] = await Promise.all([
      get("SELECT COUNT(*) AS count FROM subcategories WHERE category_id = ?", [
        req.params.id,
      ]),
      get("SELECT COUNT(*) AS count FROM tools WHERE category_id = ?", [
        req.params.id,
      ]),
      get("SELECT COUNT(*) AS count FROM scripts WHERE category_id = ?", [
        req.params.id,
      ]),
    ]);

    res.json({
      subcategories: subcategoryCount.count,
      tools: toolCount.count,
      scripts: scriptCount.count,
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(categorySchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
INSERT INTO categories (
  name,
  color,
  icon,
  sort_order
)
VALUES (?, ?, ?, ?)
      `,
      [value.name, value.color, value.icon, value.sortOrder],
    );

    const category = await get(
      `
      SELECT
        id,
        name,
        color,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
      `,
      [result.id],
    );

    res.status(201).json(category);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(categorySchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
UPDATE categories
SET
  name = ?,
  color = ?,
  icon = ?,
  sort_order = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE id = ?
      `,
      [value.name, value.color, value.icon, value.sortOrder, req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    const category = await get(
      `
      SELECT
        id,
        name,
        color,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
      `,
      [req.params.id],
    );

    res.json(category);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await run(
      `
      DELETE FROM categories
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    res.json({
      success: true,
    });
  }),
);

module.exports = router;
