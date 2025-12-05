const express = require('express');
const router = express.Router();
const marketController = require('../../controller/admin/marketController');
const { adminAuth } = require('../../middleware/adminMiddleware');

// Products
router.get('/products', adminAuth, marketController.getProducts);
router.delete('/products/:id', adminAuth, marketController.deleteProduct);

// Orders
router.get('/orders', adminAuth, marketController.getOrders);

// Categories
router.get('/categories', adminAuth, marketController.getMarketCategories);
router.post('/categories', adminAuth, marketController.createMarketCategory);
router.put('/categories/:id', adminAuth, marketController.updateMarketCategory);
router.delete('/categories/:id', adminAuth, marketController.deleteMarketCategory);

// Payments
router.get('/payments', adminAuth, marketController.getMarketPayments);
router.post('/payments/:id/approve', adminAuth, marketController.approveMarketPayment);

module.exports = router;