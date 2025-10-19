export function hasBDERole(member) {
    return member.roles.cache.has(process.env.BDE_ROLE_ID);
}

export function hasStudentRole(member) {
    return member.roles.cache.has(process.env.STUDENT_ROLE_ID) || hasBDERole(member);
}

export function generateOrderNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `UT-${timestamp}-${random}`.toUpperCase();
}

export function formatPrice(price) {
    return `${parseFloat(price).toFixed(2)}€`;
}

export function getOrderStatusEmoji(status) {
    const statusMap = {
        'pending': '🟡',
        'preparation': '🟢',
        'delivery': '🚴',
        'delivered': '🔵',
        'completed': '✅',
        'cancelled': '🔴',
        'delayed': '⏳'
    };
    return statusMap[status] || '❓';
}

export function getOrderStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'preparation': 'En préparation',
        'delivery': 'En livraison',
        'delivered': 'Livrée',
        'completed': 'Terminée',
        'cancelled': 'Annulée',
        'delayed': 'Retardée'
    };
    return statusMap[status] || 'Inconnu';
}

export function calculateTotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function groupByCategory(products) {
    return products.reduce((acc, product) => {
        if (!acc[product.category]) {
            acc[product.category] = [];
        }
        acc[product.category].push(product);
        return acc;
    }, {});
}
