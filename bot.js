/* Discord */
const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
global.client = new Client({ intents: ['GUILDS', 'GUILD_WEBHOOKS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'] });
config = require("./config.json");

/* Setup */
client.on("ready", () => {
    // on bot ready
    registerCommands();
});


function isGameMaster(member) {
    if(!member) return false;
    return member && member.roles && member.roles.cache.get("584767449078169601");
}

function log(txt1, txt2 = "", txt3 = "", txt4 = "", txt5 = "") {
    let txt = txt1 + " " + txt2 + " " + txt3 + " " + txt4 + " " + txt5;
    console.log(txt);
    /**let guild = client.guilds.cache.get("584765921332297775");
    let channel;
    if(guild) channel = guild.channels.cache.get("1047920491089895565")
    if(channel) channel.send(txt);**/
}

/* New Slash Command */
client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return; // ignore non-slash commands
    switch(interaction.commandName) {
        case "ping":
            // Send pinging message
            interaction.reply({ content: "✳ Ping", fetchReply: true, ephemeral: true })
            .then(m => {
                // Get values
                let latency = m.createdTimestamp - interaction.createdTimestamp;
                let ping = Math.round(client.ws.ping);
                interaction.editReply("✅ Pong! Latency is " + latency + "ms. API Latency is " + ping + "ms");
            })
        break;
    }
})

/* Register Slash Commands */
function registerCommands() {
    /**client.application?.commands.create({
        name: 'ping',
        description: 'Gives the ping of the bot, and checks if the bot is running.'
    });**/
}


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

/* 
	LOGIN
*/
client.login(config.token);
