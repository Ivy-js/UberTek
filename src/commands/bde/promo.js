import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { hasBDERole } from '../../utils/helpers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('promo')
        .setDescription('Gérer les promotions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Créer une nouvelle promotion')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom de la promotion')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('condition')
                        .setDescription('Condition (ex: 2 Red Bull)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reward')
                        .setDescription('Récompense (ex: -50% sur le 3ème)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('debut')
                        .setDescription('Date de début (format: YYYY-MM-DD HH:MM)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('fin')
                        .setDescription('Date de fin (format: YYYY-MM-DD HH:MM)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lister toutes les promotions'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activer/désactiver une promotion')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID de la promotion')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('actif')
                        .setDescription('Activer ou désactiver')
                        .setRequired(true))),

    async execute(interaction) {
        if (!hasBDERole(interaction.member)) {
            return interaction.reply({
                content: '❌ Seuls les membres du BDE peuvent gérer les promotions.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const db = interaction.client.db;

        try {
            if (subcommand === 'add') {
                const name = interaction.options.getString('nom');
                const condition = interaction.options.getString('condition');
                const reward = interaction.options.getString('reward');
                const startDateStr = interaction.options.getString('debut');
                const endDateStr = interaction.options.getString('fin');

                const startDate = startDateStr ? new Date(startDateStr) : null;
                const endDate = endDateStr ? new Date(endDateStr) : null;

                if (startDate && isNaN(startDate.getTime())) {
                    return interaction.reply({
                        content: '❌ Format de date de début invalide. Utilisez: YYYY-MM-DD HH:MM',
                        ephemeral: true
                    });
                }
                if (endDate && isNaN(endDate.getTime())) {
                    return interaction.reply({
                        content: '❌ Format de date de fin invalide. Utilisez: YYYY-MM-DD HH:MM',
                        ephemeral: true
                    });
                }

                const promoData = {
                    name,
                    triggerEvent: null,
                    conditionText: condition,
                    conditionData: { text: condition },
                    rewardText: reward,
                    rewardData: { text: reward },
                    startDate,
                    endDate
                };

                const promo = await db.addPromotion(promoData);

                await interaction.reply({
                    content: 
                        `✅ Promotion **${name}** créée avec succès !\n\n` +
                        `🎯 Condition: ${condition}\n` +
                        `🎁 Récompense: ${reward}\n` +
                        `📅 Période: ${startDate ? startDate.toLocaleDateString('fr-FR') : 'Immédiat'} - ${endDate ? endDate.toLocaleDateString('fr-FR') : 'Sans limite'}\n` +
                        `🆔 ID: ${promo.id}`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'list') {
                const promos = await db.getAllPromotions();

                if (promos.length === 0) {
                    return interaction.reply({
                        content: '📭 Aucune promotion configurée.',
                        ephemeral: true
                    });
                }

                let message = '🎁 **Liste des promotions**\n\n';

                promos.forEach(promo => {
                    const status = promo.active ? '✅ Active' : '❌ Inactive';
                    const dates = `${promo.start_date ? new Date(promo.start_date).toLocaleDateString('fr-FR') : '∞'} - ${promo.end_date ? new Date(promo.end_date).toLocaleDateString('fr-FR') : '∞'}`;
                    
                    message += 
                        `**[${promo.id}] ${promo.name}** ${status}\n` +
                        `├ 🎯 ${promo.condition_text}\n` +
                        `├ 🎁 ${promo.reward_text}\n` +
                        `├ 📅 ${dates}\n` +
                        `└ 📊 Utilisée ${promo.times_used} fois\n\n`;
                });

                await interaction.reply({
                    content: message,
                    ephemeral: true
                });
            }
            else if (subcommand === 'toggle') {
                const id = interaction.options.getInteger('id');
                const active = interaction.options.getBoolean('actif');

                const promo = await db.togglePromotion(id, active);

                if (!promo) {
                    return interaction.reply({
                        content: '❌ Promotion introuvable.',
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: `✅ Promotion **${promo.name}** ${active ? 'activée' : 'désactivée'}.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in promo command:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la gestion de la promotion.',
                ephemeral: true
            });
        }
    },
};
