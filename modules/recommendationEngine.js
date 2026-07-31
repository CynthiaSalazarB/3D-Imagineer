/**
 * @module recommendationEngine
 *
 * Two-tier content-based product recommender.
 *
 * ## Strategy
 *
 * **Tier 1 — LLM reasoning (Gemini 2.5 Flash):**
 * Injects the product catalog and cart contents into a structured prompt and
 * asks Gemini to return up to three product IDs that would complement the cart.
 * IDs are used (not titles) to avoid name-matching bugs and allow direct DB lookup.
 *
 * **Tier 2 — Category-matching fallback:**
 * When the API is unavailable (quota, network, key issues), the engine falls
 * back to a deterministic content-based filter: products whose category matches
 * an item already in the cart are ranked first (highest semantic relevance),
 * then filled with products from other categories. This is a real content-based
 * filtering technique — appropriate when LLM reasoning is unavailable, and it
 * ensures the "You Might Also Like" section always renders something meaningful.
 *
 * ## Why content-based over collaborative filtering?
 * Collaborative filtering ("users who bought X also bought Y") requires a matrix
 * of historical purchase data across many users. This store has no such history,
 * so we reason over product attributes (category, title, description) instead.
 *
 * ## Upgrade path
 * Once purchase history accumulates, replace the fallback with an embedding-based
 * approach: generate text embeddings for each product description (e.g. via the
 * Gemini Embeddings API), store them in a vector DB, and retrieve nearest neighbours
 * for the cart's centroid vector. This removes the LLM call entirely and scales to
 * millions of products with sub-millisecond latency.
 *
 * ## Eval approach
 * Manual spot-checks after each catalog change:
 *   Cart: [Mushrooms (Nature), Modern Bedroom (Interior)]
 *   Expected: cross-category variety (Nature + Sci-Fi or Architecture), not duplicates
 *   Fallback: same-category products first (Nature), then others
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Builds a concise catalog string for the Gemini prompt.
 * Only includes fields relevant to content-based similarity.
 *
 * @param {Array} products - Array of Mongoose product documents
 * @returns {string}
 */
function buildCatalogText(products) {
    return products.map(p =>
        `ID:${p._id} | Title:${p.title} | Category:${p.category} | Desc:${p.description.slice(0, 80)}`
    ).join('\n');
}

/**
 * Tier 2 fallback: content-based category matching.
 *
 * Ranks candidate products by whether their category overlaps with anything
 * already in the cart. Same-category products appear first (high relevance),
 * then other categories fill the remaining slots. Capped at 3 results.
 *
 * @param {Array} validItems - Cart items with non-null products
 * @param {Array} candidates - Products not already in the cart
 * @returns {Array}          - Up to 3 recommended product documents
 */
function categoryFallback(validItems, candidates) {
    const cartCategories = new Set(validItems.map(item => item.product.category));
    const sameCategory = candidates.filter(p => cartCategories.has(p.category));
    const otherCategory = candidates.filter(p => !cartCategories.has(p.category));
    return [...sameCategory, ...otherCategory].slice(0, 3);
}

/**
 * Returns up to 3 products that complement the current cart.
 *
 * Attempts Gemini-powered LLM reasoning first (Tier 1); falls back to
 * category matching (Tier 2) if the API is unavailable for any reason.
 *
 * @param {Array} cartItems     - Items in the session cart ({ product, quantity })
 * @param {Array} allProducts   - Full product catalog from MongoDB
 * @returns {Promise<Array>}    - Recommended product documents (may be empty)
 */
async function getRecommendations(cartItems, allProducts) {
    if (!cartItems || cartItems.length === 0 || !allProducts || allProducts.length === 0) {
        return [];
    }

    // Guard against stale session entries where the product was deleted from DB
    const validItems = cartItems.filter(item => item.product && item.product._id);
    if (validItems.length === 0) return [];

    const cartIds = new Set(validItems.map(item => item.product._id.toString()));
    const candidates = allProducts.filter(p => !cartIds.has(p._id.toString()));

    if (candidates.length === 0) return [];

    const cartSummary = validItems
        .map(item => `${item.product.title} (${item.product.category})`)
        .join(', ');

    // Tier 1: Gemini API
    try {
        const prompt = `
You are a product recommendation engine for a 3D model online store.

The customer's cart contains: ${cartSummary}

Available products (NOT in cart):
${buildCatalogText(candidates)}

Return a JSON array of up to 3 product IDs that would best complement the cart.
Prioritize products from complementary categories or matching themes.
Respond ONLY with a raw JSON array of ID strings, no markdown, no explanation.
Example format: ["id1","id2","id3"]
`.trim();

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract the first JSON array — robust against prose or markdown fences
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
            const recommendedIds = JSON.parse(match[0]);
            if (Array.isArray(recommendedIds) && recommendedIds.length > 0) {
                const picks = candidates
                    .filter(p => recommendedIds.includes(p._id.toString()))
                    .slice(0, 3);
                if (picks.length > 0) {
                    console.log('[recommendationEngine] tier 1: served by Gemini');
                    return picks;
                }
            }
        }
    } catch (err) {
        console.warn('[recommendationEngine] Gemini unavailable, using category fallback:', err.message);
    }

    // Tier 2: category-matching fallback
    console.log('[recommendationEngine] tier 2: served by category fallback');
    return categoryFallback(validItems, candidates);
}

module.exports = { getRecommendations };
