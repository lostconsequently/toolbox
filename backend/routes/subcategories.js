const express = require("express");
const router = express.Router();

const { all, get, run } = require("../database/db");
const { validate, validationError } = require("../utils/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const subcategorySchema = {
  name: { type: "string", required: true, label: "Name" },
  categoryId: { type: "number", required: true, label: "Category" },
  icon: { type: "string", default: "category" },
  sortOrder: { type: "number", default: 0 },
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const subcategories = await all(
      `
      SELECT
        id,
        category_id,
        name,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM subcategories
      ORDER BY sort_order ASC, name ASC
      `,
    );

    res.json(subcategories);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const subcategory = await get(
      `
      SELECT
        id,
        category_id,
        name,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM subcategories
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (!subcategory) {
      res.status(404).json({
        error: "Subcategory not found",
      });
      return;
    }

    res.json(subcategory);
  }),
);

// Same rationale as categories' /:id/dependents - a subcategory delete
// cascades to its tools and scripts (schema.sql), so the frontend can warn
// with real counts before the admin commits.
router.get(
  "/:id/dependents",
  asyncHandler(async (req, res) => {
    const subcategory = await get("SELECT id FROM subcategories WHERE id = ?", [
      req.params.id,
    ]);

    if (!subcategory) {
      res.status(404).json({
        error: "Subcategory not found",
      });
      return;
    }

    const [toolCount, scriptCount] = await Promise.all([
      get("SELECT COUNT(*) AS count FROM tools WHERE subcategory_id = ?", [
        req.params.id,
      ]),
      get("SELECT COUNT(*) AS count FROM scripts WHERE subcategory_id = ?", [
        req.params.id,
      ]),
    ]);

    res.json({
      tools: toolCount.count,
      scripts: scriptCount.count,
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(subcategorySchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      INSERT INTO subcategories
        (category_id, name, icon, sort_order)
      VALUES (?, ?, ?, ?)
      `,
      [value.categoryId, value.name, value.icon, value.sortOrder],
    );

    const subcategory = await get(
      `
      SELECT
        id,
        category_id,
        name,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM subcategories
      WHERE id = ?
      `,
      [result.id],
    );

    res.status(201).json(subcategory);
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(subcategorySchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      UPDATE subcategories
      SET
        category_id = ?,
        name = ?,
        icon = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        value.categoryId,
        value.name,
        value.icon,
        value.sortOrder,
        req.params.id,
      ],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Subcategory not found",
      });
      return;
    }

    const subcategory = await get(
      `
      SELECT
        id,
        category_id,
        name,
        icon,
        sort_order,
        created_at,
        updated_at
      FROM subcategories
      WHERE id = ?
      `,
      [req.params.id],
    );

    res.json(subcategory);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await run(
      `
      DELETE FROM subcategories
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Subcategory not found",
      });
      return;
    }

    res.json({
      success: true,
    });
  }),
);

module.exports = router;
