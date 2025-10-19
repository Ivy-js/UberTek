export default {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Command ${interaction.commandName} not found`);
                return;
            }

            try {
                if (command.autocomplete) {
                    await command.autocomplete(interaction);
                }
            } catch (error) {
                console.error('Error in autocomplete:', error);
            }
            return;
        }
        
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Command ${interaction.commandName} not found`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                const errorMessage = { content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        else if (interaction.isStringSelectMenu()) {
            try {
                const customId = interaction.customId;
                
                if (customId.startsWith('category_select_')) {
                    await handleCategorySelect(interaction);
                } else if (customId.startsWith('product_select_')) {
                    await handleProductSelect(interaction);
                } else if (customId.startsWith('time_select_')) {
                    await handleTimeSelect(interaction);
                } else if (customId.startsWith('room_select_')) {
                    await handleRoomSelect(interaction);
                } else if (customId.startsWith('bde_action_')) {
                    await handleBDEAction(interaction);
                } else if (customId.startsWith('manage_item_')) {
                    await handleManageItem(interaction);
                }
            } catch (error) {
                console.error('Error handling select menu:', error);
                await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
            }
        }
        
        else if (interaction.isButton()) {
            try {
                const customId = interaction.customId;
                
                if (customId === 'validate_order') {
                    await handleValidateOrder(interaction);
                } else if (customId.startsWith('confirm_order_')) {
                    await handleConfirmOrder(interaction);
                } else if (customId.startsWith('received_order_')) {
                    await handleReceivedOrder(interaction);
                } else if (customId === 'cancel_order') {
                    await handleCancelOrder(interaction);
                } else if (customId === 'clear_cart') {
                    await handleClearCart(interaction);
                } else if (customId.startsWith('status_')) {
                    await handleStatusUpdate(interaction);
                } else if (customId.startsWith('qty_plus_1_')) {
                    await handleQuantityChange(interaction, 1);
                } else if (customId.startsWith('qty_minus_1_')) {
                    await handleQuantityChange(interaction, -1);
                } else if (customId.startsWith('qty_plus_5_')) {
                    await handleQuantityChange(interaction, 5);
                } else if (customId.startsWith('qty_minus_5_')) {
                    await handleQuantityChange(interaction, -5);
                } else if (customId.startsWith('qty_custom_')) {
                    await handleCustomQuantity(interaction);
                } else if (customId.startsWith('qty_remove_')) {
                    await handleRemoveItem(interaction);
                } else if (customId.startsWith('qty_back_')) {
                    await handleBackToCart(interaction);
                }
            } catch (error) {
                console.error('Error handling button:', error);
                await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
            }
        }
        
        else if (interaction.isModalSubmit()) {
            try {
                if (interaction.customId.startsWith('room_modal_')) {
                    await handleRoomModal(interaction);
                } else if (interaction.customId.startsWith('qty_modal_')) {
                    await handleQuantityModal(interaction);
                }
            } catch (error) {
                console.error('Error handling modal:', error);
                await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
            }
        }
    },
};

import { handleCategorySelect, handleProductSelect, handleTimeSelect, handleManageItem } from '../handlers/orderHandler.js';
import { handleBDEAction, handleStatusUpdate } from '../handlers/bdeHandler.js';
import { handleValidateOrder, handleConfirmOrder, handleReceivedOrder, handleCancelOrder, handleClearCart } from '../handlers/buttonHandler.js';
import { handleRoomModal, handleRoomSelect } from '../handlers/modalHandler.js';
import { handleQuantityChange, handleCustomQuantity, handleQuantityModal, handleRemoveItem, handleBackToCart } from '../handlers/quantityHandler.js';
