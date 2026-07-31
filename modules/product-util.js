//encapsulate the static (“fake”) data for both the “Featured Products” section on
//the home page and the products shown on the inventory page.
//
// ⚠️ `title` is the upsert key used by /load-data/products to restore the catalog.
// Renaming a product here does NOT rename it in the database. The restore finds no
// document with the new title and inserts a second one, leaving both spellings in the
// catalog. To rename a starter product: change it here, deploy, then delete the old
// one in the clerk UI and run the restore.
//
// Image paths must match the files in assets/images/ exactly, including case. Windows
// is case-insensitive so a mismatch works locally, but the deployment runs on Linux
// and will 404 the image.
const products = [
    {
        title: "Modern Kitchen",
        description: "Kitchen Furniture",
        category: "Interior Design",
        price: 40,
        salePrice: 30,
        shippingWeight: 25,
        shippingWidth: 150,
        shippingLength: 150,
        shippingHeight: 150,
        imageUrl: "/images/kitchen.png",
        featured: false
    },
    {
      title: "Modern Livingroom",
      description: "Living Room Furniture",
      category: "Interior Design",
      price: 40,
      salePrice: 30,
      shippingWeight: 25,
      shippingWidth: 150,
      shippingLength: 150,
      shippingHeight: 150,
      imageUrl: "/images/livingroom.jpg",
      featured: false
  },
  {
    title: "Modern Bedroom",
    description: "Bedroom Furniture",
    category: "Interior Design",
    price: 40,
    salePrice: 30,
    shippingWeight: 25,
    shippingWidth: 150,
    shippingLength: 150,
    shippingHeight: 150,
    imageUrl: "/images/blueroom.jpg",
    featured: true
  },
  {
    title: "Ghost",
    description: "White animated Ghosts",
    category: "Characters",
    price: 40, 
    salePrice: 30,
    shippingWeight: 25,
    shippingWidth: 150,
    shippingLength: 150,
    shippingHeight: 150,
    imageUrl: "/images/ghosts.jpg",
    featured: true
  },
  {
    title: "Tortoise",
    description: "Halloween Tortoise",
    category: "Characters",
    price: 40, 
    salePrice: 30,
    shippingWeight: 25,
    shippingWidth: 150,
    shippingLength: 150,
    shippingHeight: 150,
    imageUrl: "/images/tortoise.jpg",
    featured: true
  },
  {
    title: "Dog",
    description: "Smilly Brown Dog",
    category: "Characters",
    price: 40, 
    salePrice: 30,
    shippingWeight: 25,
    shippingWidth: 150,
    shippingLength: 150,
    shippingHeight: 150,
    imageUrl: "/images/dog.jpg",
    featured: false
  },
    {
        title: "Space",
        description: "Spaceship in space",
        category: "Sceneries",
        price: 40,
        salePrice: 30,
        shippingWeight: 25,
        shippingWidth: 150,
        shippingLength: 150,
        shippingHeight: 150,
        imageUrl: "/images/space.jpg",
        featured: true
    },
    {
        title: "Rainbow",
        description: "Colorful Rainbow",
        category: "Sceneries",
        price: 40,
        salePrice: 30,
        shippingWeight: 25,
        shippingWidth: 150,
        shippingLength: 150,
        shippingHeight: 150,
        imageUrl: "/images/rainbow.jpg",
        featured: false
    },
    {
      title: "Modern Building",
      description: "Modern Building",
      category: "Sceneries",
      price: 40,
      salePrice: 30,
      shippingWeight: 25,
      shippingWidth: 150,
      shippingLength: 150,
      shippingHeight: 150,
      imageUrl: "/images/building.jpg",
      featured: true
  },
  {
    title: "Mushrooms",
    description: "Neon Mushrooms",
    category: "Sceneries",
    price: 40,
    salePrice: 30,
    shippingWeight: 25,
    shippingWidth: 150,
    shippingLength: 150,
    shippingHeight: 150,
    imageUrl: "/images/mushroom.jpg",
    featured: true
}

];

exports.getAllProducts = () => products;

exports.getFeaturedProducts = () => products.filter(products=>products.featured);

exports.getProductsByCategory = (products) => {
    //group products dynamically by category with .reduce()
    return products.reduce((acc, product) => {
        // Find an existing category group in the accumulator array
      let categoryGroup = acc.find(group => group.category === product.category);
  
      if (!categoryGroup) {
        categoryGroup = { 
          category: product.category,  
          products: []                                                                                            
        };
  
        acc.push(categoryGroup); 
      }
  
      categoryGroup.products.push(product);
  
      return acc;
    }, []);  // Start with an empty array `[]` as the initial value of `acc`
  };
  