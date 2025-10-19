import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatPrice, calculateTotal } from '../utils/helpers.js';

export async function handleCategorySelect(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const category = interaction.values[0];
    const db = interaction.client.db;

    try {
        const products = await db.getProductsByCategory(category);

        if (products.length === 0) {
            return interaction.reply({
                content: '❌ Aucun produit disponible dans cette catégorie.',
                ephemeral: true
            });
        }

        const productOptions = products.map(product => ({
            label: `${product.name} - ${formatPrice(product.price)}`,
            value: product.name,
            description: `Prix: ${formatPrice(product.price)}`
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`product_select_${userId}_${category}`)
            .setPlaceholder('Choisir un produit')
            .setMinValues(1)
            .setMaxValues(Math.min(products.length, 25))
            .addOptions(productOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📦 Catégorie: ${category}`)
            .setDescription('Sélectionnez un ou plusieurs produits à ajouter à votre commande.');

        await interaction.update({
            embeds: [embed],
            components: [row]
        });

    } catch (error) {
        console.error('Error handling category select:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        });
    }
}

export async function handleProductSelect(interaction) {
    const [, , userId, category] = interaction.customId.split('_');
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const selectedProducts = interaction.values;
    const db = interaction.client.db;

    try {
        const products = await db.getProductsByCategory(category);
        const cart = interaction.client.userCarts.get(userId);

        for (const productName of selectedProducts) {
            const product = products.find(p => p.name === productName);
            if (product) {
                const existingItem = cart.items.find(item => item.name === productName);
                if (!existingItem) {
                    cart.items.push({
                        name: product.name,
                        price: parseFloat(product.price),
                        quantity: 1,
                        category: product.category
                    });
                }
            }
        }

        cart.lastInteraction = Date.now();
        interaction.client.userCarts.set(userId, cart);

        await showCartWithControls(interaction, userId);
        await showCart(interaction, userId);

    } catch (error) {
        console.error('Error handling product select:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        });
    }
}

export async function handleTimeSelect(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const deliveryTime = interaction.values[0];
    const cart = interaction.client.userCarts.get(userId);
    cart.deliveryTime = deliveryTime;

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📍 Lieu de livraison')
        .setDescription('Dans quelle salle souhaitez-vous être livré ?');

    const roomOptions = [
        { label: 'Salle 1-7', value: 'Salle 101' },
        { label: 'Salle 1-8', value: 'Salle 102' },
        { label: 'Salle 1-9', value: 'Salle 201' },
        { label: 'Salle 1-10', value: 'Salle 202' },
        { label: 'Hall d\'entrée (Étage 1)', value: 'Hall d\'entrée' },
        { label: 'Cafétéria', value: 'Cafétéria' }
    ];

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`room_select_${userId}`)
        .setPlaceholder('Choisir un lieu')
        .addOptions(roomOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

export async function showCartWithControls(interaction, userId) {
    const cart = interaction.client.userCarts.get(userId);
    const db = interaction.client.db;

    if (!cart || cart.items.length === 0) {
        return interaction.update({
            content: '🛒 Votre panier est vide.',
            embeds: [],
            components: []
        });
    }

    const total = calculateTotal(cart.items);

    // Check for promotions
    const promos = await db.getActivePromotions();
    let appliedPromo = null;
    let discount = 0;

    for (const promo of promos) {
        if (promo.condition_text.toLowerCase().includes('red bull')) {
            const redbullCount = cart.items
                .filter(item => item.name.toLowerCase().includes('red bull'))
                .reduce((sum, item) => sum + item.quantity, 0);
            
            if (redbullCount >= 2) {
                appliedPromo = promo;
                discount = total * 0.1;
                break;
            }
        }
    }

    const finalTotal = total - discount;

    let itemsDescription = '';
    cart.items.forEach((item, index) => {
        itemsDescription += `**${index + 1}.** ${item.name}\n`;
        itemsDescription += `   └ Qté: ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}\n\n`;
    });

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛒 Votre Panier')
        .setDescription(itemsDescription || 'Panier vide')
        .addFields({ name: '💰 Sous-total', value: formatPrice(total), inline: true });

    if (appliedPromo) {
        embed.addFields(
            { name: '🎁 Promotion', value: appliedPromo.name, inline: true },
            { name: '📉 Réduction', value: formatPrice(discount), inline: true }
        );
    }

    embed.addFields({ name: '💵 Total', value: `**${formatPrice(finalTotal)}**`, inline: false });
    embed.setFooter({ text: '💡 Utilisez les boutons pour modifier les quantités' });

    const components = [];

    if (cart.items.length > 0) {
        const itemOptions = cart.items.map((item, index) => ({
            label: `${item.name} (x${item.quantity})`,
            value: String(index),
            description: `${formatPrice(item.price)} l'unité`,
            emoji: '🛍️'
        }));

        const itemSelect = new StringSelectMenuBuilder()
            .setCustomId(`manage_item_${userId}`)
            .setPlaceholder('Sélectionner un article à modifier')
            .addOptions(itemOptions);

        components.push(new ActionRowBuilder().addComponents(itemSelect));
    }

    const actionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('validate_order')
            .setLabel('✅ Valider')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('clear_cart')
            .setLabel('🗑️ Vider le panier')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('cancel_order')
            .setLabel('❌ Annuler')
            .setStyle(ButtonStyle.Danger)
    );
    components.push(actionButtons);

    const categories = await db.getAvailableCategories();
    const categoryOptions = categories.map(cat => ({
        label: cat,
        value: cat,
        emoji: getCategoryEmoji(cat)
    }));

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId(`category_select_${userId}`)
        .setPlaceholder('➕ Ajouter d\'autres articles')
        .addOptions(categoryOptions);

    components.push(new ActionRowBuilder().addComponents(categorySelect));

    await interaction.update({
        embeds: [embed],
        components: components
    });
}

export async function handleManageItem(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const itemIndex = parseInt(interaction.values[0]);
    const cart = interaction.client.userCarts.get(userId);
    const item = cart.items[itemIndex];

    if (!item) {
        return interaction.reply({
            content: '❌ Article introuvable.',
            ephemeral: true
        });
    }

    cart.selectedItemIndex = itemIndex;
    interaction.client.userCarts.set(userId, cart);

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📊 Modifier la quantité')
        .setDescription(
            `**Article:** ${item.name}\n` +
            `**Prix unitaire:** ${formatPrice(item.price)}\n` +
            `**Quantité actuelle:** ${item.quantity}\n` +
            `**Total:** ${formatPrice(item.price * item.quantity)}`
        );

    const quantityButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`qty_minus_1_${userId}`)
            .setLabel('-1')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➖'),
        new ButtonBuilder()
            .setCustomId(`qty_plus_1_${userId}`)
            .setLabel('+1')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➕'),
        new ButtonBuilder()
            .setCustomId(`qty_minus_5_${userId}`)
            .setLabel('-5')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`qty_plus_5_${userId}`)
            .setLabel('+5')
            .setStyle(ButtonStyle.Secondary)
    );

    const moreActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`qty_custom_${userId}`)
            .setLabel('📝 Quantité personnalisée')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`qty_remove_${userId}`)
            .setLabel('🗑️ Retirer l\'article')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`qty_back_${userId}`)
            .setLabel('↩️ Retour')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        embeds: [embed],
        components: [quantityButtons, moreActions]
    });
}

async function showCart(interaction, userId) {
    const cart = interaction.client.userCarts.get(userId);
    const db = interaction.client.db;

    if (!cart || cart.items.length === 0) {
        return interaction.update({
            content: '🛒 Votre panier est vide.',
            embeds: [],
            components: []
        });
    }

    const total = calculateTotal(cart.items);

    const promos = await db.getActivePromotions();
    let appliedPromo = null;
    let discount = 0;

    for (const promo of promos) {
        if (promo.condition_text.toLowerCase().includes('red bull')) {
            const redbullCount = cart.items
                .filter(item => item.name.toLowerCase().includes('red bull'))
                .reduce((sum, item) => sum + item.quantity, 0);
            
            if (redbullCount >= 2) {
                appliedPromo = promo;
                discount = total * 0.1;
                break;
            }
        }
    }

    const finalTotal = total - discount;

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛒 Votre Panier')
        .setDescription(
            cart.items.map(item => 
                `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
            ).join('\n')
        )
        .addFields(
            { name: '💰 Sous-total', value: formatPrice(total), inline: true }
        );

    if (appliedPromo) {
        embed.addFields(
            { name: '🎁 Promotion', value: appliedPromo.name, inline: true },
            { name: '📉 Réduction', value: formatPrice(discount), inline: true }
        );
    }

    embed.addFields({ name: '💵 Total', value: `**${formatPrice(finalTotal)}**`, inline: false });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('validate_order')
            .setLabel('✅ Valider ma commande')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cancel_order')
            .setLabel('❌ Annuler')
            .setStyle(ButtonStyle.Danger)
    );

    const categories = await db.getAvailableCategories();
    const categoryOptions = categories.map(cat => ({
        label: cat,
        value: cat,
        emoji: getCategoryEmoji(cat)
    }));

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId(`category_select_${userId}`)
        .setPlaceholder('Ajouter d\'autres articles')
        .addOptions(categoryOptions);

    const selectRow = new ActionRowBuilder().addComponents(categorySelect);

    await interaction.update({
        embeds: [embed],
        components: [selectRow, buttons]
    });
}

function getCategoryEmoji(category) {
    const emojiMap = {
        'Boissons': '🥤',
        'Snacks': '🍿',
        'Sandwichs': '🥪',
        'Plats': '🍽️',
        'Desserts': '🍰',
        'Autre': '📦'
    };
    return emojiMap[category] || '📦';
}
