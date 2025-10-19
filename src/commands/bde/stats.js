import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { hasBDERole, formatPrice } from '../../utils/helpers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Voir les statistiques des ventes (BDE uniquement)'),

    async execute(interaction) {
        if (!hasBDERole(interaction.member)) {
            return interaction.reply({
                content: '❌ Cette commande est réservée au BDE.',
                ephemeral: true
            });
        }

        const db = interaction.client.db;

        try {
            const stats = await db.getStats();

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('📊 Statistiques UberTek')
                .addFields(
                    { name: '📦 Commandes terminées', value: stats.totalOrders.toString(), inline: true },
                    { name: '💰 Chiffre d\'affaires', value: formatPrice(stats.totalRevenue), inline: true },
                    { name: '📈 Moyenne par commande', value: formatPrice(stats.totalRevenue / (stats.totalOrders || 1)), inline: true }
                )
                .setTimestamp();

            if (stats.topProducts.length > 0) {
                const topProductsText = stats.topProducts
                    .map((p, i) => `${i + 1}. **${p.name}** - ${p.total_sales} ventes (${formatPrice(p.revenue)})`)
                    .join('\n');
                
                embed.addFields({
                    name: '🏆 Top 5 Produits',
                    value: topProductsText,
                    inline: false
                });
            }

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in stats command:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    },
};
