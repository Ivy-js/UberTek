import { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { formatPrice } from '../utils/helpers.js';
import { notifyOrderTaken, notifyOrderInDelivery, notifyOrderDelivered, notifyOrderDelayed } from '../utils/notifications.js';

export async function handleBDEAction(interaction) {
    const orderNumber = interaction.customId.split('_')[2];
    const action = interaction.values[0];
    const db = interaction.client.db;

    try {
        const order = await db.getOrder(orderNumber);

        if (!order) {
            return interaction.reply({
                content: '❌ Commande introuvable.',
                ephemeral: true
            });
        }

        if (action === 'contact') {
            const guild = interaction.guild;
            const channelName = `cmd-${orderNumber.toLowerCase()}`;

            const existing = guild.channels.cache.find(ch => ch.name === channelName);
            if (existing) {
                return interaction.reply({
                    content: `✅ Salon déjà créé: <#${existing.id}>`,
                    ephemeral: true
                });
            }

            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: order.user_id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    {
                        id: process.env.BDE_ROLE_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    }
                ],
            });

            await db.setOrderChannel(orderNumber, channel.id);

            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(`📦 Commande ${orderNumber}`)
                .setDescription('Salon privé créé pour cette commande.')
                .addFields(
                    { name: '👤 Client', value: `<@${order.user_id}>`, inline: true },
                    { name: '🚴 Livreur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '💰 Total', value: formatPrice(order.total_price), inline: true },
                    { name: '🕐 Heure', value: order.delivery_time, inline: true },
                    { name: '📍 Salle', value: order.room, inline: true }
                )
                .addFields({
                    name: '🛒 Articles',
                    value: items.map(item => `• ${item.name} x${item.quantity}`).join('\n')
                });

            await channel.send({
                content: `<@${order.user_id}> <@${interaction.user.id}>`,
                embeds: [welcomeEmbed]
            });

            await interaction.reply({
                content: `✅ Salon créé: <#${channel.id}>`,
                ephemeral: true
            });
        }
        else if (action === 'take') {
            if (order.delivery_user_id) {
                return interaction.reply({
                    content: `❌ Cette commande est déjà prise en charge par <@${order.delivery_user_id}>`,
                    ephemeral: true
                });
            }

            await db.assignDelivery(orderNumber, interaction.user.id, interaction.user.tag);

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#00FF00')
                .addFields({
                    name: '🚴 Livreur assigné',
                    value: `<@${interaction.user.id}>`,
                    inline: false
                })
                .setFooter({ text: `${orderNumber} - Pris en charge par ${interaction.user.tag}` });

            const statusButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`status_delivery_${orderNumber}`)
                    .setLabel('🚴 En livraison')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`status_delivered_${orderNumber}`)
                    .setLabel('🔵 Livrée')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [statusButtons]
            });

            await notifyOrderTaken(interaction.client, order, interaction.user);

            await interaction.reply({
                content: '✅ Commande prise en charge !',
                ephemeral: true
            });
        }
        else if (action === 'delay') {
            await db.updateOrderStatus(orderNumber, 'delayed');

            const delayEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#FFCC00')
                .addFields({
                    name: '⏳ Statut',
                    value: 'Commande retardée',
                    inline: false
                });

            await interaction.message.edit({ embeds: [delayEmbed] });

            await notifyOrderDelayed(interaction.client, order);

            await interaction.reply({
                content: '✅ Commande marquée en retard.',
                ephemeral: true
            });
        }

    } catch (error) {
        console.error('Error handling BDE action:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        });
    }
}

export async function handleStatusUpdate(interaction) {
    const [, status, orderNumber] = interaction.customId.split('_');
    const db = interaction.client.db;

    try {
        const order = await db.getOrder(orderNumber);

        if (!order) {
            return interaction.reply({
                content: '❌ Commande introuvable.',
                ephemeral: true
            });
        }

        await db.updateOrderStatus(orderNumber, status);

        const statusText = status === 'delivery' ? 'en livraison' : 'livrée';
        const statusEmoji = status === 'delivery' ? '🚴' : '🔵';

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(status === 'delivery' ? '#0099FF' : '#0066FF')
            .addFields({
                name: `${statusEmoji} État`,
                value: `Commande ${statusText}`,
                inline: false
            });

        if (status === 'delivered') {
            const confirmButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`received_order_${orderNumber}`)
                    .setLabel('✅ J\'ai reçu ma commande')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: [confirmButton]
            });

            await notifyOrderDelivered(interaction.client, order);
        } else {
            await interaction.message.edit({ embeds: [updatedEmbed] });

            await notifyOrderInDelivery(interaction.client, order);
        }

        await interaction.reply({
            content: `✅ Statut mis à jour: ${statusText}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error updating status:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue.',
            ephemeral: true
        });
    }
}
