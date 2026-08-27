const { get, run } = require("../database/db");
const { CATEGORY_PRESET } = require("../data/setupPresets");

// Only allow seeding a preset onto a genuinely empty instance - an existing
// installation upgrading to a version that adds this wizard would otherwise
// get its real categories/tools wiped and replaced. schema.sql always seeds
// exactly one "General" category on a fresh boot, so "categories <= 1 and
// nothing else exists yet" is the fresh-install signature to check for.
async function isSeedEligible() {
  const [categories, subcategories, tools] = await Promise.all([
    get("SELECT COUNT(*) AS count FROM categories"),
    get("SELECT COUNT(*) AS count FROM subcategories"),
    get("SELECT COUNT(*) AS count FROM tools"),
  ]);

  return (
    (categories?.count || 0) <= 1 &&
    (subcategories?.count || 0) === 0 &&
    (tools?.count || 0) === 0
  );
}

async function applyCategoryPreset({ includeTools }) {
  if (!(await isSeedEligible())) {
    const err = new Error(
      "This instance already has categories, subcategories or tools - refusing to overwrite them with a preset.",
    );
    err.code = "setup.notEligibleForPreset";
    throw err;
  }

  // Clears the auto-seeded "General" placeholder too (or whatever single
  // row exists) - cascades to subcategories/tools via the FK, which is a
  // no-op here since isSeedEligible() just confirmed both are empty.
  await run("DELETE FROM categories");

  for (const category of CATEGORY_PRESET) {
    const { id: categoryId } = await run(
      "INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, 'category', 0)",
      [category.name, category.color],
    );

    for (const subcategory of category.subcategories) {
      const { id: subcategoryId } = await run(
        "INSERT INTO subcategories (category_id, name, icon, sort_order) VALUES (?, ?, 'category', 0)",
        [categoryId, subcategory.name],
      );

      if (includeTools && subcategory.tool) {
        const { toolType, name, description, icon } = subcategory.tool;

        await run(
          `INSERT INTO tools
             (category_id, subcategory_id, name, description, icon, tool_type, config, input_template, enabled)
           VALUES (?, ?, ?, ?, ?, ?, '', '', 1)`,
          [categoryId, subcategoryId, name, description, icon, toolType],
        );
      }
    }
  }
}

module.exports = { isSeedEligible, applyCategoryPreset };
