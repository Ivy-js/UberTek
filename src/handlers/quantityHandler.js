import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export async function handleQuantityChange(interaction, change) {
    const userId = interaction.customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette action ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    const itemIndex = cart.selectedItemIndex;
    const item = cart.items[itemIndex];

    if (!item) {
        return interaction.reply({
            content: '❌ Article introuvable.',
            ephemeral: true
        });
    }

    item.quantity += change;

    if (item.quantity <= 0) {
        cart.items.splice(itemIndex, 1);
        delete cart.selectedItemIndex;
        
        const { showCartWithControls } = await import('./orderHandler.js');
        
        await interaction.reply({
            content: `✅ ${item.name} retiré du panier.`,
            ephemeral: true
        });
        
        await showCartWithControls(interaction, userId);
        return;
    }

    interaction.client.userCarts.set(userId, cart);

    await updateQuantityDisplay(interaction, userId, item);
}

export async function handleCustomQuantity(interaction) {
    const userId = interaction.customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette action ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    const item = cart.items[cart.selectedItemIndex];

    const modal = new ModalBuilder()
        .setCustomId(`qty_modal_${userId}`)
        .setTitle('Quantité personnalisée');

    const quantityInput = new TextInputBuilder()
        .setCustomId('quantity_input')
        .setLabel(`Quantité pour ${item.name}`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Entrez un nombre')
        .setValue(String(item.quantity))
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);

    const row = new ActionRowBuilder().addComponents(quantityInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

export async function handleQuantityModal(interaction) {
    const userId = interaction.customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette action ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    const itemIndex = cart.selectedItemIndex;
    const item = cart.items[itemIndex];

    const quantityStr = interaction.fields.getTextInputValue('quantity_input');
    const quantity = parseInt(quantityStr);

    if (isNaN(quantity) || quantity < 0) {
        return interaction.reply({
            content: '❌ Quantité invalide. Veuillez entrer un nombre positif.',
            ephemeral: true
        });
    }

    if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
        delete cart.selectedItemIndex;
        interaction.client.userCarts.set(userId, cart);

        await interaction.reply({
            content: `✅ ${item.name} retiré du panier.`,
            ephemeral: true
        });

        const { showCartWithControls } = await import('./orderHandler.js');
        await showCartWithControls(interaction, userId);
        return;
    }

    item.quantity = quantity;
    interaction.client.userCarts.set(userId, cart);

    await interaction.reply({
        content: `✅ Quantité mise à jour: ${item.name} x${quantity}`,
        ephemeral: true
    });

    await updateQuantityDisplay(interaction, userId, item);
}

export async function handleRemoveItem(interaction) {
    const userId = interaction.customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette action ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    const itemIndex = cart.selectedItemIndex;
    const item = cart.items[itemIndex];

    cart.items.splice(itemIndex, 1);
    delete cart.selectedItemIndex;
    interaction.client.userCarts.set(userId, cart);

    await interaction.reply({
        content: `✅ ${item.name} retiré du panier.`,
        ephemeral: true
    });

    const { showCartWithControls } = await import('./orderHandler.js');
    await showCartWithControls(interaction, userId);
}

export async function handleBackToCart(interaction) {
    const userId = interaction.customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Cette action ne vous appartient pas.',
            ephemeral: true
        });
    }

    const cart = interaction.client.userCarts.get(userId);
    delete cart.selectedItemIndex;
    interaction.client.userCarts.set(userId, cart);

    const { showCartWithControls } = await import('./orderHandler.js');
    await showCartWithControls(interaction, userId);
}

async function updateQuantityDisplay(interaction, userId, item) {
    const { formatPrice } = await import('../utils/helpers.js');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📊 Modifier la quantité')
        .setDescription(
            `**Article:** ${item.name}\n` +
            `**Prix unitaire:** ${formatPrice(item.price)}\n` +
            `**Quantité actuelle:** ${item.quantity}\n` +
            `**Total:** ${formatPrice(item.price * item.quantity)}`
        );

    const quantityButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`qty_minus_1_${userId}`)
            .setLabel('-1')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➖'),
        new ButtonBuilder()
            .setCustomId(`qty_plus_1_${userId}`)
            .setLabel('+1')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➕'),
        new ButtonBuilder()
            .setCustomId(`qty_minus_5_${userId}`)
            .setLabel('-5')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`qty_plus_5_${userId}`)
            .setLabel('+5')
            .setStyle(ButtonStyle.Secondary)
    );

    const moreActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`qty_custom_${userId}`)
            .setLabel('📝 Quantité personnalisée')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`qty_remove_${userId}`)
            .setLabel('🗑️ Retirer l\'article')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`qty_back_${userId}`)
            .setLabel('↩️ Retour')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.message.edit({
        embeds: [embed],
        components: [quantityButtons, moreActions]
    });
}
