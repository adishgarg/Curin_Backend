const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({

    OrganizationName: {
        type: String,
        required: true
    },
    Location:{
        type: String,
        required: true
    },
})


module.exports = mongoose.model('Organization', OrganizationSchema);