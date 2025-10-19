import pkg from 'pg';
const { Pool } = pkg;

class Database {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    }

    async connect() {
        try {
            await this.pool.query('SELECT NOW()');
            console.log('Database connection established');
        } catch (error) {
            console.error('Database connection error:', error);
            throw error;
        }
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async addProduct(name, category, price, imageUrl) {
        const query = 'INSERT INTO products (name, category, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *';
        const result = await this.query(query, [name, category, price, imageUrl]);
        return result.rows[0];
    }

    async updateProduct(name, price) {
        const query = 'UPDATE products SET price = $1 WHERE name = $2 RETURNING *';
        const result = await this.query(query, [price, name]);
        return result.rows[0];
    }

    async setProductAvailability(name, available) {
        const query = 'UPDATE products SET available = $1 WHERE name = $2 RETURNING *';
        const result = await this.query(query, [available, name]);
        return result.rows[0];
    }

    async getAllProducts() {
        const query = 'SELECT * FROM products ORDER BY category, name';
        const result = await this.query(query);
        return result.rows;
    }

    async getProductsByCategory(category) {
        const query = 'SELECT * FROM products WHERE category = $1 AND available = TRUE ORDER BY name';
        const result = await this.query(query, [category]);
        return result.rows;
    }

    async getAvailableCategories() {
        const query = 'SELECT DISTINCT category FROM products WHERE available = TRUE ORDER BY category';
        const result = await this.query(query);
        return result.rows.map(row => row.category);
    }

    async createOrder(orderData) {
        const { orderNumber, userId, userTag, items, totalPrice, deliveryTime, room, promoApplied, discountAmount } = orderData;
        const query = `
            INSERT INTO orders (order_number, user_id, user_tag, items, total_price, delivery_time, room, promo_applied, discount_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await this.query(query, [
            orderNumber, userId, userTag, JSON.stringify(items), totalPrice, deliveryTime, room, promoApplied, discountAmount
        ]);
        return result.rows[0];
    }

    async getOrder(orderNumber) {
        const query = 'SELECT * FROM orders WHERE order_number = $1';
        const result = await this.query(query, [orderNumber]);
        return result.rows[0];
    }

    async updateOrderStatus(orderNumber, status) {
        const query = 'UPDATE orders SET status = $1 WHERE order_number = $2 RETURNING *';
        const result = await this.query(query, [status, orderNumber]);
        return result.rows[0];
    }

    async assignDelivery(orderNumber, deliveryUserId, deliveryUserTag) {
        const query = `
            UPDATE orders 
            SET delivery_user_id = $1, delivery_user_tag = $2, status = 'preparation'
            WHERE order_number = $3 
            RETURNING *
        `;
        const result = await this.query(query, [deliveryUserId, deliveryUserTag, orderNumber]);
        return result.rows[0];
    }

    async setOrderChannel(orderNumber, channelId) {
        const query = 'UPDATE orders SET channel_id = $1 WHERE order_number = $2 RETURNING *';
        const result = await this.query(query, [channelId, orderNumber]);
        return result.rows[0];
    }

    async completeOrder(orderNumber) {
        const query = `
            UPDATE orders 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE order_number = $1 
            RETURNING *
        `;
        const result = await this.query(query, [orderNumber]);
        return result.rows[0];
    }

    async getPendingOrders() {
        const query = "SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC";
        const result = await this.query(query);
        return result.rows;
    }

    async getUserOrders(userId) {
        const query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10';
        const result = await this.query(query, [userId]);
        return result.rows;
    }

    async addPromotion(promoData) {
        const { name, triggerEvent, conditionText, conditionData, rewardText, rewardData, startDate, endDate } = promoData;
        const query = `
            INSERT INTO promotions (name, trigger_event, condition_text, condition_data, reward_text, reward_data, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await this.query(query, [
            name, triggerEvent, conditionText, JSON.stringify(conditionData), rewardText, JSON.stringify(rewardData), startDate, endDate
        ]);
        return result.rows[0];
    }

    async getActivePromotions() {
        const query = `
            SELECT * FROM promotions 
            WHERE active = TRUE 
            AND (start_date IS NULL OR start_date <= CURRENT_TIMESTAMP)
            AND (end_date IS NULL OR end_date >= CURRENT_TIMESTAMP)
            ORDER BY created_at DESC
        `;
        const result = await this.query(query);
        return result.rows;
    }

    async getAllPromotions() {
        const query = 'SELECT * FROM promotions ORDER BY created_at DESC';
        const result = await this.query(query);
        return result.rows;
    }

    async togglePromotion(promoId, active) {
        const query = 'UPDATE promotions SET active = $1 WHERE id = $2 RETURNING *';
        const result = await this.query(query, [active, promoId]);
        return result.rows[0];
    }

    async incrementPromoUsage(promoId) {
        const query = 'UPDATE promotions SET times_used = times_used + 1 WHERE id = $1';
        await this.query(query, [promoId]);
    }

    async getStats() {
        const totalOrders = await this.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'");
        const totalRevenue = await this.query("SELECT SUM(total_price) as revenue FROM orders WHERE status = 'completed'");
        const topProducts = await this.query(`
            SELECT p.name, p.category, p.total_sales, p.price, 
                   (p.total_sales * p.price) as revenue
            FROM products p
            WHERE p.total_sales > 0
            ORDER BY p.total_sales DESC
            LIMIT 5
        `);
        
        return {
            totalOrders: parseInt(totalOrders.rows[0].count),
            totalRevenue: parseFloat(totalRevenue.rows[0].revenue || 0),
            topProducts: topProducts.rows
        };
    }

    async incrementProductSales(productName, quantity) {
        const query = 'UPDATE products SET total_sales = total_sales + $1 WHERE name = $2';
        await this.query(query, [quantity, productName]);
    }
}

export default Database;
