import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatPrice, generateOrderNumber, calculateTotal } from '../utils/helpers.js';
import { notifyBDENewOrder, notifyPromoApplied } from '../utils/notifications.js';

export async function handleValidateOrder(interaction) {
    const userId = interaction.user.id;
    const cart = interaction.client.userCarts.get(userId);

    if (!cart || cart.items.length === 0) {
        return interaction.reply({
            content: '❌ Votre panier est vide.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🕐 Heure de livraison')
        .setDescription('À quelle heure souhaitez-vous recevoir votre commande ?');

    const timeOptions = [
        { label: 'Dès que possible', value: 'ASAP' },
        { label: '12h00 - 12h30', value: '12h00-12h30' },
        { label: '12h30 - 13h00', value: '12h30-13h00' },
        { label: '13h00 - 13h30', value: '13h00-13h30' },
        { label: '13h30 - 14h00', value: '13h30-14h00' },
        { label: '14h00 - 14h30', value: '14h00-14h30' },
        { label: '14h30 - 15h00', value: '14h30-15h00' }
    ];

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`time_select_${userId}`)
        .setPlaceholder('Choisir un créneau')
        .addOptions(timeOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

export async function handleConfirmOrder(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    const db = interaction.client.db;

    if (!cart || cart.items.length === 0) {
        return interaction.reply({
            content: '❌ Votre panier est vide.',
            ephemeral: true
        });
    }

    try {
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
                    await db.incrementPromoUsage(promo.id);
                    break;
                }
            }
        }

        const finalTotal = total - discount;
        const orderNumber = generateOrderNumber();

        const orderData = {
            orderNumber,
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            items: cart.items,
            totalPrice: finalTotal,
            deliveryTime: cart.deliveryTime,
            room: cart.room,
            promoApplied: appliedPromo ? appliedPromo.name : null,
            discountAmount: discount
        };

        await db.createOrder(orderData);

        for (const item of cart.items) {
            await db.incrementProductSales(item.name, item.quantity);
        }

        const ordersChannel = await interaction.client.channels.fetch(process.env.ORDERS_CHANNEL_ID);
        
        const orderEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔔 Nouvelle Commande')
            .addFields(
                { name: '📦 Numéro', value: orderNumber, inline: true },
                { name: '👤 Client', value: `<@${interaction.user.id}>`, inline: true },
                { name: '💰 Total', value: formatPrice(finalTotal), inline: true },
                { name: '🕐 Heure souhaitée', value: cart.deliveryTime, inline: true },
                { name: '📍 Salle', value: cart.room, inline: true },
                { name: '⏰ Passée à', value: new Date().toLocaleTimeString('fr-FR'), inline: true }
            )
            .addFields({
                name: '🛒 Articles',
                value: cart.items.map(item => 
                    `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
                ).join('\n'),
                inline: false
            });

        if (appliedPromo) {
            orderEmbed.addFields({
                name: '🎁 Promotion appliquée',
                value: `${appliedPromo.name} (-${formatPrice(discount)})`,
                inline: false
            });
        }

        orderEmbed.setFooter({ text: `ID: ${orderNumber}` });
        orderEmbed.setTimestamp();

        const bdeActions = new StringSelectMenuBuilder()
            .setCustomId(`bde_action_${orderNumber}`)
            .setPlaceholder('Actions BDE')
            .addOptions([
                {
                    label: '📩 Entrer en contact',
                    value: 'contact',
                    description: 'Créer un salon privé avec le client'
                },
                {
                    label: '🏃 Prendre la commande',
                    value: 'take',
                    description: 'Assigner la commande à moi'
                },
                {
                    label: '⏳ Décaler la commande',
                    value: 'delay',
                    description: 'Marquer la commande en retard'
                }
            ]);

        const actionRow = new ActionRowBuilder().addComponents(bdeActions);

        await ordersChannel.send({
            content: `<@&${process.env.BDE_ROLE_ID}>`,
            embeds: [orderEmbed],
            components: [actionRow]
        });

        const confirmEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Commande confirmée !')
            .setDescription(
                `Votre commande **${orderNumber}** a été envoyée au BDE.\n\n` +
                `Vous serez notifié lorsqu'elle sera prise en charge.\n\n` +
                `Utilisez \`/delivery ${orderNumber}\` pour suivre votre commande.`
            )
            .addFields(
                { name: '💰 Total', value: formatPrice(finalTotal), inline: true },
                { name: '🕐 Heure', value: cart.deliveryTime, inline: true },
                { name: '📍 Salle', value: cart.room, inline: true }
            );

        await interaction.update({
            embeds: [confirmEmbed],
            components: []
        });

        await notifyBDENewOrder(interaction.client, interaction.guild.id, orderData);

        if (appliedPromo) {
            await notifyPromoApplied(interaction.client, userId, orderNumber, appliedPromo.name, discount);
        }

        interaction.client.userCarts.delete(userId);

    } catch (error) {
        console.error('Error confirming order:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de la confirmation de votre commande.',
            ephemeral: true
        });
    }
}

export async function handleReceivedOrder(interaction) {
    const orderNumber = interaction.customId.split('_')[2];
    const db = interaction.client.db;

    try {
        const order = await db.getOrder(orderNumber);

        if (!order) {
            return interaction.reply({
                content: '❌ Commande introuvable.',
                ephemeral: true
            });
        }

        if (order.user_id !== interaction.user.id) {
            return interaction.reply({
                content: '❌ Cette commande ne vous appartient pas.',
                ephemeral: true
            });
        }

        if (order.status === 'completed') {
            return interaction.reply({
                content: '✅ Cette commande est déjà marquée comme terminée.',
                ephemeral: true
            });
        }

        await db.completeOrder(orderNumber);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Commande terminée')
            .setDescription(`Merci d'avoir utilisé UberTek ! Commande ${orderNumber} finalisée.`);

        await interaction.update({
            embeds: [embed],
            components: []
        });

        const ordersChannel = await interaction.client.channels.fetch(process.env.ORDERS_CHANNEL_ID);
        await ordersChannel.send({
            content: `✅ Commande **${orderNumber}** finalisée par <@${interaction.user.id}>`
        });

    } catch (error) {
        console.error('Error handling received order:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        });
    }
}

export async function handleCancelOrder(interaction) {
    const userId = interaction.user.id;
    
    interaction.client.userCarts.delete(userId);

    await interaction.update({
        content: '❌ Commande annulée.',
        embeds: [],
        components: []
    });
}

export async function handleClearCart(interaction) {
    const userId = interaction.user.id;
    const cart = interaction.client.userCarts.get(userId);

    if (cart) {
        cart.items = [];
        interaction.client.userCarts.set(userId, cart);
    }

    await interaction.update({
        content: '🗑️ Panier vidé.',
        embeds: [],
        components: []
    });
}
