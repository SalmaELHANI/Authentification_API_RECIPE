const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        trim:true,
        required: true,
    },
    email:{
        type:String,
        required: true,
        lowercase : true,
        unique : true,
    },
    phone:String,
    password:{
        type:String,
        required: true,
        minlength:[6, 'Too short password'],
    },
    isAdmin: {
        type:Boolean,
        default: false
    }
})
const model = mongoose.model("User",userSchema)
module.exports = model;