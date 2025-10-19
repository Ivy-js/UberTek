import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getOrderStatusEmoji, getOrderStatusText, formatPrice } from '../../utils/helpers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('delivery')
        .setDescription('Suivre l\'état de votre commande')
        .addStringOption(option =>
            option.setName('numero')
                .setDescription('Numéro de commande (ex: UT-XXX)')
                .setRequired(false)),

    async execute(interaction) {
        const db = interaction.client.db;
        const orderNumber = interaction.options.getString('numero');

        try {
            let order;

            if (orderNumber) {
                order = await db.getOrder(orderNumber);
                
                if (!order) {
                    return interaction.reply({
                        content: '❌ Commande introuvable.',
                        ephemeral: true
                    });
                }

                if (order.user_id !== interaction.user.id && !hasBDERole(interaction.member)) {
                    return interaction.reply({
                        content: '❌ Cette commande ne vous appartient pas.',
                        ephemeral: true
                    });
                }
            } else {
                const orders = await db.getUserOrders(interaction.user.id);
                
                if (orders.length === 0) {
                    return interaction.reply({
                        content: '❌ Vous n\'avez aucune commande en cours.',
                        ephemeral: true
                    });
                }

                order = orders[0];
            }

            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            const embed = new EmbedBuilder()
                .setColor(getStatusColor(order.status))
                .setTitle(`${getOrderStatusEmoji(order.status)} Commande ${order.order_number}`)
                .addFields(
                    { name: '📦 État', value: getOrderStatusText(order.status), inline: true },
                    { name: '💰 Total', value: formatPrice(order.total_price), inline: true },
                    { name: '🕐 Heure souhaitée', value: order.delivery_time || 'Non spécifiée', inline: true }
                );

            const itemsList = items.map(item => 
                `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
            ).join('\n');
            embed.addFields({ name: '🛒 Articles', value: itemsList });

            if (order.delivery_user_tag) {
                embed.addFields({
                    name: '🚴 Livreur',
                    value: order.delivery_user_tag,
                    inline: true
                });
            }

            if (order.room) {
                embed.addFields({
                    name: '📍 Salle',
                    value: order.room,
                    inline: true
                });
            }

            if (order.notes) {
                embed.addFields({ name: '📝 Notes', value: order.notes });
            }

            if (order.promo_applied) {
                embed.addFields({
                    name: '🎁 Promotion appliquée',
                    value: `${order.promo_applied} (-${formatPrice(order.discount_amount)})`,
                    inline: false
                });
            }

            embed.setFooter({ text: `Commande passée le ${new Date(order.created_at).toLocaleString('fr-FR')}` });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in delivery command:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    },
};

function getStatusColor(status) {
    const colorMap = {
        'pending': '#FFA500',
        'preparation': '#00FF00',
        'delivery': '#0099FF',
        'delivered': '#0066FF',
        'completed': '#00CC00',
        'cancelled': '#FF0000',
        'delayed': '#FFCC00'
    };
    return colorMap[status] || '#808080';
}

import { hasBDERole } from '../../utils/helpers.js';
