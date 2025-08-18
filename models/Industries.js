const mongoose = require('mongoose');

const IndustrySchema = new mongoose.Schema({
    IndustryName: {
        type: String,
        required: true,
        trim: true
    },
    Location: {
        type: String,
        required: true,
        trim: true
    },
    ContactPoint:[{
        Name: {
            type: String,
            required: true,
            trim: true
        },
        Email: {
            type: String,
            required: true,
            trim: true
        },
        Phone: {
            type: String,
            required: true,
            trim: true
        }
    }],
});

IndustrySchema.virtual('contactCount').get(function() {
    return this.ContactPoint.length;
});

module.exports = mongoose.model('Industry', IndustrySchema);
