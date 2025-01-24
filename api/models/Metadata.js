const mongoose = require("mongoose");
const MetadataSchema = mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    symbol : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    image : {
        type : String,
        required : true
    },
    key : {
        type : String,
        required : true,
    },
})

module.exports = mongoose.model("MetaData", MetadataSchema);