import mongoose from "mongoose"

const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    unit: {
        type: String,
        required: true
    },

    quantity: {
        type: Number,
        required: true
    },

    image: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop", // Refers to the Shop collection
        required: true,
    }
})

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default foodModel;
