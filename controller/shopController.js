import Shop from '../models/ShopModel.js';
import foodModel from '../models/foodModel.js';
import { getShopIdFromToken } from './foodController.js';


const shopDetails = async (req, res) => {
    try {

        const { token } = req.headers;
        let shopId = getShopIdFromToken(token);

        // Fetch the shop details by ID
        const shop = await Shop.findById(shopId);

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found',
            });
        }
        res.status(200).json({
            success: true,
            shop: shop
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Something Went Wrong, retry again !',
            error: error.message,
        });
    }
}

const fetchAllShops = async (req, res) => {
    try {
        // Get the current date
        const currentDate = new Date();

        // Fetch only shops whose subscription end date is greater than or equal to the current date
        const shops = await Shop.find({
            subEndDate: { $gte: currentDate },
        });

        res.status(200).json({
            success: true,
            data: shops,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shops',
            error: error.message,
        });
    }
};


// GET /api/shop/:shopId
const findShop = async (req, res) => {
    const { shopId } = req.params;

    try {
        // Fetch the shop details by ID
        const shop = await Shop.findById(shopId);

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found',
            });
        }

        // Fetch all food items associated with this shop
        const foodItems = await foodModel.find({ shop: shopId });

        // Return shop coordinates (latitude and longitude)
        const coordinates = {
            lat: shop.shopAddress.latitude,
            lng: shop.shopAddress.longitude,
        };

        res.status(200).json({
            success: true,
            data: {
                shop,
                foodItems,
                coordinates, // Coordinates added to the response
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch shop details yad',
            error: error.message,
        });
    }
};





export { fetchAllShops, findShop, shopDetails };
