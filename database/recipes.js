const mongoose = require('mongoose');

const blogSchema =new mongoose.Schema({
    category:{
        type:String,
        required: true,
    },
    name:{
        type:String,
        required: true,
        unique: true,
    },
    description:{
        type:String,
        required: true,
    },
    ingredients : [String],   
    instructions : [String],   
});
const model = mongoose.model("recipes",blogSchema)
module.exports = model;
