import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('commander')
        .setDescription('Passer une commande de nourriture ou boisson'),

    async execute(interaction) {
        const db = interaction.client.db;

        try {
            const allProducts = await db.getAllProducts();
            
            if (allProducts.length === 0) {
                return interaction.reply({
                    content: '❌ Le menu est vide pour le moment.\n' +
                             '💡 Le BDE doit d\'abord ajouter des articles avec `/product add`',
                    ephemeral: true
                });
            }

            const categories = await db.getAvailableCategories();

            if (categories.length === 0) {
                return interaction.reply({
                    content: '❌ Aucun produit disponible pour le moment.\n' +
                             '💡 Tous les articles sont en rupture de stock.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🍔 UberTek - Nouvelle Commande')
                .setDescription(
                    '**Bienvenue sur UberTek !**\n\n' +
                    'Sélectionnez une catégorie ci-dessous pour commencer votre commande.\n\n' +
                    '📋 Une fois vos articles choisis, vous pourrez valider votre commande.'
                )
                .setFooter({ text: 'BDE EPITECH Marseille' })
                .setTimestamp();

            const categoryOptions = categories.map(cat => ({
                label: cat,
                value: cat,
                emoji: getCategoryEmoji(cat)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`category_select_${interaction.user.id}`)
                .setPlaceholder('Choisir une catégorie')
                .addOptions(categoryOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            try {
                await interaction.user.send({
                    embeds: [embed],
                    components: [row]
                });

                if (!interaction.client.userCarts) {
                    interaction.client.userCarts = new Map();
                }
                interaction.client.userCarts.set(interaction.user.id, {
                    items: [],
                    lastInteraction: Date.now()
                });

                await interaction.reply({
                    content: '✅ Commande ouverte ! Consultez vos messages privés.',
                    ephemeral: true
                });
            } catch (error) {
                console.error('DM Error:', error);
                await interaction.reply({
                    content: '❌ Je ne peux pas vous envoyer de message privé. Vérifiez vos paramètres de confidentialité.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in commander command:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    },
};

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
