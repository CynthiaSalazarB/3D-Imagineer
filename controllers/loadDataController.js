const express = require("express");
const router = express.Router();
const productModel = require('../models/productModel');
const productUtil = require('../modules/product-util');
const { checkRole } = require('../middleware/auth');

/**
 * Restores the starter catalog.
 *
 * This used to insert only when the collection was completely empty, which meant
 * that deleting a few products left no way back: the count was no longer zero, so
 * the route did nothing. Since this is a public demo whose clerk credentials are
 * published, the catalog erodes over time.
 *
 * Now every starter product is upserted by title, so the route restores whatever is
 * missing and leaves everything else untouched. Safe to run any number of times, and
 * it never overwrites a product a visitor legitimately edited or added.
 */
router.get("/products", checkRole('clerk'), (req, res) => {
    const starterProducts = productUtil.getAllProducts();

    const restore = starterProducts.map(product =>
        productModel.updateOne(
            { title: product.title },
            { $setOnInsert: product },
            { upsert: true }
        )
    );

    Promise.all(restore)
        .then(results => {
            const restored = results.filter(r => r.upsertedCount > 0).length;

            let message;
            if (restored === starterProducts.length) {
                message = `Success, all ${restored} starter products were loaded into the database`;
            } else if (restored > 0) {
                message = `Success, restored ${restored} missing product${restored === 1 ? '' : 's'}. The rest were already present`;
            } else {
                message = 'The full starter catalog is already in the database, nothing to restore';
            }

            res.render('load-data', { title: 'Load Data', message: message });
        })
        .catch(err => {
            console.error('Error restoring products:', err);
            res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred while restoring the catalog'
            });
        });
});

module.exports = router;
