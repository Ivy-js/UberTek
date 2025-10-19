import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatPrice } from '../utils/helpers.js';

export async function sendNotification(client, userId, notification) {
    try {
        const user = await client.users.fetch(userId);
        
        const embed = new EmbedBuilder()
            .setColor(notification.color || '#0099FF')
            .setTitle(notification.title)
            .setDescription(notification.description)
            .setTimestamp();

        if (notification.fields) {
            embed.addFields(notification.fields);
        }

        if (notification.footer) {
            embed.setFooter({ text: notification.footer });
        }

        if (notification.thumbnail) {
            embed.setThumbnail(notification.thumbnail);
        }

        const messageOptions = { embeds: [embed] };

        if (notification.components) {
            messageOptions.components = notification.components;
        }

        await user.send(messageOptions);
        console.log(`📲 Notification envoyée à ${user.tag}`);
        return true;
    } catch (error) {
        console.error(`❌ Erreur lors de l'envoi de notification à ${userId}:`, error.message);
        return false;
    }
}

export async function notifyOrderTaken(client, order, deliveryUser) {
    return await sendNotification(client, order.user_id, {
        color: '#00FF00',
        title: '🟢 Commande prise en charge',
        description: 
            `Votre commande **${order.order_number}** a été prise en charge par le BDE !\n\n` +
            `🚴 **Livreur:** ${deliveryUser.tag}\n` +
            `💰 **Total:** ${formatPrice(order.total_price)}\n\n` +
            `Vous serez notifié lors de la livraison.`,
        footer: `Commande ${order.order_number}`,
        thumbnail: '✅'
    });
}

export async function notifyOrderInPreparation(client, order) {
    return await sendNotification(client, order.user_id, {
        color: '#FFA500',
        title: '🍳 Commande en préparation',
        description: 
            `Votre commande **${order.order_number}** est en cours de préparation.\n\n` +
            `⏰ Heure prévue: ${order.delivery_time}\n` +
            `📍 Livraison en: ${order.room}`,
        footer: `Commande ${order.order_number}`
    });
}

export async function notifyOrderInDelivery(client, order) {
    return await sendNotification(client, order.user_id, {
        color: '#0099FF',
        title: '🚴 Commande en livraison',
        description: 
            `Votre commande **${order.order_number}** est en route !\n\n` +
            `📍 Destination: ${order.room}\n` +
            `🚴 Livreur: ${order.delivery_user_tag}\n\n` +
            `Elle arrive bientôt ! 🎉`,
        footer: `Commande ${order.order_number}`
    });
}

export async function notifyOrderDelivered(client, order) {
    const confirmButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`received_order_${order.order_number}`)
            .setLabel('✅ J\'ai reçu ma commande')
            .setStyle(ButtonStyle.Success)
    );

    return await sendNotification(client, order.user_id, {
        color: '#0066FF',
        title: '🔵 Commande livrée',
        description: 
            `Votre commande **${order.order_number}** a été livrée !\n\n` +
            `Bon appétit ! 🍔\n\n` +
            `Merci de confirmer la réception en cliquant sur le bouton ci-dessous.`,
        footer: `Commande ${order.order_number}`,
        components: [confirmButton]
    });
}

export async function notifyOrderDelayed(client, order, reason) {
    return await sendNotification(client, order.user_id, {
        color: '#FFCC00',
        title: '⏳ Commande retardée',
        description: 
            `Votre commande **${order.order_number}** prend un peu de retard.\n\n` +
            (reason ? `**Raison:** ${reason}\n\n` : '') +
            `Le BDE vous tiendra informé. Merci de votre patience ! 🙏`,
        footer: `Commande ${order.order_number}`
    });
}

export async function notifyOrderCancelled(client, order, reason) {
    return await sendNotification(client, order.user_id, {
        color: '#FF0000',
        title: '❌ Commande annulée',
        description: 
            `Votre commande **${order.order_number}** a été annulée.\n\n` +
            (reason ? `**Raison:** ${reason}\n\n` : '') +
            `Si vous avez des questions, contactez le BDE.`,
        footer: `Commande ${order.order_number}`
    });
}

export async function notifyMessageFromDelivery(client, userId, orderNumber, message, deliveryUser) {
    return await sendNotification(client, userId, {
        color: '#9B59B6',
        title: '💬 Message du livreur',
        description: 
            `**Commande ${orderNumber}**\n\n` +
            `**${deliveryUser.tag}:** ${message}`,
        footer: `Commande ${orderNumber}`
    });
}

export async function notifyBDENewOrder(client, guildId, order) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const bdeRole = await guild.roles.fetch(process.env.BDE_ROLE_ID);
        
        if (!bdeRole) {
            console.error('❌ Rôle BDE introuvable');
            return false;
        }

        const members = await guild.members.fetch();
        const bdeMembers = members.filter(member => member.roles.cache.has(bdeRole.id));

        let notificationsSent = 0;
        for (const [, member] of bdeMembers) {
            const sent = await sendNotification(client, member.id, {
                color: '#FFA500',
                title: '🔔 Nouvelle commande !',
                description: 
                    `Une nouvelle commande vient d'arriver !\n\n` +
                    `📦 **Numéro:** ${order.order_number}\n` +
                    `👤 **Client:** ${order.user_tag}\n` +
                    `💰 **Total:** ${formatPrice(order.total_price)}\n` +
                    `🕐 **Heure:** ${order.delivery_time}\n` +
                    `📍 **Salle:** ${order.room}\n\n` +
                    `Consultez le salon <#${process.env.ORDERS_CHANNEL_ID}> pour plus de détails.`,
                footer: `Commande ${order.order_number}`
            });

            if (sent) notificationsSent++;
        }

        console.log(`📲 Notifications envoyées à ${notificationsSent} membre(s) du BDE`);
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi des notifications BDE:', error);
        return false;
    }
}

export async function notifyPromoApplied(client, userId, orderNumber, promoName, discount) {
    return await sendNotification(client, userId, {
        color: '#FFD700',
        title: '🎁 Promotion appliquée !',
        description: 
            `Bonne nouvelle ! La promotion **${promoName}** a été appliquée à votre commande **${orderNumber}** !\n\n` +
            `💰 **Économie:** ${formatPrice(discount)}\n\n` +
            `Profitez-en ! 🎉`,
        footer: `Commande ${orderNumber}`
    });
}
