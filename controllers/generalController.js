const express = require("express");
const router = express.Router();
const userModel = require("../models/userModel");
const productModel = require('../models/productModel');
const bcryptjs = require("bcryptjs");
const { checkRole } = require('../middleware/auth');
const { calculateCartTotals } = require('../modules/cartUtil');
const { getRecommendations } = require('../modules/recommendationEngine');

//Send email
const FormData = require ("form-data"); 
const Mailgun = require ("mailgun.js");

const mailgun= new Mailgun(FormData);
const mg = mailgun.client({
      username: "api",
      key: process.env.API_KEY
});

// Sending domain. A Mailgun sandbox domain only delivers to recipients you have
// authorized in the Mailgun dashboard; a verified domain is needed to email anyone.
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAIL_FROM = `3D Imagineer <postmaster@${MAILGUN_DOMAIN}>`;

// Email is a side effect of signing up, never a precondition for it. Failures are
// logged and swallowed so the account creation still succeeds.
const sendWelcomeEmail = (firstName, lastName, email) =>
    mg.messages.create(MAILGUN_DOMAIN, {
        from: MAIL_FROM,
        to: [`${firstName} ${lastName} <${email}>`],
        subject: "Welcome to 3D Imagineer!",
        text: `Dear ${firstName} ${lastName},\n\nWelcome to 3D Imagineer! We are excited to have you join our community.\n\nBest regards,\nCynthia Salazar\n3D Imagineer Team`
    }).catch(err => {
        console.error("Welcome email failed (the account was still created):", err);
    });


router.get("/", (req, res) => {
    productModel.find({ featured: true }) // Fetch only featured products
        .then(featuredProducts => {
            res.render("home", { 
                featuredProducts: featuredProducts,
                title: "Home"
            });
        })
        .catch(err => {
            console.error("Error fetching featured products:", err);
            res.status(500).render("error", { title: "Error", message: "Failed to fetch featured products" });
        });
});


router.get("/sign-up", (req, res) => {
    res.render("sign-up", { 
        title: "Sign Up",
        errorMessage: {},
        values: { firstName: "", lastName: "", email: "", password: "" }})
});

router.post("/sign-up", (req, res) => {
    const {firstName, lastName, email, password} = req.body;
    let passedValidation = true;
    let errorMessage = {};
    if(firstName === null || firstName === undefined || firstName.trim().length === 0){
        passedValidation = false;
        errorMessage.firstName = "First Name is required";
    }
    else if(firstName.trim().length < 2){
        passedValidation = false;
        errorMessage.firstName = "First Name must be at least 2 characters long";
    }

    if(lastName === null || lastName === undefined || lastName.trim().length === 0){
        passedValidation = false;
        errorMessage.lastName = "Last Name is required";
    }
    else if(lastName.trim().length < 2){
        passedValidation = false;
        errorMessage.lastName = "Last Name must be at least 2 characters long";
    }

    //Regex source: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if(email === null || email === undefined || email.trim().length === 0){
        passedValidation = false;
        errorMessage.email = "Email is required";
    }
    else if (!email.includes('@')) {
        passedValidation = false;
        errorMessage.email = "Email must contain an @ symbol";
    } else if (email.indexOf('@') === 0) {
        passedValidation = false;
        errorMessage.email = "Email cannot start with an @ symbol";
    } else if (!email.includes('.')) {
        passedValidation = false;
        errorMessage.email = "Email must contain a .";
    }
    else if(!emailRegex.test(email)){
        passedValidation = false;
        errorMessage.email = "Email is invalid";
    }

    //Regex source: https://stackoverflow.com/questions/12090077/javascript-regular-expression-password-validation-having-special-characters
    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if(password === null || password === undefined || password.trim().length === 0){
        passedValidation = false;
        errorMessage.password = "Password is required";
    }
    else if(password.trim().length < 8){
        passedValidation = false;
        errorMessage.password = "Password must be at least 8 characters long";
    }
    else if(!passwordRegex.test(/[0-9]/)<0){
        passedValidation = false;
        errorMessage.password = "Password must contain at least one number";
    }
    else if(!passwordRegex.test(/[!@#$%^&*]/)<0){
        passedValidation = false;
        errorMessage.password = "Password must contain at least one special character";
    }
    else if(!passwordRegex.test(/[a-z]/)<0){
        passedValidation = false;
        errorMessage.password = "Password must contain at least one lowercase letter";
    }
    else if(!passwordRegex.test(/[A-Z]/)<0){
        passedValidation = false;
        errorMessage.password = "Password must contain at least one uppercase letter";
    }

    //IF EMAIL IS VALID , send welcome email.
    if (passedValidation) {

        //Check if email is already in use
        userModel.findOne({email: email})
        .then (existingUser=> {
            if(existingUser){
                errorMessage.email = "Email is already in use";
                res.render("sign-up", {
                    title: "Sign Up",
                    values: req.body,
                    errorMessage: errorMessage
                });
            }
            else
            {
                const newUser = new userModel({
                      firstName,
                      lastName,
                      email,
                      password
                });

                //Save the user to the collection
                newUser.save()
                .then(userSaved => {
                    console.log(`User ${userSaved.firstName} has been added successfully`);
                    return sendWelcomeEmail(firstName, lastName, email);
                })
                .then(() => {
                    res.redirect("/welcome");
                })
                .catch(err => {
                    console.error("Error creating the user:", err);
                    errorMessage.email = "We could not create the account. Please try again.";
                    res.render("sign-up", {
                        title: "Sign Up",
                        values: req.body,
                        errorMessage: errorMessage
                    });
                });
            
            
                
            }
        })
    }
    //NOT PASSED VALIDATION
    else{
        res.render("sign-up", {
            title: "Sign Up",
            values: req.body,
            errorMessage: errorMessage
        });
    }
});

router.get("/log-in", (req, res) => {
    res.render("log-in", { 
        title: "Log In", 
        errorMessage: {},
        values: { email: "", password: "" }}) 
    });

    router.post("/log-in", (req, res) => {
    const { email, password } = req.body;
    let passedValidation = true;
    let errorMessage = {};
    let errors =[];
    if(email === null || email === undefined || email.trim().length === 0){
        passedValidation = false;
        errorMessage.email = "Email is required";
    }

    if (password === null || password === undefined || password.trim().length === 0) {
        passedValidation = false;
        errorMessage.password = "Password is required.";
    }

    if(passedValidation){
        
        userModel.findOne({email: email})
        .then(user => {
             if(user){
                //found the user document
                //compare the password submitted with the document
                bcryptjs.compare(password, user.password)
                .then(matched =>{
                    //done comparing passwords
                    if(matched){
                        // Passwords match.
                        //Create a Session
                        // The role comes from the stored user document, never from the
                        // request body, so a client cannot grant itself clerk access.
                        req.session.user = {
                            firstName: user.firstName,
                            email: email,
                            role: user.role
                        };
                        console.log("User has been logged in", req.session.user);

                        // Redirect based on role
                        if (user.role === "clerk") {
                            return res.redirect("/inventory/list");
                        } else if (user.role === "customer") {
                            return res.redirect("/inventory");
                        } else {
                            return res.redirect("/welcome");
                        }
                        //res.redirect("/");
                    }
                    else{
                    //passwords are different
                    errors.push("The passwords did not match.");
                    console.log(errors[0]);
                    res.render("log-in", { 
                            title: "Log In",
                            errorMessage: { general: errors[0] },
                            errors:errors,
                            values: { email: email, password: password }
                         });
                    }
                })
                .catch(err => { // Catch bcrypt compare error
                    errors.push("Error comparing passwords:" + err);
                    console.log(errors[0]);
                    res.render("log-in", { 
                      title: "Log In",
                      errorMessage: { general: errors[0] },
                      errors: errors,  // Pass the errors array
                      values: { email: email, password: password } // Pass values for the form
                   });
                  });
  
             }
             else{
                //user document not found 
                errors.push("Unable to query the database");
                console.log(errors[0]);
                res.render("log-in", { 
                    title: "Log In",
                    errorMessage: { general: errors[0] },
                    errors:errors,
                    values: { email: email, password: password }
                 });
             }
            })
    }
    else{
        res.render("log-in", {
            title: "Log In",
            values: req.body,
            errorMessage: errorMessage,
            errors:errors
    });
    }
});

router.get("/welcome", (req, res) => {
    res.render("welcome", { title: "Welcome" });
});

router.get("/log-out", (req, res) => {
    //clear the session from memory
    req.session.destroy();
     // Do NOT do this
    // req.session.user = null;

    res.redirect("/log-in");

});

router.get("/cart", checkRole('customer'), async (req, res) => {
    const cart = req.session.cart || { items: [], subtotal: 0, tax: 0, total: 0 };

    let recommendations = [];
    try {
        const allProducts = await productModel.find({});
        recommendations = await getRecommendations(cart.items, allProducts);
    } catch (err) {
        // Recommendations are non-critical — log and degrade gracefully
        console.error('Recommendation engine error:', err);
    }

    res.render("cart", {
        title: "Cart",
        message: `Welcome, ${req.session.user.firstName}! You are logged in as a customer.`,
        cart,
        recommendations
    });
});

// Add to Cart
router.post("/cart/add/:productId", checkRole('customer'), (req, res) => {
    const productId = req.params.productId;

    productModel.findById(productId)
        .then(product => {
            if (!product) {
                return res.status(404).render('error', { title: 'Error', message: 'Product not found' });
            }

            // Initialize cart if it doesn't exist
            if (!req.session.cart) {
                req.session.cart = { items: [], subtotal: 0, tax: 0, total: 0 };
            }

            // Check if item already in cart
            const existingItem = req.session.cart.items.find(item => item.product._id.toString() === product._id.toString());

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                req.session.cart.items.push({ product: product, quantity: 1 });
            }

            // Recalculate totals
            calculateCartTotals(req.session.cart);
            res.redirect("/cart");
        })
        .catch(err => {
            console.error("Error adding to cart:", err);
            res.status(500).render('error', { title: 'Error', message: 'Failed to add item to cart.' });
        });
});

// Update Quantity
router.post("/cart/update/:productId", checkRole('customer'), (req, res) => {
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity);

    if (!req.session.cart) {
        return res.redirect("/cart");
    }

    const item = req.session.cart.items.find(item => item.product._id.toString() === productId);

    if (item) {
        item.quantity = quantity;
        calculateCartTotals(req.session.cart);
    }

    res.redirect("/cart");
});

// Remove Item from Cart
router.post("/cart/remove/:productId", checkRole('customer'), (req, res) => {
    const productId = req.params.productId;

    if (!req.session.cart) {
        return res.redirect("/cart");
    }

    req.session.cart.items = req.session.cart.items.filter(item => item.product._id.toString() !== productId);
    calculateCartTotals(req.session.cart);

    res.redirect("/cart");
});

// Place Order
router.post("/cart/place-order", checkRole('customer'), (req, res) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(403).render("error", {
            title: "Error",
            message: "You must be logged in to place an order"
        });
    }

    // Check if cart exists and has items
    const cart = req.session.cart || { items: [] };
    if (cart.items.length === 0) {
        return res.render("cart", {
            title: "Cart",
            message: "The shopping cart is empty",
            cart: cart,
            recommendations: []
        });
    }

    // Generate email content
    const emailContent = `
        Order Confirmation\n
        Dear ${req.session.user.firstName},\n\n
        Thank you for your order! Here are your order details:\n
        ${cart.items.map(item => 
            `${item.product.title} - ${item.quantity} x $${(item.product.salePrice || item.product.price).toFixed(2)} = $${((item.product.salePrice || item.product.price) * item.quantity).toFixed(2)}`
        ).join('\n')}\n\n
        Subtotal: $${cart.subtotal.toFixed(2)}\n
        Tax (10%): $${cart.tax.toFixed(2)}\n
        Total: $${cart.total.toFixed(2)}\n\n
        Best regards,\n3D Imagineer Team
    `;

    // The order is placed here. The confirmation email is a side effect: a delivery
    // failure is logged, but it must not turn a completed order into an error or
    // leave the cart populated. (On a Mailgun sandbox domain, delivery only succeeds
    // for recipients authorized in the dashboard.)
    const recipient = req.session.user.email;
    req.session.cart = { items: [], subtotal: 0, tax: 0, total: 0 };

    const orderComplete = (message) => res.render("cart", {
        title: "Order Complete",
        message: message,
        cart: req.session.cart,
        recommendations: []
    });

    mg.messages.create(MAILGUN_DOMAIN, {
        from: MAIL_FROM,
        to: recipient,
        subject: "Order Confirmation",
        text: emailContent
    })
    .then(() => {
        orderComplete("Order placed successfully. A confirmation email is on its way.");
    })
    .catch(err => {
        console.error("Order confirmation email failed (order was still placed):", err);
        orderComplete("Order placed successfully. We could not send the confirmation email.");
    });
});

//Export the router
module.exports = router;