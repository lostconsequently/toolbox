const express = require("express");
const router = express.Router();

const { all, get, run } = require("../database/db");
const { validate, validationError } = require("../utils/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { isAdminRequest } = require("./auth");

const toolSchema = {
  categoryId: { type: "number", required: true, label: "Category" },
  subcategoryId: { type: "number", default: null },
  name: { type: "string", required: true, label: "Name" },
  description: { type: "string", default: "" },
  icon: { type: "string", default: "tool" },
  toolType: { type: "string", default: "lookup" },
  config: { type: "string", default: "" },
  inputTemplate: { type: "string", default: "" },
  favorite: { type: "boolean", default: false },
  enabled: { type: "boolean", default: true },
  isDraft: { type: "boolean", default: false },
  featured: { type: "boolean", default: false },
  sortOrder: { type: "number", default: 0 },
};

const favoriteSchema = {
  favorite: { type: "boolean", required: true, label: "Favorite" },
};

function toBool(value) {
  return Boolean(value);
}

function mapToolRow(row) {
  if (!row) return null;

  return {
    ...row,
    favorite: toBool(row.favorite),
    enabled: toBool(row.enabled),
    isDraft: toBool(row.isDraft),
    featured: toBool(row.featured),
  };
}

const TOOL_COLUMNS = `
  id,
  category_id,
  subcategory_id,
  name,
  description,
  icon,
  tool_type,
  config,
  input_template,
  favorite,
  enabled,
  is_draft,
  featured,
  sort_order,
  created_at,
  updated_at
`;

function fetchTool(id) {
  return get(`SELECT ${TOOL_COLUMNS} FROM tools WHERE id = ?`, [id]);
}

// A draft tool is an admin's in-progress/unpublished template - hiding the
// button in Tools Center UI isn't access control, so this filters the same
// way scripts.js already hides is_admin_only content from non-admins.
async function getToolOr404(id, req, res) {
  const tool = await fetchTool(id);

  if (!tool || (tool.isDraft && !isAdminRequest(req))) {
    res.status(404).json({ error: "Tool not found" });
    return null;
  }

  return tool;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = isAdminRequest(req);

    const tools = await all(
      `
      SELECT ${TOOL_COLUMNS}
      FROM tools
      ${isAdmin ? "" : "WHERE is_draft = 0"}
      ORDER BY sort_order ASC, name ASC
      `,
    );

    res.json(tools.map(mapToolRow));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const tool = await getToolOr404(req.params.id, req, res);
    if (!tool) return;

    res.json(mapToolRow(tool));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(toolSchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      INSERT INTO tools (
        category_id,
        subcategory_id,
        name,
        description,
        icon,
        tool_type,
        config,
        input_template,
        favorite,
        enabled,
        is_draft,
        featured,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        value.categoryId,
        value.subcategoryId,
        value.name,
        value.description,
        value.icon,
        value.toolType,
        value.config,
        value.inputTemplate,
        value.favorite ? 1 : 0,
        value.enabled ? 1 : 0,
        value.isDraft ? 1 : 0,
        value.featured ? 1 : 0,
        value.sortOrder,
      ],
    );

    const tool = await fetchTool(result.id);

    res.status(201).json(mapToolRow(tool));
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(toolSchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      UPDATE tools
      SET
        category_id = ?,
        subcategory_id = ?,
        name = ?,
        description = ?,
        icon = ?,
        tool_type = ?,
        config = ?,
        input_template = ?,
        favorite = ?,
        enabled = ?,
        is_draft = ?,
        featured = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        value.categoryId,
        value.subcategoryId,
        value.name,
        value.description,
        value.icon,
        value.toolType,
        value.config,
        value.inputTemplate,
        value.favorite ? 1 : 0,
        value.enabled ? 1 : 0,
        value.isDraft ? 1 : 0,
        value.featured ? 1 : 0,
        value.sortOrder,
        req.params.id,
      ],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Tool not found",
      });
      return;
    }

    const tool = await fetchTool(req.params.id);

    res.json(mapToolRow(tool));
  }),
);

router.patch(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(favoriteSchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      UPDATE tools
      SET
        favorite = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [value.favorite ? 1 : 0, req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Tool not found",
      });
      return;
    }

    const tool = await fetchTool(req.params.id);

    res.json(mapToolRow(tool));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await run(
      `
      DELETE FROM tools
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({
        error: "Tool not found",
      });
      return;
    }

    res.json({
      success: true,
    });
  }),
);

module.exports = router;
