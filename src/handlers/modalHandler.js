import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export async function handleRoomModal(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const room = interaction.fields.getTextInputValue('room_input');
    const cart = interaction.client.userCarts.get(userId);
    
    cart.room = room;
    interaction.client.userCarts.set(userId, cart);

    await showFinalConfirmation(interaction, userId);
}

export async function handleRoomSelect(interaction) {
    const userId = interaction.customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette commande ne vous appartient pas.',
            ephemeral: true
        });
    }

    const room = interaction.values[0];
    const cart = interaction.client.userCarts.get(userId);
    
    cart.room = room;
    interaction.client.userCarts.set(userId, cart);

    await showFinalConfirmation(interaction, userId);
}

async function showFinalConfirmation(interaction, userId) {
    const cart = interaction.client.userCarts.get(userId);
    const db = interaction.client.db;

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
        .setTitle('🧾 Récapitulatif de commande')
        .setDescription('Vérifiez les informations avant de confirmer.')
        .addFields(
            { name: '🛒 Articles', value: cart.items.map(item => `• ${item.name} x${item.quantity}`).join('\n') },
            { name: '🕐 Heure', value: cart.deliveryTime, inline: true },
            { name: '📍 Salle', value: cart.room, inline: true }
        );

    if (appliedPromo) {
        embed.addFields(
            { name: '💰 Sous-total', value: `${total.toFixed(2)}€`, inline: true },
            { name: '🎁 Promotion', value: appliedPromo.name, inline: true },
            { name: '📉 Réduction', value: `-${discount.toFixed(2)}€`, inline: true }
        );
    }

    embed.addFields({ name: '💵 Total à payer', value: `**${finalTotal.toFixed(2)}€**`, inline: false });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm_order_${userId}`)
            .setLabel('🧾 Confirmer la commande')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('cancel_order')
            .setLabel('❌ Annuler')
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
        embeds: [embed],
        components: [buttons]
    });
}
