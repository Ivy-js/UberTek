import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { hasBDERole } from '../../utils/helpers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('product')
        .setDescription('Gérer les produits du menu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un produit au menu')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom du produit')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('prix')
                        .setDescription('Prix du produit en euros')
                        .setRequired(true)
                        .setMinValue(0.01))
                .addStringOption(option =>
                    option.setName('categorie')
                        .setDescription('Catégorie du produit')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Boissons', value: 'Boissons' },
                            { name: 'Snacks', value: 'Snacks' },
                            { name: 'Sandwichs', value: 'Sandwichs' },
                            { name: 'Plats', value: 'Plats' },
                            { name: 'Desserts', value: 'Desserts' },
                            { name: 'Autre', value: 'Autre' }
                        ))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('URL de l\'image du produit')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Modifier le prix d\'un produit')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom du produit à modifier')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(option =>
                    option.setName('prix')
                        .setDescription('Nouveau prix en euros')
                        .setRequired(true)
                        .setMinValue(0.01)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stock')
                .setDescription('Gérer la disponibilité d\'un produit')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom du produit')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('etat')
                        .setDescription('État de disponibilité')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Disponible', value: 'on' },
                            { name: 'En rupture', value: 'off' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Afficher tous les produits')),

    async execute(interaction) {
        if (!hasBDERole(interaction.member)) {
            return interaction.reply({
                content: '❌ Seuls les membres du BDE peuvent gérer les produits.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const db = interaction.client.db;

        try {
            if (subcommand === 'add') {
                const name = interaction.options.getString('nom');
                const price = interaction.options.getNumber('prix');
                const category = interaction.options.getString('categorie');
                const image = interaction.options.getString('image') || null;

                await db.addProduct(name, category, price, image);

                await interaction.reply({
                    content: `✅ Produit **${name}** ajouté avec succès !\n` +
                             `📦 Catégorie: ${category}\n` +
                             `💰 Prix: ${price.toFixed(2)}€`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'edit') {
                const name = interaction.options.getString('nom');
                const price = interaction.options.getNumber('prix');

                const product = await db.updateProduct(name, price);

                if (!product) {
                    return interaction.reply({
                        content: `❌ Produit "${name}" introuvable.`,
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: `✅ Prix du produit **${name}** mis à jour : ${price.toFixed(2)}€`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'stock') {
                const name = interaction.options.getString('nom');
                const state = interaction.options.getString('etat');
                const available = state === 'on';

                const product = await db.setProductAvailability(name, available);

                if (!product) {
                    return interaction.reply({
                        content: `❌ Produit "${name}" introuvable.`,
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: `✅ Produit **${name}** ${available ? 'remis en stock' : 'marqué en rupture'}`,
                    ephemeral: true
                });
            }
            else if (subcommand === 'list') {
                const products = await db.getAllProducts();

                if (products.length === 0) {
                    return interaction.reply({
                        content: '📭 Aucun produit dans la base de données.',
                        ephemeral: true
                    });
                }

                const grouped = {};
                products.forEach(product => {
                    if (!grouped[product.category]) {
                        grouped[product.category] = [];
                    }
                    grouped[product.category].push(product);
                });

                let message = '📋 **Liste des produits**\n\n';
                
                for (const [category, items] of Object.entries(grouped)) {
                    message += `**${category}:**\n`;
                    items.forEach(item => {
                        const status = item.available ? '✅' : '❌';
                        const price = parseFloat(item.price);
                        message += `${status} ${item.name} - ${price.toFixed(2)}€ (${item.total_sales} ventes)\n`;
                    });
                    message += '\n';
                }

                await interaction.reply({
                    content: message,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in product command:', error);
            
            if (error.code === '23505') {
                return interaction.reply({
                    content: '❌ Ce produit existe déjà.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la gestion du produit.',
                ephemeral: true
            });
        }
    },

    async autocomplete(interaction) {
        const db = interaction.client.db;
        const focusedValue = interaction.options.getFocused();
        
        try {
            const products = await db.getAllProducts();
            const filtered = products
                .filter(product => product.name.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25)
                .map(product => ({
                    name: `${product.name} (${product.price.toFixed(2)}€)`,
                    value: product.name
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    }
};
