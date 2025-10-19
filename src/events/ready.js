export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Bot logged in as ${client.user.tag}`);
        console.log(`🏢 Serving ${client.guilds.cache.size} server(s)`);
        console.log(`👥 Total users: ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}`);
        
        client.user.setPresence({
            activities: [{ name: '/commander pour passer commande ! 🍔', type: 0 }],
            status: 'online',
        });
    },
};
