/**
 * Recalculates subtotal, tax (10%), and total for a session cart in-place.
 * Uses salePrice when present, falling back to price.
 *
 * @param {Object} cart - The session cart object ({ items, subtotal, tax, total })
 */
function calculateCartTotals(cart) {
    cart.subtotal = cart.items.reduce((sum, item) =>
        sum + ((item.product.salePrice || item.product.price) * item.quantity), 0);
    cart.tax = cart.subtotal * 0.10;
    cart.total = cart.subtotal + cart.tax;
}

module.exports = { calculateCartTotals };
