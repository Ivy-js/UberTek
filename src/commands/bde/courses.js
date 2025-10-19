import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { hasBDERole, getOrderStatusEmoji, getOrderStatusText, formatPrice } from '../../utils/helpers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('courses')
        .setDescription('Voir toutes les commandes non prises (BDE uniquement)'),

    async execute(interaction) {
        if (!hasBDERole(interaction.member)) {
            return interaction.reply({
                content: '❌ Cette commande est réservée au BDE.',
                ephemeral: true
            });
        }

        const db = interaction.client.db;

        try {
            const orders = await db.getPendingOrders();

            if (orders.length === 0) {
                return interaction.reply({
                    content: '✅ Aucune commande en attente !',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('📋 Commandes en attente')
                .setDescription(`Il y a **${orders.length}** commande(s) en attente de prise en charge.\n\n`)
                .setTimestamp();

            orders.forEach(order => {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                const itemsText = items.map(i => `${i.name} x${i.quantity}`).join(', ');
                
                embed.addFields({
                    name: `${getOrderStatusEmoji(order.status)} ${order.order_number}`,
                    value: 
                        `👤 Client: <@${order.user_id}>\n` +
                        `🛒 ${itemsText}\n` +
                        `💰 Total: ${formatPrice(order.total_price)}\n` +
                        `🕐 Heure: ${order.delivery_time || 'Non spécifiée'}\n` +
                        `📍 Salle: ${order.room || 'Non spécifiée'}\n` +
                        `⏰ Passée: ${new Date(order.created_at).toLocaleTimeString('fr-FR')}`,
                    inline: false
                });
            });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in courses command:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    },
};
