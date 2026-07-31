# 3D Imagineer

A full-stack e-commerce store for 3D models, with role-based access control, a session cart,
and an LLM-backed recommendation engine that degrades gracefully when the API is unavailable.

Node.js, Express, MongoDB and EJS, deployed on Vercel.

**[▶ Try it live](https://3d-imagineer.vercel.app/)**

## Demo accounts

Sign in with either account to see both sides of the store, no sign-up needed.


| Role          | Email                           | Password           |
| ------------- | ------------------------------- | ------------------ |
| Clerk (admin) | `clerk@demo.3dimagineer.app`    | `DemoClerk2026`    |
| Customer      | `customer@demo.3dimagineer.app` | `DemoCustomer2026` |


The role is stored on the user, not chosen at login, so signing in as the clerk lands on
inventory management and as the customer lands on the browsable catalog. New sign-ups are
customers by default.

To create these on a fresh database: `node scripts/seedDemoUsers.js`

## What it does

- **Role-based access control.** The role lives on the user document and is read from the
database at login, never from the request, so a client cannot grant itself clerk access. A
`checkRole(role)` middleware factory then guards routes by session role: clerks add, edit
and remove inventory, customers browse and buy, and neither can reach the other's routes.
- **Session cart** with quantity updates and running totals (subtotal, tax, total)
recalculated on every mutation.
- **Inventory management** with image upload.
- **Auth** with bcrypt hashing applied in a Mongoose `pre("save")` hook, so a plaintext
password never reaches the database.
- **Transactional email** via Mailgun for sign-up and order confirmation. The sending domain
comes from `MAILGUN_DOMAIN`. Running on a Mailgun sandbox domain, delivery is limited to
recipients authorized in the Mailgun dashboard, so on the live demo the confirmation email
reaches only pre-authorized addresses. Sending to any customer requires a verified domain,
which is a DNS change rather than a code change.



## The recommendation engine

The part worth reading: `[modules/recommendationEngine.js](modules/recommendationEngine.js)`.
`getRecommendations(cartItems, allProducts)` returns up to three products complementing the
cart, in two tiers.

**Tier 1, Gemini 2.5 Flash.** The catalog and a cart summary are injected into a structured
prompt; the model returns product IDs as JSON. The parser extracts the first JSON array in
the response, so markdown fences or surrounding prose do not break it, then maps IDs back to
MongoDB documents.

**Tier 2, category matching.** If the key is missing, rate-limited, or the call fails, the
engine falls back to deterministic content-based filtering: products sharing a category with
a cart item rank first, then the rest fill in. The cart route is wrapped so that a total
failure renders the cart normally with no recommendations rather than erroring.

**Why content-based and not collaborative filtering?** Collaborative filtering needs a matrix
of historical purchases, and this store has none, so the engine reasons over product
attributes instead. Once purchase logs exist the upgrade is to embed product descriptions,
store the vectors, and retrieve nearest neighbours to the cart centroid, taking the LLM call
out of the request path entirely.

## Stack


| Layer   | Choice                                   |
| ------- | ---------------------------------------- |
| Server  | Node.js, Express, express-ejs-layouts    |
| Data    | MongoDB via Mongoose                     |
| Views   | EJS, shared layout and partials          |
| Styling | Tailwind CSS + DaisyUI (`cupcake` theme) |
| Auth    | express-session, bcrypt                  |
| Email   | Mailgun                                  |
| AI      | Google Gemini 2.5 Flash                  |
| Hosting | Vercel                                   |




## Running locally

```bash
npm install
cp config/.env.example config/.env    # then fill in the values
npm start                             # server
npm run tw:build                      # Tailwind watcher, separate terminal
```

Visit `/load-data/products` once to seed the catalog. It inserts the ten starter products
from `modules/product-util.js` only if the collection is empty, so it is safe to hit twice.

## Structure

```
server.js               route mounting, session and layout config
controllers/            general (auth, cart), inventory, load-data
middleware/auth.js      checkRole(role) route guard
models/                 productModel, userModel
modules/                recommendationEngine, cartUtil, product-util
views/                  layout/, partials/, page templates
assets/                 static files, Tailwind source and build output
```

