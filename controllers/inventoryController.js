const express = require("express");
const router = express.Router();
const productModel = require('../models/productModel');
const fs = require('fs');
const path = require('path');
const { checkRole } = require('../middleware/auth');

router.get("/", (req, res) => {
    productModel.find()
        .then(products => {
            // Dynamically categorize products
            const categorizedProducts = products.reduce((categories, product) => {
                const category = product.category || "Uncategorized";
                const existingCategory = categories.find(c => c.category === category);
                if (existingCategory) {
                    existingCategory.products.push(product);
                } else {
                    categories.push({ category: category, products: [product] });
                }
                return categories;
            }, []);

            res.render("inventory", {
                title: "Inventory",
                categorizedProducts: categorizedProducts
            });
        })
        .catch(err => {
            console.error("Error fetching products:", err);
            res.status(500).render("error", { title: "Error", message: "Failed to fetch inventory" });
        });
});


router.get("/list", checkRole('clerk'), (req, res) => {

    productModel.find().sort({title:1})
        .then(products=>{
            res.render("list", {
                title: "Inventory List",
                products: products,
                message: `Welcome, ${req.session.user.firstName}! You are logged in as a data entry clerk.`
            });
        })
        .catch(err => {
            res.status(500).render('error', { title: 'Error', message: 'Failed to fetch products' });
        }); 
});

// Add product form
router.get("/add", checkRole('clerk'), (req, res) => {
    res.render("add-product", { title: "Add Product" });
});

// Add product logic
router.post("/add",checkRole('clerk'), (req, res) => {
    // Check if a file was uploaded
    if(!req.files || !Object.keys(req.files).length===0)
    {
        return res.status(400).render('error', { title: 'Error', message: 'No files were uploaded.' });
    }

    // Get the image file from the request
    let productImage = req.files.imageUrl;

    // Validate the file extension
    const allowedExtensions = /jpg|jpeg|gif|png/i;
    const fileExtension = productImage.name.split('.').pop();
    if (!allowedExtensions.test(fileExtension)) {
        return res.status(400).render('error', { title: 'Error', message: 'Invalid file type. Only jpg, jpeg, gif, or png files are allowed.' });
    }

    //Validate the form data
    const price = parseFloat(parseFloat(req.body.price).toFixed(2));
    const salePrice = req.body.salePrice ? parseFloat(parseFloat(req.body.salePrice).toFixed(2)) : undefined;

    if (isNaN(price) || price <= 0 || (salePrice !== undefined && (isNaN(salePrice) || salePrice <= 0))) {
        return res.status(400).render('error', { title: 'Error', message: 'Invalid price or sale price.' });
    }

    //Validate shipping dimensions
    const shippingWeight = parseInt(req.body.shippingWeight);
    const shippingWidth = parseInt(req.body.shippingWidth);
    const shippingLength = parseInt(req.body.shippingLength);
    const shippingHeight = parseInt(req.body.shippingHeight);

    if (shippingWeight <= 0 || shippingWidth <= 0 || shippingLength <= 0 || shippingHeight <= 0) {
        return res.status(400).render('error', { title: 'Error', message: 'Shipping dimensions must be positive integers.' });
    }


    // Set the upload path for the image to store it in the server
    let uploadPath = path.join(__dirname, '..', 'assets', 'images', productImage.name);

     // Move the uploaded file to the specified path
     productImage.mv(uploadPath)
        .then(()=>{
        // Create a new product instance with the form data
        let newProduct = new productModel({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            price: price,
            salePrice: salePrice,
            shippingWeight: shippingWeight,
            shippingWidth: shippingWidth,
            shippingLength: shippingLength,
            shippingHeight: shippingHeight,
            imageUrl: `/images/${productImage.name}`,
            featured: req.body.featured === 'on'
        });
        return newProduct.save();
        })
        .then(()=>{
            console.log('Product added');
            res.redirect('/inventory/list');
        })
        .catch(err => {
            console.log('Error adding product:', err);
            res.status(500).render('error', { title: 'Error', message: 'Failed to add product' });
        });
    });
router.get("/edit/:id", checkRole('clerk'), (req, res) => {
        productModel.findById(req.params.id)
        .then(product => {
            if (!product) {
                console.log('Product not found');
                return res.status(404).render('error', { title: 'Error', message: 'Product not found' });
            }
            res.render("edit-product", { title: "Edit Product", product: product });
        })
        .catch(err => {
            console.log('Error fetching product:', err);
            res.status(500).render('error', { title: 'Error', message: 'Failed to fetch product' });
        }); 
});

router.post("/edit/:id", checkRole('clerk'), (req, res) => {
    // Validate price and salePrice
    const price = parseFloat(parseFloat(req.body.price).toFixed(2));
    const salePrice = req.body.salePrice ? parseFloat(parseFloat(req.body.salePrice).toFixed(2)) : undefined;

    if (isNaN(price) || price <= 0 || (salePrice !== undefined && (isNaN(salePrice) || salePrice <= 0))) {
        return res.status(400).render('error', { title: 'Error', message: 'Invalid price or sale price.' });
    }

    // Validate shipping dimensions
    const shippingWeight = parseInt(req.body.shippingWeight);
    const shippingWidth = parseInt(req.body.shippingWidth);
    const shippingLength = parseInt(req.body.shippingLength);
    const shippingHeight = parseInt(req.body.shippingHeight);

    if (shippingWeight <= 0 || shippingWidth <= 0 || shippingLength <= 0 || shippingHeight <= 0) {
        return res.status(400).render('error', { title: 'Error', message: 'Shipping dimensions must be positive integers.' });
    }

    //create new object to store updated data
    let updateData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        price: parseFloat(req.body.price),
        salePrice: req.body.salePrice ? parseFloat(req.body.salePrice) : undefined,
        shippingWeight: parseInt(req.body.shippingWeight),
        shippingWidth: parseInt(req.body.shippingWidth),
        shippingLength: parseInt(req.body.shippingLength),
        shippingHeight: parseInt(req.body.shippingHeight),
        featured: req.body.featured === 'on'
    };

    // Check if a new image was uploaded
    if(req.files&& req.files.imageUrl){
        // Get the image file from the request
        let productImage = req.files.imageUrl;
        
        // Validate the file extension
        const allowedExtensions = /jpg|jpeg|gif|png/i;
        const fileExtension = productImage.name.split('.').pop();
        if (!allowedExtensions.test(fileExtension)) {
            return res.status(400).render('error', { title: 'Error', message: 'Invalid file type. Only jpg, jpeg, gif, or png files are allowed.' });
        }

        let uploadPath = path.join(__dirname, '..', 'assets', 'images', productImage.name);

        // Move the new image to the upload path
        productImage.mv(uploadPath)
            .then(() => {
                // Update the image URL in the database
                updateData.imageUrl = `/images/${productImage.name}`;
                // Find the product by ID and update its data
                return productModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
            })
            .then(() => {
                // Redirect to the product list after successful update
                res.redirect('/inventory/list');
            })
            .catch(err => {
                console.error('Error updating product:', err);
                // Handle any errors that occur during file upload or database update
                res.status(500).render('error', { title: 'Error', message: 'Failed to update product' });
            });
    }
    else{
        // If no new image, just update the product data
        productModel.findByIdAndUpdate(req.params.id, updateData, { new: true })
        .then(() => {
            console.log('Product updated');
            res.redirect('/inventory/list');
        })
        .catch(err => {
            console.log('Error updating product:', err);
            res.status(500).render('error', { title: 'Error', message: 'Failed to update product' });
        });
    }
});

router.get("/remove/:id", checkRole('clerk'), (req, res) => {
    productModel.findById(req.params.id)
    .then(product => {
        if (!product) {
            console.log('Product not found');
            return res.status(404).render('error', { title: 'Error', message: 'Product not found' });
        }
        // Render the remove confirmation page with the product data
        console.log('Product found:', product);
        res.render("remove-product", { title: "Remove Product", product: product });
    })
    .catch(err=>{
        console.log('Error fetching product:', err);
        // Handle any errors that occur during the database query
        res.status(500).render('error', { title: 'Error', message: 'Failed to fetch product' });
    });
});

// Remove product logic
router.post("/remove/:id", checkRole('clerk'), (req, res) => {
    productModel.findByIdAndDelete(req.params.id)
    .then(product=>{
        if(!product){
            console.log('Product not found');
            return res.status(404).render('error', { title: 'Error', message: 'Product not found' });
        }
        //remove the image file from the server
        fs.unlink(path.join(__dirname, '..', 'assets', product.imageUrl),(err)=>{

            if (err) console.error('Failed to delete image:', err);
            });
            //redirect to the product list after successful removal
            res.redirect('/inventory/list');
        })
        .catch(err=>{
            console.log('Error fetching product:', err);
            // Handle any errors that occur during the database query
            res.status(500).render('error', { title: 'Error', message: 'Failed to fetch product' });
        });
    });


module.exports = router;
