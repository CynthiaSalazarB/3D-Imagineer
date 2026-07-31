//include mongoose
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

//Create a Schema
const userSchema = new mongoose.Schema({
firstName: {
    "type": String,
    "required": true
},
lastName:  {
    "type": String,
    "required": true
},
email:  {
    "type": String,
    "required": true,
    "unique": true
},
password:  {
    "type": String,
    "required": true
},
profilePicture: String,
role: {
    "type": String,
    "enum": ["customer", "clerk"],
    "default": "customer"
},
dateCreated: {
    "type": Date,
    "default": Date.now()
}
});

//
userSchema.pre("save", function(next){
    let user = this;
    //Generate a unique SALT.
    bcrypt.genSalt()
    .then(salt =>{
        //Hash the password using the SALT
        bcrypt.hash(user.password, salt)
        .then(hashPwd =>{
            user.password = hashPwd;
            next();
        })
        .catch(err =>{
            console.log(`Error occurred when hashing the password: ${err}`);
            //next(err);
        }) ;
    })
    .catch(err =>{
        console.log(`Error occurred when generating the SALT: ${err}`);
        //next(error);      
    });


    
});

//Create a model
const userModel= mongoose.model("users", userSchema);

//Export the model
module.exports = userModel;

