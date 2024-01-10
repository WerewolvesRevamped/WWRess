/* Discord */
const { Client, Intents, ApplicationCommandOptionType, Options, GatewayIntentBits } = require('discord.js');
global.client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions],
    sweepers: {
		...Options.DefaultSweeperSettings,
		messages: {
			interval: 900, // Every 15 minutes...
			lifetime: 900,	// Remove messages older than 15 minutes.
		},
	}
});

config = require("./config.json");

/**
This really should be changed to use modules once I've made more progress on the split
**/
var fs = require('fs');
// file is included here:
eval(fs.readFileSync('ai.js')+'');
eval(fs.readFileSync('game.js')+'');
eval(fs.readFileSync('cloning.js')+'');

/* Setup */
client.on("ready", () => {
    // on bot ready
    registerCommands();
});

/** GLOBAL VARIABLES **/
var games = [];
var gamesHistory = [];
var gamesInterfaces = [];
var players = [];
var outstandingChallenge = [];

/**
sendMessage
Sends a <message> to interfaces of the game with <gameid>
*/
function sendMessage(gameid, message) {
    let guild = client.guilds.cache.get(gamesInterfaces[gameid].guild);
    let channel = guild.channels.cache.get(gamesInterfaces[gameid].channel);
    channel.send(message);
}

/**
updateSpectatorBoard
Updates the spectator (public) board for a certain game
**/
function updateSpectatorBoard(gameid) {
    if(gamesInterfaces[gameid].spectator.type == "discord") {
        let msgSpec = displayBoard(games[gameid], "Spectator Board", [], -1);
        msgSpec.ephemeral = false;
        gamesInterfaces[gameid].spectator.msg.edit(msgSpec);
    }
}

/**
requireAction
Requires a player interaction
**/
function requireAction(game, actionType, metadata, interaction) {
    switch(actionType) {
        case "promote_white": {
            let kings = ["Hooker","Idiot","Crowd Seeker","Aura Teller"];
            let knights = ["Royal Knight","Amnesiac"];
            let rooks = ["Fortune Teller","Runner","Witch"];
            if(metadata.piece.name == "White Pawn") {
                kings = ["White King"];
                knights = ["White Knight"];
                rooks = ["White Rook"];
            }
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 0), style: 1, custom_id: "promote-"+metadata.to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 0), style: 1, custom_id: "promote-"+metadata.to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 0), style: 1, custom_id: "promote-"+metadata.to+"-" + promoteRook });
            interaction.editReply(displayBoard(game, "Promote " + metadata.to, [{ type: 1, components: components }] ));
        } break;
        case "promote_black": {
            let kings = ["Alpha Wolf","Psychic Wolf","Sneaking Wolf"];
            let knights = ["Direwolf","Clairvoyant Fox","Fox"];
            let rooks = ["Warlock","Scared Wolf","Saboteur Wolf"];
            if(metadata.piece.name == "Black Pawn") {
                kings = ["Black King"];
                knights = ["Black Knight"];
                rooks = ["Black Rook"];
            }
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 1), style: 1, custom_id: "promote-"+metadata.to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 1), style: 1, custom_id: "promote-"+metadata.to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 1), style: 1, custom_id: "promote-"+metadata.to+"-" + promoteRook });
            interaction.editReply(displayBoard(game, "Promote " + metadata.to, [{ type: 1, components: components }] ));
        } break;
    }
}

/**
check if user is a Game Master
**/
function isGameMaster(member) {
    if(!member) return false;
    return member && member.roles && member.roles.cache.get("584767449078169601");
}

// log utility function
function log(txt1, txt2 = "", txt3 = "", txt4 = "", txt5 = "") {
    let txt = txt1 + " " + txt2 + " " + txt3 + " " + txt4 + " " + txt5;
    console.log(txt);
    /**let guild = client.guilds.cache.get("584765921332297775");
    let channel;
    if(guild) channel = guild.channels.cache.get("1047920491089895565")
    if(channel) channel.send(txt);**/
}




// check if player is playing
function isPlaying(id) {
    return players.map(el => el[0]).indexOf(id) != -1;
}

// check if player has an outstanding challenge
function isOutstanding(id) {
    return outstandingChallenge.map(el => el[0]).indexOf(id) != -1;
}

// get the id of the game the player is playing
function getPlayerGameId(id) {
    let ind = players.map(el => el[0]).indexOf(id);
    return players[ind][1];
}


function turnStart(interaction, gameid, turn, mode = "editreply", firstMessage = false) {
    // register message
    console.log("turnstart", mode, turn, interaction.message ? interaction.message.id : null);
    if(mode != "followup" && mode != "reply" && interaction.message && !firstMessage) gamesInterfaces[gameid].interfaces[turn] = { type: "discord", msg: interaction.message.id };
    // abilities
    let availableAbilities = showMoves(gameid, turn, true, "Select a Piece (ABILITY)");
    // show buttons?
    if(availableAbilities.components[0].components.length == 1) turnMove(interaction, gameid, turn, mode); // no
    else response(gameid, interaction, availableAbilities, mode); // yes
}

function turnStartNot(interaction, gameid, turn, mode = "editreply") {
    // register message
    console.log("turnstartnot", mode, turn, interaction.message ? interaction.message.id : null);
    if(mode != "followup" && mode != "reply"  && interaction.message) gamesInterfaces[gameid].interfaces[turn] = { type: "discord", msg: interaction.message.id };
    // waiting
    let board = renderBoard(games[gameid], "Waiting on Opponent");
    let noButtons = { content: board, ephemeral: true, fetchReply: true, components: [{ type: 1, components: [{ type: 2, label: "Start Game", style: 4, custom_id: "start" }] }] };
    response(gameid, interaction, noButtons, mode); // show Start Game Button
}

function turnMove(interaction, gameid, turn, mode = "editreply") {
    // register message
    console.log("turnmove", mode, turn, interaction.message ? interaction.message.id : null);
    if(mode != "followup" && mode != "reply"  && interaction.message) gamesInterfaces[gameid].interfaces[turn] = { type: "discord", msg: interaction.message.id };
    // update spec board
    updateSpectatorBoard(gameid)
    // show movable pieces
    let availableMoves = showMoves(gameid, turn, false, "Select a Piece (MOVE)");
    response(gameid, interaction, availableMoves, mode);
}

function response(gameid, interaction, resp, mode) {
    switch(mode) {
        case "reply":
            interaction.reply(resp).then(m => {
                gamesInterfaces[gameid].interfaces[games[gameid].turn] = { type: "discord", msg: m.id }; 
            });
        break;
        case "update":
            interaction.update(resp);
        break;
        case "followup":
            interaction.followUp(resp);  
        break;
        case "edit":
            interaction.edit(resp);  
        break;
        case "editreply":
	        interaction.editReply(resp);  
        break;
    }
}

/**
A Wrapper for movePiece, handling discord interactions
**/
function movePieceWrapper(interaction, moveCurGame, from, to, repl = null) {
    let result = movePiece(moveCurGame, from, to, repl);
    switch(result.action) {
        case "promote_white": {
            requireAction(moveCurGame, "promote_white", { piece: result.piece, to: result.to }, interaction);
        } break;
        case "promote_black": {
            requireAction(moveCurGame, "promote_black", { piece: result.piece, to: result.to }, interaction);
        } break;
        case "turn_done": {
            turnDoneWrapper(interaction, moveCurGame, "Waiting on Opponent");
        } break;
    }
}


const turnMinDuration = 5000;
async function turnDoneWrapper(interaction, game, message) { 
    if(!game.ai) {
        // buffer if move too fast
        let thisMove = Date.now();
        let moveDiff = thisMove - gamesInterfaces[game.id].lastMove;
        gamesInterfaces[game.id].lastMove = thisMove;
        if(moveDiff < turnMinDuration) {
            await sleep(turnMinDuration - moveDiff);
        }
        // update spectator message
        updateSpectatorBoard(game.id);
        if(game.solo && gamesInterfaces[game.id].lastInteraction && !game.blackEliminated && !game.whiteEliminated && !game.goldEliminated) {
        // update prev player board
            await gamesInterfaces[game.id].lastInteraction.editReply(displayBoard(game, "Waiting on Opponent", [], gamesInterfaces[game.id].lastInteractionTurn));
        }
        // update player message
        if(interaction) {
            await interaction.editReply(displayBoard(game, message));
            busyWaiting(interaction, game.id, game.turn);
        }
        
        // inner turn done
        turnDone(game, message)
    } else {
        // always run next turn
        nextTurn(game);
    }
}




function displayBoard(game, message, comp = [], turnOverride = null) {
    return { content: renderBoard(game, message, turnOverride), components: comp, ephemeral: true, fetchReply: true };
}

function emptyMessage() {
    return { content: "*Loading...*", components: [], ephemeral: true, fetchReply: true };
}

async function busyWaiting(interaction, gameid, player, firstMessage = false) {
    await sleep(900);
    while(true) {
        await sleep(100);
        // game disappeared
        if(!games[gameid]) return;
        // game concluded
        if(games[gameid].concluded) {
            interaction.editReply(displayBoard(games[gameid], "Game Concluded", [], player));     
            destroyGame(gameid);
            return;
        }
        // attempt turn
        if(games[gameid].turn == player) {
            await sleep(100);
            if(games[gameid].players[player] == null) {
                console.log("INCORRECT BUSY WAITING");
                return;
            }
            // if edit fails retry;
            try {
                if(interaction && interaction.replied) {
                    turnStart(interaction, gameid, player, "editreply", firstMessage);  
                    return;
                }
            } catch (err) { 
                console.log(err);
                await sleep(500);
            }
        }
    }
}

async function delayedDestroy(gameid) {
    await sleep(2000);
    if(games[gameid]) destroyGame(gameid);
}


/**
**
**
**
**
^ Moved
v Not Moved
**
**
**
**/

// returns all possible ability targets as interactions
function getAbilityTargets(curGame, abilityPiece, arg1) {
    let aPositions, aInteractions, aComponents = [];
    let abilitySelection = nameToXY(arg1);
    // provide options
    switch(abilityPiece.name) {
        default: case null:
            aComponents = interactionsFromPositions([], arg1, "turnstart", 3);
        break;
        // Target targetable enemy
        case "Fortune Teller":
        case "Warlock":
            aPositions = generatePositions(curGame.state, arg1);
            aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]).filter(el => curGame.state[el[1]][el[0]].enemyVisibleStatus < 7); // only select moves with targets
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "investigate", 3);
        break;
        case "Infecting Wolf":
        case "Saboteur Wolf":
        case "Horseman of Pestilence":
            aPositions = generatePositions(curGame.state, arg1);
            aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", abilityPiece.name == "Infecting Wolf" ? "infect" : "sabotage", 3);
        break;
        // Target targetable ally
        case "Witch":
        case "Royal Knight":
            let modGame = stateClone(curGame.state);
            let protTeam = modGame[abilitySelection.y][abilitySelection.x].team;
            modGame[abilitySelection.y][abilitySelection.x].team = (protTeam + 1) % 2;
            aPositions = generatePositions(modGame, arg1);
            aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]).filter(el => curGame.state[el[1]][el[0]].team == protTeam); // only select moves with targets
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "protect", 3);
        break;
        // Target all enemy
        case "Clairvoyant Fox":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team != abilityPiece.team && xyPiece.enemyVisibleStatus < 7) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "investigate", 3);
        break;
        case "Crowd Seeker":
        case "Archivist Fox":
        case "Psychic Wolf":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team != abilityPiece.team && xyPiece.enemyVisibleStatus < 4) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "investigate", 3);
        break;
        case "Aura Teller":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team != abilityPiece.team && xyPiece.enemyVisibleStatus < 5 && !xyPiece.atChecked) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "investigate", 3);
        break;
        // unenchanted enemy
        case "Flute Player":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team != abilityPiece.team && !xyPiece.enchanted) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "enchant", 3);
        break;
        // undemonized enemy
        case "Vampire":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team != abilityPiece.team && !xyPiece.demonized) {
                        aPositions.push([x, y]);
                    }
                }
            }
            if(aPositions.length == 0) {
                for(let y = 0; y < curGame.height; y++) {
                    for(let x = 0; x < curGame.width; x++) {
                        if(curGame.state[y][x].name == "Vampire") {
                            curGame.state[y][x] = getPiece("Empowered Vampire");
                        }
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "demonize", 3);
        break;
        // Target all ally
        case "Tanner":
        case "Horseman of Famine":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team == abilityPiece.team) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", abilityPiece.name == "Tanner" ? "disguise" : "disguise_hm", 3);
        break;
        // Dog
        case "Dog":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            aInteractions.push({ type: 2, label: "Wolf Cub " + getUnicode("Pawn", 1), style: 3, custom_id: "transform-" + arg1 + "-Wolf Cub" });
            aInteractions.push({ type: 2, label: "Fox " + getUnicode("Knight", 1), style: 3, custom_id: "transform-" + arg1 + "-Fox" });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        // Ghast
        case "Ghast":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            if((abilitySelection.y + 1) < curGame.height && curGame.state[abilitySelection.y + 1][abilitySelection.x].name == null) aInteractions.push({ type: 2, label: "Create Fireball (Below)", style: 3, custom_id: "createfb-" + arg1 + "-down" });
            if((abilitySelection.y - 1) >= 0 && curGame.state[abilitySelection.y - 1][abilitySelection.x].name == null) aInteractions.push({ type: 2, label: "Create Fireball (Above)", style: 3, custom_id: "createfb-" + arg1 + "-up" });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        // Ghast
        case "FireballUp":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            let fbuName = xyToName(abilitySelection.x, abilitySelection.y - 1);
            if((abilitySelection.y - 1) >= 0 && curGame.state[abilitySelection.y - 1][abilitySelection.x].team != 2) aInteractions.push({ type: 2, label: "Move Up (" + fbuName + ")", style: 3, custom_id: "teleport-" + arg1 + "-" + fbuName });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        case "FireballDown":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            let fbdName = xyToName(abilitySelection.x, abilitySelection.y + 1);
            if((abilitySelection.y + 1) < curGame.height && curGame.state[abilitySelection.y + 1][abilitySelection.x].team != 2) aInteractions.push({ type: 2, label: "Move Down (" + fbdName + ")", style: 3, custom_id: "teleport-" + arg1 + "-" + fbdName });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        // Bloody Butcher
        case "Bloody Butcher":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            aInteractions.push({ type: 2, label: "Reveal", style: 3, custom_id: "transformreveal-" + arg1 + "-Revealed Bloody Butcher" });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        // Hooker - Surrounding fields
        case "Bat":
        case "Hooker":
            aInteractions = [];
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x].team == abilityPiece.team) aInteractions.push([abilitySelection.x, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x].team == abilityPiece.team) aInteractions.push([abilitySelection.x, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x-1].team == abilityPiece.team) aInteractions.push([abilitySelection.x-1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x-1].team == abilityPiece.team) aInteractions.push([abilitySelection.x-1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x-1].team == abilityPiece.team) aInteractions.push([abilitySelection.x-1, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x+1].team == abilityPiece.team) aInteractions.push([abilitySelection.x+1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x+1].team == abilityPiece.team) aInteractions.push([abilitySelection.x+1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x+1].team == abilityPiece.team) aInteractions.push([abilitySelection.x+1, abilitySelection.y+1]);
            aInteractions = aInteractions.map(el => {
                return new Object({ type: 2, label: xyToName(el[0], el[1]), style: 3, custom_id: "hide-" + arg1 + "-" + xyToName(el[0], el[1]) });
            });
            aInteractions.unshift({ type: 2, label: "Back", style: 4, custom_id: "turnstart" });
            aComponents = [{ type: 1, components: aInteractions.slice(0, 5) }];
            if(aInteractions.length > 5) aComponents.push({ type: 1, components: aInteractions.slice(5, 10) });
        break;
        // HoD - Surrounding fields
        case "Horseman of Death":
            aInteractions = [];
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x].team == 1) aInteractions.push([abilitySelection.x, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x].team == 1) aInteractions.push([abilitySelection.x, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x-1].team == 1) aInteractions.push([abilitySelection.x-1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x-1].team == 1) aInteractions.push([abilitySelection.x-1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x-1].team == 1) aInteractions.push([abilitySelection.x-1, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x+1].team == 1) aInteractions.push([abilitySelection.x+1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x+1].team == 1) aInteractions.push([abilitySelection.x+1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x+1].team == 1) aInteractions.push([abilitySelection.x+1, abilitySelection.y+1]);
            aInteractions = aInteractions.map(el => {
                return new Object({ type: 2, label: xyToName(el[0], el[1]), style: 3, custom_id: "destroy-" + arg1 + "-" + xyToName(el[0], el[1]) });
            });
            aInteractions.unshift({ type: 2, label: "Back", style: 4, custom_id: "turnstart" });
            aComponents = [{ type: 1, components: aInteractions.slice(0, 5) }];
            if(aInteractions.length > 5) aComponents.push({ type: 1, components: aInteractions.slice(5, 10) });
        break;
        // Alpha Wolf - All allies with available slot
        case "Alpha Wolf":
            aPositions = [];
            for(let y = 1; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    let x0Piece = curGame.state[0][x];
                    if(xyPiece.name != null && xyPiece.team == abilityPiece.team && x0Piece.name == null) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "recall", 3);
        break;
        // HoW Wolf - All allies with available slot
        case "Horseman of War":
            aPositions = [];
            for(let y = 1; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    let x0Piece = curGame.state[2][x];
                    if(xyPiece.name != null && xyPiece.team == abilityPiece.team && x0Piece.name == null) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "cecall", 3);
        break;
    }
    return aComponents;
}

function countSoloPieces(game) {
    let counter = 0;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(game.state[y][x].team == 2) counter++;
        }
    }
    return counter;
}

/* New Slash Command */
client.on('interactionCreate', async interaction => {
    if(interaction.isButton()) {
        console.log("INTERACTION", interaction.customId);
        let type = interaction.customId.split("-")[0];
        let arg1 = interaction.customId.split("-")[1];
        let arg2 = interaction.customId.split("-")[2];
        let gameID = getPlayerGameId(interaction.member.id);
        let curGame = games[gameID];
        
        if(type != "deny" && type != "accept") {
            // check if its still a valid message
            if(gamesInterfaces[gameID].interfaces[curGame.turn] && gamesInterfaces[gameID].interfaces[curGame.turn].msg != interaction.message.id) {
                console.log(gamesInterfaces[gameID].interfaces[curGame.turn].msg);
                console.log(interaction.message.id);
                console.log("OUTDATED MESSAGE");
                interaction.update({content: "✘", components: []});
                return;
            }
            
            gamesInterfaces[gameID].lastInteraction = interaction;
            gamesInterfaces[gameID].lastInteractionTurn = curGame.turn;
        }
        
        switch(type) {
            // deny challenge
            case "deny":
                if(!isOutstanding(interaction.member.id)) {
                    interaction.reply({ content: "**Error:** You have no outstanding challenges!", ephemeral: true });
                } else {
                    let id = getPlayerGameId(interaction.member.id);
                    concludeGame(id);
                    destroyGame(id);
                    interaction.channel.send("**Challenge:** " + interaction.member.user.username + " denied the challenge!");
                    console.log("DENY");
                    
                    interaction.message.delete();
                }
            break;
            case "accept":
                if(!isOutstanding(interaction.member.id)) {
                    interaction.reply({ content: "**Error:** You have no outstanding challenges!", ephemeral: true });
                } else {
                    let challenge = outstandingChallenge.filter(el => el[0] == interaction.member.id)[0];
                    console.log("CHALLENGE", challenge);
                    
                    interaction.channel.send("**Challenge**: <@" + challenge[1] + "> Your challenge has been accepted by <@" + interaction.member.id + ">!");
                    
                    interaction.reply(displayBoard(games[challenge[2]], "Waiting on Opponent", [], 1));
                    busyWaiting(interaction, challenge[2], 1, true);
                    
                    outstandingChallenge = outstandingChallenge.filter(el => el[0] != interaction.member.id);
                    
                    interaction.message.delete();
                }
            break;
            // start game if starting is black
            case "start":
                await interaction.update(displayBoard(curGame, "Starting Game", []));
                turnDoneWrapper(interaction, curGame, "Waiting on Opponent");
            break;
            // select a piece; show available moves
            case "select":    
                let selection = nameToXY(arg1);
                let currentGame = gameClone(curGame);
                
                // generate list of possible moves
                //console.log("BOARD AT SELECT", currentGame.state.map(el => el.map(el2 => el2.name).join(",")).join("\n"));
                let positions = generatePositions(currentGame.state, arg1);
                console.log("AVAILABLE POSITIONS", positions.map(el => xyToName(el[0], el[1])).join(","));
                let components = interactionsFromPositions(positions, arg1, "turnmove", "move");
                //console.log(components);
                
                currentGame.selectedPiece = shallowCopy(currentGame.state[selection.y][selection.x]);
                currentGame.state[selection.y][selection.x] = getPiece("Selected");
                
                interaction.update(displayBoard(currentGame, "Pick a Move", components));
            break;
            // move a piece to another location; update board
            case "move":
                try {
                    await interaction.update(displayBoard(curGame, "Executing Move", []));
                    movePieceWrapper(interaction, games[gameID], arg1, arg2);
                } catch (err) {
                    console.log(err);
                    console.log("ERROR ON MOVE. IGNORING");
                }
            break;
            // promote a piece; update board
            case "promote":
                await interaction.update(displayBoard(curGame, "Executing Move", []));
                movePieceWrapper(interaction, games[gameID], arg1, arg1, getPiece(arg2));
            break;
            // back to turn start menu
            case "turnstart":
                turnStart(interaction, gameID, curGame.turn, "update");
            break;
            // back to turn move menu
            case "turnmove":
                // continue
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
             // select an ability piece; show available actions
            case "ability":    
                let abilitySelection = nameToXY(arg1);
                let abilityPiece = curGame.state[abilitySelection.y][abilitySelection.x];
                
                // get ability interactions
                let aComponents = getAbilityTargets(curGame, abilityPiece, arg1);
                                
                // update message
                interaction.update(displayBoard(curGame, "Pick a Target", aComponents));
            break;
            /** ACTIVE ABILITIES **/
            // investigate
            case "investigate":
                let investigatorC = nameToXY(arg1);
                let investigator = curGame.state[investigatorC.y][investigatorC.x];
                let investTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Invest", [investigatorC.x, investigatorC.y], [investTarget.x, investTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update") 
            break;
            // transform
            case "transform":
                let transformer = nameToXY(arg1);
			    executeActiveAbility(curGame, "Transform", [transformer.x, transformer.y], arg2);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // transform
            case "createfb":
                let creator = nameToXY(arg1);
			    executeActiveAbility(curGame, "CreateFireball", [creator.x, creator.y], arg2);
                if(countSoloPieces(curGame) == 1) {
                    await interaction.update(displayBoard(curGame, "Skipping Move"));
                    turnDoneWrapper(interaction, curGame, "Waiting on Opponent", true); // no move after ability use
                } else {
                    turnMove(interaction, gameID, curGame.turn, "update");
                }
            break;
            case "teleport":
                let teleportFrom = nameToXY(arg1);
                let teleportTo = nameToXY(arg2)
			    executeActiveAbility(curGame, "Teleport", [teleportFrom.x, teleportFrom.y], [teleportTo.x, teleportTo.y]);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // transform reveal
            case "transformreveal":
                let transformer2 = nameToXY(arg1);
			    executeActiveAbility(curGame, "TransformReveal", [transformer2.x, transformer2.y], arg2);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // infect
            case "infect":
                let iwSource = nameToXY(arg1);
                let iwTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Infect", [iwSource.x, iwSource.y], [iwTarget.x, iwTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");   
            break;
            // active protect
            case "protect":
                let protectTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Protect", null, [protectTarget.x, protectTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // sabotage
            case "sabotage":
                let sabotageTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Sabotage", null, [sabotageTarget.x, sabotageTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // enchant
            case "enchant":
                let enchantSource = nameToXY(arg1);
                let enchantTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Enchant", [enchantSource.x, enchantSource.y], [enchantTarget.x, enchantTarget.y]);
                if(countSoloPieces(curGame) == 1) {
                    await interaction.update(displayBoard(curGame, "Skipping Move"));
                    turnDoneWrapper(interaction, curGame, "Waiting on Opponent", true); // no move after ability use
                } else {
                    turnMove(interaction, gameID, curGame.turn, "update");
                }
            break;
            // demonize
            case "demonize":
                let demonizeSource = nameToXY(arg1);
                let demonizeTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Demonize", [demonizeSource.x, demonizeSource.y], [demonizeTarget.x, demonizeTarget.y]);
                if(countSoloPieces(curGame) == 1) {
                    await interaction.update(displayBoard(curGame, "Skipping Move"));
                    turnDoneWrapper(interaction, curGame, "Waiting on Opponent", true); // no move after ability use
                } else {
                    turnMove(interaction, gameID, curGame.turn, "update");
                }
            break;
            // hooker hide
            case "hide":
                let hideSubject = nameToXY(arg1);
                let hideTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Hide", [hideSubject.x, hideSubject.y], [hideTarget.x, hideTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // hod destroy
            case "destroy":
                let destroySubject = nameToXY(arg1);
                let destroyTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Destroy", [destroySubject.x, destroySubject.y], [destroyTarget.x, destroyTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // tanner tan
            case "disguise":
                // show tan options
                let disInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "ability-" + arg1 }];
                disInteractions.push({ type: 2, label: "Wolf " + getUnicode("Pawn", 1), style: 3, custom_id: "tan-" + arg2 + "-Wolf" });
                disInteractions.push({ type: 2, label: "Psychic Wolf " + getUnicode("King", 1), style: 3, custom_id: "tan-" + arg2 + "-Psychic Wolf" });
                disInteractions.push({ type: 2, label: "Fox " + getUnicode("Knight", 1), style: 3, custom_id: "tan-" + arg2 + "-Fox" });
                disInteractions.push({ type: 2, label: "Scared Wolf " + getUnicode("Rook", 1), style: 3, custom_id: "tan-" + arg2 + "-Scared Wolf" });
                let disComponents = [{ type: 1, components: disInteractions }];
                // update message
                interaction.update(displayBoard(curGame, "Pick a Disguise", disComponents));
            break;
            // horseman tan
            case "disguise_hm":
                // show tan options
                let dis2Interactions = [{ type: 2, label: "Back", style: 4, custom_id: "ability-" + arg1 }];
                dis2Interactions.push({ type: 2, label: "Lamb " + getUnicode("Pawn", 1), style: 3, custom_id: "tan-" + arg2 + "-Lamb" });
                dis2Interactions.push({ type: 2, label: "Horseman of War " + getUnicode("King", 1), style: 3, custom_id: "tan-" + arg2 + "-Horseman of War" });
                dis2Interactions.push({ type: 2, label: "Horseman of Death " + getUnicode("King", 1), style: 3, custom_id: "tan-" + arg2 + "-Horseman of Death" });
                dis2Interactions.push({ type: 2, label: "Horseman of Pestilence " + getUnicode("Rook", 1), style: 3, custom_id: "tan-" + arg2 + "-Horseman of Pestilence" });
                let dis2Components = [{ type: 1, components: dis2Interactions }];
                // update message
                interaction.update(displayBoard(curGame, "Pick a Disguise", dis2Components));
            break;
            // tanner tan
            case "tan":
                let tanSubject = nameToXY(arg1);
			    executeActiveAbility(curGame, "Tan", null, [tanSubject, arg2], true);
                turnMove(interaction, gameID, curGame.turn, "update") 
            break;
            // alpha wolf recall
            case "recall":
                let recallSubject = nameToXY(arg2);
			    executeActiveAbility(curGame, "Recall", null, [recallSubject.x, recallSubject.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // HoW cecall
            case "cecall":
                let cecallSubject = nameToXY(arg2);
			    executeActiveAbility(curGame, "Cecall", null, [cecallSubject.x, cecallSubject.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
        }
    }
    
    if(!interaction.isCommand()) return; // ignore non-slash commands
    let soloGame = false;
    switch(interaction.commandName) {
        case "ping":
            // Send pinging message
            interaction.reply({ content: "**Ping:** Ping", fetchReply: true, ephemeral: true })
            .then(m => {
                // Get values
                let latency = m.createdTimestamp - interaction.createdTimestamp;
                let ping = Math.round(client.ws.ping);
                interaction.editReply("**Ping:** Pong! Latency is " + latency + "ms. API Latency is " + ping + "ms");
            })
        break;
        case "help":
            // Send pinging message
            interaction.reply({ content: findEmoji("WWRess") + " **WWRess** " + findEmoji("WWRess") + "\nWWRess is a variant of chess, played on a 5x5 grid. In each game, each of the two sides (white/town & black/wolves) gets 5 pieces. Each piece comes with a movement type (Pawn, King, Knight, Rook or Queen) and an ability. Each team has 17 unique pieces (6 pawns, 4 kings, 3 knights, 3 rooks, 1 queen). The pieces of the teams differ, so the two sides usually have completely different abilities. Look up what pieces there are using `/pieces <team name>`.\n\nEach turn consists of two actions: first, using an active ability (if a piece with an active ability is available) and second, moving a piece. The game is won if the enemy cannot make a move (Kings are not part of the win condition in any way).\n\nThe only available special move is Pawn Promotion.\n\nInitially, all enemy pieces are hidden. The movement type of enemy pieces will automatically be marked where possible (only a knight can jump so that move makes the piece clearly identifiable as a knight (though not which knight), moving a single step forward does not) and additionally investigative pieces may be used to reveal them. Sometimes this is not fully accurate, as some pieces can change role (e.g. Dog) and some can be disguised (e.g. Sneaking Wolf).\n\nStart a game against the AI with `/play`, challenge another player with `/challenge <name>`. Accept or deny a challenge with `/accept` and `/deny`. Use `/resign` to give up." });
        break;
        case "pieces":
            let team = interaction.options.get('team').value;
            let pieces = [];
            let teamColor = "White";
            let teamName = "";
            let teamColorDec = "";
            switch(team) {
                case "townsfolk":
                    pieces = [["Citizen","Ranger","Huntress","Bartender⁎","Fortune Apprentice","Child","Bard⁎⁎","Butcher**"],["Hooker⁎","Idiot","Crowd Seeker","Aura Teller"],["Royal Knight","Alcoholic⁎","Amnesiac"],["Fortune Teller","Runner","Witch"],["Cursed Civilian⁎"]];
                    teamColor = "White";
                    teamName = "Townsfolk (White)";
                    teamColorDec = 16777215;
                break;
                case "werewolf":
                    pieces = [["Wolf","Wolf Cub","Tanner","Archivist Fox","Recluse","Dog","Bloody Butcher⁎⁎","Packless Wolf⁎⁎"],["Infecting Wolf⁎","Alpha Wolf","Psychic Wolf","Sneaking Wolf"],["Direwolf⁎","Clairvoyant Fox","Fox"],["Warlock","Scared Wolf","Saboteur Wolf"],["White Werewolf⁎"]];
                    teamColor = "Black";
                    teamName = "Werewolves (Black)";
                    teamColorDec = 1;
                break;
                case "solo":
                    pieces = [["Zombie","Corpse","Undead","Angel","Apprentice","Lamb"],["Bat","Ghast","Horseman of Death","Horseman of War"],[],["Flute Player","Vampire","Apprentice Vampire","Horseman of Pestilence","Horseman of Famine"],[]];
                    teamColor = "Gold";
                    teamName = "Solo (Gold)";
                    teamColorDec = 14850359;
                break;
            }
            
            let limitations = [false, false];
            let fields = ["Pawns","Kings","Knights","Rooks","Queens"];
            let embed = { title: findEmoji("WWRess") + " **" + teamName + " Piece List:** " + findEmoji("WWRess"), color: teamColorDec, fields: [] };
            for(let i = 0; i < pieces.length; i++) {
                let field = { name: fields[i], value: "" };
                for(let j = 0; j < pieces[i].length; j++) {
                    let pieceName = pieces[i][j].replace(/\⁎/g, "");
                    let limitation = (pieces[i][j].match(/\⁎/g) || []).length
                    limitations[limitation - 1] = true;
                    field.value += findEmoji(teamColor + getChessName(pieceName)) + " " + findEmoji(pieceName) + " **" + pieces[i][j] + ":** " + getAbilityText(pieceName) + "\n";
                }
                if(field.value.length > 0) {
                    embed.fields.push(field);
                }
            }
            if(limitations.filter(el => el).length > 0) {
                let field = { name: "** **", value: "" };
                if(limitations[0]) field.value += "\⁎ Not available in simplified mode.\n";
                if(limitations[1]) field.value += "\⁎\⁎ Only available in advanced mode.\n";
                embed.fields.push(field);
            }
            // Send pinging message
            //console.log(embed);
            interaction.reply({ embeds: [embed] });
        break;
        case "play_solo":
            soloGame = true;
        case "play":
        case "boss":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "**Error:** You're already in a game!", ephemeral: true });
            } else {
                let players;
                let rand = Math.floor(Math.random() * 100);
                let teamSelArg = interaction.options.get("team")?.value ?? null;
                let soloArg = interaction.options.get("solo")?.value ?? null;
                let modeArg = interaction.options.get("mode")?.value ?? null;
                let aiArg = interaction.options.get("ai_strength")?.value ?? null;
                
                if(aiArg == "weak") {
                    aiArg = -2;
                } else if(aiArg == "strong") {
                    aiArg = +2;
                } else {
                    aiArg = 0;
                }
                
                if(soloArg && soloArg.length) soloGame = true;
                
                interaction.guild.channels.cache.get("1162103245829832744").send(`<@${interaction.member.id}> has started a \`${modeArg}\` game!`);
                
                //rand = 100; // seo: debug solo
                // determine teams    
                switch(modeArg) {
                    default: // wwress
                        if(teamSelArg) {
                            switch(teamSelArg) {
                                case "white":
                                    if(rand < 15 || soloArg) {
                                        players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, "*AI #2*"]];
                                    } else {
                                        players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, null]];
                                    }
                                break;
                                case "black":
                                    if(rand < 15 || soloArg) {
                                        players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, "*AI #2*"]];
                                    } else {
                                        players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, null]];
                                    }
                                break;
                                case "gold":
                                    players = [[null, "*AI*"], [null, "*AI #2*"], [interaction.member.id, interaction.member.user.username]];
                                break;
                            }
                        } else if(!soloGame) {
                            if(rand < 6) { // player town + solo
                                players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, "*AI #2*"]];
                            } else if(rand < 48) { // player town
                                players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, null]];
                            } else if(rand < 54) { // player wolf + ai
                                players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, "*AI #2*"]];
                            }  else if(rand < 96) { // player wolf
                                players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, null]];
                            } else { // player ai
                                players = [[null, "*AI*"], [null, "*AI #2*"], [interaction.member.id, interaction.member.user.username]];
                            }
                        } else {
                            if(rand <= 35) { // player town + solo
                                players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, "*AI #2*"]];
                            } else if(rand <= 70) { // player wolf + solo
                                players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, "*AI #2*"]];
                            } else { // player solo
                                players = [[null, "*AI*"], [null, "*AI #2*"], [interaction.member.id, interaction.member.user.username]];
                            }
                        }
                    break;
                    case "boss_bat":
                    case "boss_zombie":
                    case "boss_flute":
                        players = [[interaction.member.id, interaction.member.user.username], [null, null], [null, "*AI*"]];
                    break;
                    case "boss_horseman":
                        players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, "*AI*"]];
                    break;
                    case "boss_horseman_reversed":
                        players = [[null, "*AI*"], [null, "*AI*"], [interaction.member.id, interaction.member.user.username]];
                    break;
                    case "boss_ghast":
                        players = [[null, "*AI*"], [null, null], [interaction.member.id, interaction.member.user.username]];
                    break;
                    case "hexapawn":
                    case "pawnford":
                    case "pawnford_big":
                    case "chess":
                    case "minichess":
                        if(teamSelArg) {
                            switch(teamSelArg) {
                                case "white":
                                    players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, null]];
                                break;
                                case "black":
                                    players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, null]];
                                break;
                                case "gold":
                                    interaction.reply({ content: "**Error:** Invalid combination of arguments!", ephemeral: true });
                                    return;
                                break;
                            }
                        } else {
                            if(rand < 50) {
                                players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, null]];
                            } else {
                                players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, null]];
                            }
                        }
                    break;
                }
                // create game
                createGame(players[0][0], players[1][0], players[2][0], games.length, players[0][1], players[1][1], players[2][1], interaction.channel.id, interaction.guild.id, soloArg, modeArg, aiArg);
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                // spectator board
                let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
                msgSpec.ephemeral = false;
                
                if(games[id].players[0]) { // player is P1
                    interaction.reply(msgSpec).then(m => {
                        gamesInterfaces[id].spectator.msg = m;
                        gamesInterfaces[id].spectator.type = "discord";
                        // player board
                        turnStart(interaction, id, 0, "followup"); 
                    });
                } else if(games[id].players[1]) { // player is P2
                    interaction.reply(msgSpec).then(m => {
                        gamesInterfaces[id].spectator.msg = m;
                        gamesInterfaces[id].spectator.type = "discord";
                        games[id].turn = 1;
                        // player board
                        turnStartNot(interaction, id, 1, "followup"); 
                    });
                } else if(games[id].players[2]) { // player is P3
                    interaction.reply(msgSpec).then(m => {
                        gamesInterfaces[id].spectator.msg = m;
                        gamesInterfaces[id].spectator.type = "discord";
                        games[id].turn = 2;
                        games[id].normalTurn = 1;
                        // player board
                        turnStartNot(interaction, id, 2, "followup"); 
                    });
                }
            }
        break;
        case "aigame":
            let players = [[null, "*AI #1*"], [null, "*AI #2*"], [null, "*AI #3*"]];
            let modeArg = interaction.options.get("mode")?.value ?? null;
            if(modeArg == "chess" || modeArg == "minichess" || modeArg == "hexapawn" || modeArg == "pawnford" || modeArg == "pawnford_big") players[2][1] = null;
            createGame(players[0][0], players[1][0], players[2][0], games.length, players[0][1], players[1][1], players[2][1], interaction.channel.id, interaction.guild.id, null, modeArg);
            let id = games.length - 1;
                
            // spectator board
            let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
            msgSpec.ephemeral = false;
            interaction.reply(msgSpec).then(m => {
                gamesInterfaces[id].spectator.msg = m;
                gamesInterfaces[id].spectator.type = "discord";
                games[id].aiOnly = true;
                AImove(0, games[id]);
            });
        break;
        case "resign":
            if(!isPlaying(interaction.member.id)) {
                interaction.reply({ content: "**Error:** You're not in a game!", ephemeral: true });
            } else {
                let id = getPlayerGameId(interaction.member.id);
                concludeGame(id);
                destroyGame(id);
                interaction.reply("**Game End:** " + interaction.member.user.username + " resigned!");
                console.log("RESIGN");
            }
        break;
        case "challenge_solo":
            soloGame = true;
        case "challenge":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "**Error:** You're already in a game!", ephemeral: true });
            } else {
                let opponent = interaction.options.get('opponent').value;
                opponent = interaction.guild.members.cache.get(opponent);
                if(!opponent || opponent.bot) {
                    interaction.reply({ content: "**Error:** Could not find opponent!", ephemeral: true });
                    return;
                }
                if(isPlaying(opponent.id)) {
                    interaction.reply({ content: "**Error:** Your selected opponent is already in a game!", ephemeral: true });
                    return;
                }
                
                
                let soloArg = interaction.options.get("solo")?.value ?? null;
                let modeArg = interaction.options.get("mode")?.value ?? null;
                let gameID = games.length;
                if((Math.floor(Math.random() * 100) < 15 || soloGame) && modeArg != "chess" && modeArg != "minichess" && modeArg != "hexapawn" && modeArg != "pawnford" && modeArg != "pawnford_big") { // with AI
                    createGame(interaction.member.id, opponent.id, null, gameID, interaction.member.user.username, opponent.user.username, "*AI*", interaction.channel.id, interaction.guild.id, soloArg, modeArg);
                } else { // without AI
                    createGame(interaction.member.id, opponent.id, null, gameID, interaction.member.user.username, opponent.user.username, null, interaction.channel.id, interaction.guild.id, soloArg, modeArg);
                }
                
                interaction.channel.send({content: "**Challenge**: <@" + opponent.id + "> You have been challenged by <@" + interaction.member.id + ">!", components: [{type: 1, components:[{ type: 2, label: "Accept", style: 3, custom_id: "accept" }, { type: 2, label: "Deny", style: 4, custom_id: "deny" }]}] });
               
                outstandingChallenge.push([opponent.id, interaction.member.id, gameID])
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    gamesInterfaces[id].spectator.msg = m;
                    gamesInterfaces[id].spectator.type = "discord";
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
            }
        break;
        case "resend":
            if(isPlaying(interaction.member.id)) {
                let pid = interaction.member.id;
                let gid = getPlayerGameId(pid);
                let pgid = -1;
                if(pid == games[gid].players[0]) pgid = 0;
                else if(pid == games[gid].players[1]) pgid = 1;
                else if(pid == games[gid].players[2]) pgid = 2;
                if(pgid == games[gid].turn) {
                    turnMove(interaction, gid, games[gid].turn, "reply");
                } else {
                    interaction.reply({ content: "**Error:** Please wait until it's your turn to run `/resend`!", ephemeral: true });
                }
                
            } else {
                interaction.reply({ content: "**Error:** You're not in a game!", ephemeral: true });
            }
        break;
    }
})


function getTeam(piece) {
    switch(piece) {
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child": case "Bard": case "Butcher": case "Bloody Butcher":
        case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
        case "Royal Knight": case "Alcoholic": case "Amnesiac":
        case "Runner": case "Fortune Teller": case "Witch":
        case "Cursed Civilian":
        case "Attacked Runner": case "Attacked Idiot":
        case "White Pawn": case "White King": case "White Knight": case "White Rook": case "White Queen": case "White Bishop":
            return 0;
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog": case "Revealed Bloody Butcher": case "Packless Wolf":
        case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
        case "Direwolf": case "Clairvoyant Fox": case "Fox":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "White Werewolf":
        case "Attacked Scared Wolf":
        case "Black Pawn": case "Black King": case "Black Knight": case "Black Rook": case "Black Queen": case "Black Bishop":
            return 1;
        case "Selected":
        case null:
            return -1;
        case "Flute Player":
        case "Devil":
        case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": case "Corpse":
        case "Angel": case "Apprentice":
        case "Vampire": case "Undead": case "Empowered Vampire": case "Bat": case "Apprentice Vampire":
        case "Ghast": case "FireballUp": case "FireballDown":
        case "Horseman of Death": case "Horseman of Pestilence": case "Horseman of Famine": case "Horseman of War": case "Lamb":
            return 2;
    }
}

function isActive(piece) {
    switch(piece) {
        default:
            return false;
        case "Hooker": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Fortune Teller": case "Witch":
        case "Tanner": case "Archivist Fox": case "Dog": case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Clairvoyant Fox": case "Warlock": case "Saboteur Wolf":
        case "Flute Player": case "Devil": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": case "Vampire": case "Bat": case "Ghast": case "FireballUp": case "FireballDown": case "Horseman of War": case "Horseman of Pestilence": case "Horseman of Famine": case "Horseman of Death": 
            return true;
    }
}

function getAbilityText(piece) {
    switch(piece) {
        default:
            return "No ability.";
            
        case "Citizen":
            return "No ability.";
        case "Ranger":
            return "Reveals killer, when taken.";
        case "Huntress": 
            return "Takes killer, when taken.";
        case "Bartender":
            return "No ability. Relevant for Alcoholic.";
        case "Fortune Apprentice":
            return "Replaces FT/AT/CS if they are taken.";
        case "Child":
            return "Additional move, when taken.";
        case "Bard":
            return "Reveals if investigated.";
        case "Butcher":
            return "No ability.";
        case "Hooker":
            return "May hide in an adjacent ally's field.";
        case "Idiot":
            return "Survives one attack, but becomes unmovable.";
        case "Attacked Idiot":
            return "Survived an attack. No ability.";
        case "Crowd Seeker":
            return "Reveal a piece's type.";
        case "Aura Teller":
            return "Reveal a piece's type, if it has an active power.";
        case "Royal Knight":
            return "Protects a reachable piece.";
        case "Alcoholic":
            return "Invulnerable, if Bartender exists.";
        case "Amnesiac":
            return "Changes after one move.";
        case "Runner":
            return "Survives one attack, but becomes less mobile.";
        case "Attacked Runner":
            return "Survived an attack. No ability. Moves one square horizontally/vertically.";
        case "Fortune Teller":
            return "Reveal a reachable piece.";
        case "Witch":
            return "Protects a reachable piece.";
        case "Cursed Civilian":
            return "Becomes a Wolf, when taken.";
            
        case "Wolf":
            return "No ability.";
        case "Wolf Cub":
            return "Additional move, when taken.";
        case "Tanner":
            return "Disguise one piece.";
        case "Archivist Fox":
            return "Reveal a piece's type.";
        case "Recluse":
            return "Reveals if investigated.";
        case "Dog":
            return "Once, becomes a Wolf Cub or Fox.";
        case "Bloody Butcher":
            return "Pretends to be a town piece, but is actually a wolf piece. Can only be promoted by town.";
        case "Revealed Bloody Butcher":
            return "Pretended to be a town piece, but is actually a wolf piece. Cannot be promoted.";
        case "Packless Wolf":
            return "Cannot move unless it is the last wolf piece.";
        case "Infecting Wolf":
            return "Convert enemy piece to wolf + become wolf.";
        case "Alpha Wolf":
            return "Can call back pieces to the back rank.";
        case "Psychic Wolf":
            return "Reveal a piece's type.";
        case "Sneaking Wolf":
            return "Disguised as Wolf.";
        case "Direwolf":
            return "Double moves, if last piece.";
        case "Clairvoyant Fox":
            return "Reveal a piece.";
        case "Fox":
            return "No ability.";
        case "Warlock":
            return "Reveal a reachable piece.";
        case "Scared Wolf":
            return "Survives one attack, but becomes less mobile.";
        case "Attacked Scared Wolf":
            return "Survived an attack. No ability. Moves one square horizontally/vertically.";
        case "Saboteur Wolf":
            return "Block a piece's movement/active ability.";
         case "White Werewolf":
            return "Must either be dead or the only remaining piece. Loses the game otherwise.";
            
        case "Flute Player":
            return "Solo | Cannot take pieces. Gets two turns per round. May move or enchant a piece, making them unable to use an ability. Wins when everyone is enchanted.";
        case "Vampire":
            return "Solo | Cannot take pieces, unless everyone is demonized. May move or demonize a piece. When a demonized piece is taken, they instead become an Undead. Becomes Undead when taken.";
        case "Apprentice Vampire":
            return "Solo | Cannot take pieces, unless everyone is demonized. Becomes a Vampire if a Vampire dies. Becomes Undead when taken.";
        case "Empowered Vampire":
            return "Solo | May take pieces. When a demonized piece is taken, they instead become an Undead. Becomes Undead when taken.";
        case "Bat":
            return "Solo | May hide in an adjacent ally's field. Becomes Undead when taken.";
        case "Undead":
            return "Solo | No ability.";
        case "Devil":
            return "Solo | WIP!! DEVIL";
        case "Zombie":
            return "Solo | Cannot take pieces, instead turns them into Zombies. When a Zombie is taken, all Zombies it created disappear. Gets two turns per round.";
        case "Corpse":
            return "Solo | No ability.";
            
        case "Ghast":
            return "Solo | May move or create a fireball piece, that move forwards in a straight line.";
        case "FireballUp":
            return "Solo | Moves up in a straight line, *destroying* pieces in its path.";
        case "FireballDown":
            return "Solo | Moves down in a straight line, *destroying* pieces in its path.";
            
        case "Lamb":
            return "Solo | No ability.";
        case "Horseman of Death":
            return "Solo | May *destroy* a reachable piece without needing to move there";
        case "Horseman of Famine":
            return "Solo | Disguise one piece."
        case "Horseman of Pestilence":
            return "Solo | Block a piece's movement/active ability.";
        case "Horseman of War":
            return "Solo | Can call a piece to the middle of the board.";
            
            
        case "Angel":
            return "UA | Cannot take pieces. Takes killer, when taken. Must be taken to win.";
        case "Apprentice":
            return "UA | Transforms into first taken piece.";
    }
}

function getChessName(piece) {
    switch(piece) {
        default:
            return null;
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child": case "Bard": case "Butcher": case "Bloody Butcher":
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog": case "Revealed Bloody Butcher":
        case "Angel": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": case "Undead": case "Apprentice": case "Corpse": case "Lamb":
        case "White Pawn": case "Black Pawn": 
            return "Pawn";
        case "Attacked Runner": case "Attacked Scared Wolf":
            return "Prince";
         case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
         case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
         case "White King": case "Black King": 
         case "Bat": case "Ghast": case "Horseman of Death": case "Horseman of War":
            return "King";
         case "Royal Knight": case "Alcoholic": case "Amnesiac":
         case "Direwolf": case "Clairvoyant Fox": case "Fox":
         case "White Knight": case "Black Knight": 
            return "Knight";
        case "White Bishop": case "Black Bishop":
            return "Bishop";
        case "Runner": case "Fortune Teller": case "Witch":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "Flute Player": case "Vampire": case "Empowered Vampire": case "Apprentice Vampire": case "Horseman of Famine": case "Horseman of Pestilence":
        case "White Rook": case "Black Rook": 
            return "Rook";
         case "Cursed Civilian":
         case "White Werewolf":
         case "Devil":
         case "White Queen": case "Black Queen":
            return "Queen";
         case "Packless Wolf":
        case "Attacked Idiot":
        case "Selected":
        case "FireballUp": case "FireballDown": 
        case null:
            return "None";
    }
}

function getChessValue(name) {
    switch(name) {
        case "Pawn":
            return 1;
        case "Prince":
            return 2;
        case "Knight":
            return 3;
        case "King":
            return 3;
        case "Bishop":
            return 3;
        case "Rook":
            return 5;
        case "Queen":
            return 9;
        case "None":
            return -1;
    }
}

// converts one piece into another
function convertPiece(oldPiece, newName) {
    oldPiece.name = newName;
    oldPiece.team = getTeam(newName);
    oldPiece.chess = getChessName(newName);
    oldPiece.active = isActive(newName);
    return oldPiece;
}

// creates a piece object
function getPiece(name, metadata = {}) {
    // default piece
    var piece = { name: name, team: getTeam(name), chess: getChessName(name), enemyVisible: "Unknown", enemyVisibleStatus: 0, active: isActive(name), disguise: false, protected: false, protectedBy: null, hasMoved: false, hidden: false, sabotaged: false, atChecked: false, soloEffect: false };
    
    
    // special data
    switch(name) {
        case "Amnesiac":
            piece.convertTo = metadata.amnesiac;
            if(!metadata.amnesiac) piece.convertTo = ["Citizen","Ranger","Aura Teller"][Math.floor(Math.random() * 3)]; // for Amnesiac by promotion
        break;
    	case "Sneaking Wolf":
		    piece.disguise = "Wolf";
    	break;    
    	case "Bloody Butcher":
		    piece.disguise = "Butcher";
    	break;    
        case "White Pawn": case "White King": case "White Knight": case "White Rook": case "White Queen": case "White Bishop":
        case "Black Pawn": case "Black King": case "Black Knight": case "Black Rook": case "Black Queen": case "Black Bishop":
            piece.enemyVisibleStatus = 7;
        break;
        case "Zombie":
            piece.protected = true;
            piece.protectedBy = 2;
            // fall through
        case "Zombie2":
        case "Zombie3":
        case "Zombie4":
        case "Zombie5":
            piece.zombieID = 1;
            piece.zombieParent = 1;
            piece.zombieChildCount = 0;
        break;
        case "Corpse":
        case "Vampire":
        case "Apprentice Vampire":
        case "Bat":
        case "Angel":
        case "Ghast":
        case "Apprentice":
        case "Lamb":
        case "Horseman of Pestilence":
        case "Horseman of Famine":
        case "Horseman of Death":
        case "Horseman of War":
        case "Flute Player": // solos cant be taken first turn
            piece.protected = true;
            piece.protectedBy = 2;
        break;
    }
    
    // return piece
    return piece;
}

function getWWRevalValue(piece) {
        switch(piece) {
            case "Bloody Butcher":
                return -15;
            case "Cursed Civilian": case "White Werewolf": 
                return -1;
            case "Citizen": case "Ranger": case "Child": case "Huntress": case "Butcher": case "Bard":
            case "Wolf": case "Sneaking Wolf": case "Fox": case "Recluse": case "Revealed Bloody Butcher": case "Packless Wolf":
            case "Attacked Runner": case "Attacked Idiot":
            case "Attacked Scared Wolf": 
                return 0;
            case "Amnesiac": case "Idiot": 
                return 1;
            case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Witch": 
            case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Dog": case "Psychic Wolf":
                return 2;
            case "Fortune Apprentice": case "Fortune Teller": case "Runner":
            case "Alpha Wolf": case "Clairvoyant Fox": case "Scared Wolf": case "Saboteur Wolf": case "Warlock":
                return 3;
            case "Hooker": case "Alcoholic":
                return 4;
            case "Infecting Wolf": case "Direwolf": case "Bartender":
                return 5;
                
            case "Flute Player": case "Devil": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": case "Angel": case "Vampire": case "Empowered Vampire": case "Undead": case "Apprentice": case "Bat": case "Corpse": case "Ghast": case "Apprentice Vampire": case "Lamb": case "Horseman of Death": case "Horseman of War": case "Horseman of Famine": case "Horseman of Pestilence": 
                return 0;
             case "FireballUp": case "FireballDown": 
                return 2;
            
            default:
                return 0;
    }
}

function generateRoleList(board, mode = 0) {
    // name, chess value, wwr value, incompatible with, requires, addsToWolves
    // all town pieces
	 /// !!!!!!! USE getWWRValue for town[2]/wolf[2]
    let town = [
        // pawn
        ["Citizen", 1, 0, [], "", ""],
        ["Ranger", 1, 1, [], "", ""],
        ["Huntress", 1, 5, [], "", ""],
        ["Fortune Apprentice", 1, 3, [], "", ""],
        ["Fortune Apprentice", 1, 3, [], "", ""], // double chance
        ["Child", 1, 2, [], "", ""],
        // king
        ["Idiot", 3, 1, [], ""],
        ["Crowd Seeker", 3, 2, ["Fortune Teller","Aura Teller"], "", ""],
        ["Aura Teller", 3, 2, ["Fortune Teller","Crowd Seeker"], "", ""],
        // knight
        ["Royal Knight", 3, 2, [], "", ""],
        ["Amnesiac", 3, 1, [], "", ""],
        ["Amnesiac", 3, 1, [], "", ""],
        // rook
        ["Fortune Teller", 5, 3, ["Crowd Seeker","Aura Teller"], "", ""],
        ["Runner", 5, 3, [], "", ""],
        ["Witch", 5, 2, [], "", ""],
    ];
    if(mode != 1) town.push(...[
        // king
        ["Hooker", 3, 4, [], "", ""],
        // knight
        ["Alcoholic", 3, 4, [], "Bartender", ""],
        // queen
        ["Cursed Civilian", 9, -3, [], "", ""],
    
    ]);
    if(mode == 2) town.push(...[
        ["Bard", 1, 1, [], "", ""],
        ["Butcher", 1, 0, [], "Bloody Butcher", "Packless Wolf"],
    ]);
    town.push(...[
        ["Bartender", 1, 4, [], "Alcoholic", ""],
        ["Bloody Butcher", 0, -6, [], "Butcher", ""],
        ["Bloody Butcher", 0, -6, [], "Butcher", ""],
    ]); // cant be rolled normally
    // all wolf pieces
    let wolf = [
        // pawn
        ["Wolf", 1, 0, [], ""],
        ["Wolf Cub", 1, 2, [], ""],
        ["Tanner", 1, 1, ["Sneaking Wolf"], ""],
        ["Archivist Fox", 1, 2, [], ""],
        ["Recluse", 1, 1, [], ""],
        ["Dog", 1, 2, ["Fox"], ""],
        // king
        ["Alpha Wolf", 3, 3, [], ""],
        ["Psychic Wolf", 3, 2, ["Clairvoyant Fox","Warlock"], ""],
        ["Sneaking Wolf", 3, 0, ["Tanner"], ""],
        // knight
        ["Clairvoyant Fox", 3, 3, ["Warlock","Psychic Wolf"], ""],
        ["Fox", 3, 0, ["Dog"], ""],
        // rook
        ["Scared Wolf", 5, 3, [], ""],
        ["Saboteur Wolf", 5, 3, ["Infecting Wolf"], ""],
        ["Warlock", 5, 3, ["Psychic Wolf","Clairvoyant Fox"], ""],
    ];
    if(mode != 1) wolf.push(...[
        // king
        ["Infecting Wolf", 3, 5, ["Saboteur Wolf"], ""],
        // knight
        ["Direwolf", 3, 3, [], ""],
        // queen
        ["White Werewolf", 9, 0, [], ""],
    ]);
    wolf.push(...[
        ["Packless Wolf", 1, 0, [], ""],
    ]); // cant be rolled normally
    // preparation
    let townSelected = [];
    let wolfSelected = [];
    let iterations = 0;
    let metadata = {};
    let avgTotalValue = 0;
    // attempt to select pieces
    while(iterations < 1000) {
        metadata = {};
        // select pieces TOWN
        townSelected = [];
        wolfSelected = [];
        let wolfOffset = 0;
        for(let i = 0; i < board[0].length; i++) {
            townSelected.push(town[Math.floor(Math.random() * (town.length-2))]);
            // add previous requirement if exists
            let prevReq = townSelected[townSelected.length - 1][4];
            let wolfAdd = townSelected[townSelected.length - 1][5];
            if(prevReq && prevReq.length) {
                townSelected.push(town.filter(el => el[0] == prevReq)[0]);
                i++;
            }
            if(wolfAdd && wolfAdd.length) {
                wolfSelected.push(wolf.filter(el => el[0] == wolfAdd)[0]);
                wolfOffset++;
            }
        }
        // select pieces WOLF
        for(let i = 0 + wolfOffset; i < board[0].length; i++) {
            wolfSelected.push(wolf[Math.floor(Math.random() * (wolf.length-1))]);
            // add previous requirement if exists
            let prevReq = wolfSelected[wolfSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                wolfSelected.push(wolf.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // EVALUATE setup
        // calculate values town
        let totalChessValueTown, totalWWRValueTown, totalValueTown, combinedIncompTown, totalChessValueWolf, totalWWRValueWolf, totalValueWolf, combinedIncompWolf;
        
        try { 
            totalChessValueTown = townSelected.map(el => el[1]).reduce((a,b) => a+b);
            totalWWRValueTown  = townSelected.map(el => el[2]).reduce((a,b) => a+b);
            totalValueTown = totalChessValueTown + totalWWRValueTown;
            combinedIncompTown = [].concat.apply([], townSelected.map(el => el[3]));
            // calculate values wolf
            totalChessValueWolf = wolfSelected.map(el => el[1]).reduce((a,b) => a+b);
            totalWWRValueWolf  = wolfSelected.map(el => el[2]).reduce((a,b) => a+b);
            totalValueWolf = totalChessValueWolf + totalWWRValueWolf;
            combinedIncompWolf = [].concat.apply([], wolfSelected.map(el => el[3]));
        } catch (err) {
            console.log("DISCARD", err);
            continue;
        }
        
        // special handling
        // town
        let townNames = townSelected.map(el => el[0]);
        // Double ALCOHOLIC
        if(townNames.filter(el => el=="Alcoholic").length > 1) {
            console.log("DISCARD - Double Alcoholic");
            continue;
        }
        // AMNESIAC
        if(townNames.indexOf("Amnesiac") > -1) { // find 
            let amnesiacCount = townNames.filter(el => el=="Amnesiac").length
            let amnesiacRole = town[Math.floor(Math.random() * town.length)];
            if(amnesiacRole[0] == "Amnesiac" || amnesiacRole[0] == "Bloody Butcher" || amnesiacRole[0] == "Butcher" || amnesiacRole[0] == "Bartender" || (amnesiacRole[0] == "Alcoholic" && townNames.indexOf("Alcoholic") == -1)) {
                console.log("DISCARD - Amnesiac");
                continue;
            }
            totalChessValueTown = totalChessValueTown - (amnesiacCount * 3) + (amnesiacCount * ((3 + amnesiacRole[1] * 3) / 4));
            totalWWRValueTown = totalWWRValueTown - (amnesiacCount * 1) + (amnesiacCount * ((1 + amnesiacRole[2] * 3) / 4));
            totalValueTown = totalChessValueTown + totalWWRValueTown;
            combinedIncompTown.push(...amnesiacRole[3]);
            metadata.amnesiac = amnesiacRole[0];
        }
        // FORTUNE APPRENTICE
        if(townNames.indexOf("Fortune Apprentice") > -1) { // find 
            let faCount = townNames.filter(el => el=="Fortune Apprentice").length
            let faRole;
            if(townNames.indexOf("Fortune Teller") > -1) faRole = town.filter(el => el[0]=="Fortune Teller")[0];
            else if(townNames.indexOf("Aura Teller") > -1) faRole = town.filter(el => el[0]=="Aura Teller")[0];
            else if(townNames.indexOf("Crowd Seeker") > -1) faRole = town.filter(el => el[0]=="Crowd Seeker")[0];
            else {
                console.log("DISCARD - Fortune Apprentice");
                continue;
            }
            totalChessValueTown = totalChessValueTown - (faCount * 3) + (faCount * ((3 + faRole[1]) / 2));
            totalWWRValueTown = totalWWRValueTown - (faCount * 1) + (faCount * ((1 + faRole[2]) / 2));
            totalValueTown = totalChessValueTown + totalWWRValueTown;
        }
        // wolf
        // Double TANNER
        let wolfNames = wolfSelected.map(el => el[0]);
        if(wolfNames.filter(el => el=="Tanner").length > 1) {
            console.log("DISCARD - Double Tanner");
            continue;
        }
        
        avgTotalValue = (totalValueTown + totalValueWolf) / 2.0;
        // condition
        if(
            //check if the setup doesnt have too much power
            totalChessValueTown <= (board[0].length*3) && totalWWRValueTown <= (board[0].length*2.4) && totalValueTown <= (board[0].length*4.6) && // town
            totalChessValueWolf <= (board[0].length*3) && totalWWRValueWolf <= (board[0].length*2.4) && totalValueWolf <= (board[0].length*4.6) && // wolf
            // check if the amount of selected roles is correct
            townSelected.length == board[0].length && wolfSelected.length == board[0].length && 
            // check if the teams have roughly the same power
            (totalChessValueTown >= totalChessValueWolf - 2 && totalChessValueWolf >= totalChessValueTown - 2) &&  // chess value, max of 2 off
            (totalWWRValueTown >= totalWWRValueWolf - 4 && totalWWRValueWolf >= totalWWRValueTown - 4) &&  // wwr value, max of 4 off
            (   // total value, depends on average total power
                (totalWWRValueTown >= totalWWRValueWolf - 1 && totalWWRValueWolf >= totalWWRValueTown - 1) ||
                (avgTotalValue >= 5 && totalWWRValueTown >= totalWWRValueWolf - 1.5 && totalWWRValueWolf >= totalWWRValueTown - 1.5) ||
                (avgTotalValue >= 10 && totalWWRValueTown >= totalWWRValueWolf - 2.5 && totalWWRValueWolf >= totalWWRValueTown - 2.5) ||
                (avgTotalValue >= 15  && totalWWRValueTown >= totalWWRValueWolf - 3 && totalWWRValueWolf >= totalWWRValueTown - 3)
            ) &&
            // check for incompatibilities
            combinedIncompTown.indexOf(townSelected[0]) == -1 && combinedIncompTown.indexOf(townSelected[1]) == -1 && combinedIncompTown.indexOf(townSelected[2]) == -1 && combinedIncompTown.indexOf(townSelected[3]) == -1 && combinedIncompTown.indexOf(townSelected[4]) == -1 &&
            combinedIncompWolf.indexOf(wolfSelected[0]) == -1 && combinedIncompWolf.indexOf(wolfSelected[1]) == -1 && combinedIncompWolf.indexOf(wolfSelected[2]) == -1 && combinedIncompWolf.indexOf(wolfSelected[3]) == -1 && combinedIncompWolf.indexOf(wolfSelected[4]) == -1
        ) {
            console.log("INCOMPATIBLE", combinedIncompTown);
            console.log("ACCEPT #" + iterations, totalChessValueTown, totalWWRValueTown, totalValueTown, townSelected.map(el=>el[0]).join(","), totalChessValueWolf, totalWWRValueWolf, totalValueWolf, wolfSelected.map(el=>el[0]).join(","));
            console.log("LIST METADATA", metadata);
            break;
        }
        console.log("DISCARD #" + iterations, totalChessValueTown, totalWWRValueTown, totalValueTown, townSelected.map(el=>el[0]).join(","), totalChessValueWolf, totalWWRValueWolf, totalValueWolf, wolfSelected.map(el=>el[0]).join(","));
        iterations++;
    }
    // randomize piece order
    townSelected = randomize(townSelected);
    wolfSelected = randomize(wolfSelected);
    // put pieces onto the board
    for(let i = 0; i < board[0].length; i++) {
        board[board.length-1][i] = getPiece(townSelected[i][0], metadata);
        board[0][i] = getPiece(wolfSelected[i][0], metadata);
    }
    return avgTotalValue;
}

// randomizes an array
function randomize(arr) {
    return arr .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
}

// setups a new game
const emptyBoard = [[getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)]];
function createGame(playerID, playerID2, playerID3, gameID, name1, name2, name3, channel, guild, soloArg = null, mode = "default", strengthModifier = 0) {
    
    // store players as playing players
    if(playerID) players.push([playerID, gameID]);
    if(playerID2) players.push([playerID2, gameID]);
    if(playerID3) players.push([playerID3, gameID]);
    
    switch(mode) {
        case "hexapawn": 
        case "pawnford": 
            height = 3, width = 3;
        break;
        case "pawnford_big": 
            height = 5, width = 5;
        break;
        default:
        case "default":
        case "simplified":
        case "advanced":
        case "minichess":
        case "boss_bat":
        case "boss_flute":
        case "boss_horseman":
            height = 5, width = 5;
        break;
        case "boss_ghast":
            height = 7, width = 5;
        break;
        case "boss_zombie":
            height = 8, width = 5;
        break;
        case "chess":
            height = 8, width = 8;
        break;
    }
    
    // create a blank new board
    let emptyRow = [];
    for(let i = 0; i < width; i++) {
        emptyRow.push(getPiece(null));
    }
    let newBoard = [];
    for(let i = 0; i < height; i++) {
        newBoard.push(deepCopy(emptyRow));
    }
    
    let newGame = {id: gameID, players: [ playerID, playerID2 ], playerNames: [ name1, name2 ], state: newBoard, turn: 0, normalTurn: 0, concluded: false, selectedPiece: null, doubleMove0: false, doubleMove1: false, inDoubleMove: false, ai: false, firstMove: false, aiOnly: false, height: height, width: width, doNotSerialize: false, prevMove: -1, reducedIterations: false, stupidChance: 0, mode: mode, aiModifier: strengthModifier };
 
    switch(mode) {
        default:
        case "advanced":
        case "simplified":
        case "default":
            // put pieces on board
            let listPower = 0;
            //listPower = generateRoleList(newBoard, mode=="simplified"?1:(mode=="advanced"?2:0));
            
            loadPromoteTestSetup(newBoard);
            break;
            //loadTestingSetup(newBoard);
            //loadDebugSetup(newBoard);
            
            // push game to list of games
            
            // add a solo
            if(name3 != null && height%2 == 1 && height >= 3 && mode != "simplified") { // seo: debug solo
                let solos = ["angel","flute","graveyard","underworld"];
                if(playerID3 == null) solos.push(...["apprentice"]);
                let selectedSoloIndex = Math.floor(Math.random() * solos.length);
                let selectedSoloName = solos[selectedSoloIndex];
                if(soloArg && soloArg.length) selectedSoloName = soloArg;
                let selectedSolo;
                //selectedSoloIndex = 3;
                switch(selectedSoloName) {
                    default: console.log("INVALID SOLO", soloArg, selectedSoloName); break;
                    case "angel": selectedSolo = ["Angel","Apprentice","Angel", false]; break;
                    case "flute": selectedSolo = ["Flute Player","Flute Player","Flute", true]; break;
                    case "graveyard": selectedSolo = ["Zombie","Corpse","Graveyard", true]; break;
                    case "underworld": selectedSolo = ["Vampire","Bat","Underworld", false]; break;
                    case "apprentice": selectedSolo = ["Apprentice","Angel","Apprentice", false]; break;
                    case "ghast": selectedSolo = ["Ghast","Ghast","Ghast", false]; break;
                }
                if(listPower > 20) { // list too powerful for just one solo
                    if(Math.random() < 0.5) {
                        newBoard[Math.floor(height/2)][0] = getPiece(selectedSolo[0]);
                        newBoard[Math.floor(height/2)][width - 1] = getPiece(selectedSolo[1]);
                    } else {
                        newBoard[Math.floor(height/2)][0] = getPiece(selectedSolo[1]);
                        newBoard[Math.floor(height/2)][width - 1] = getPiece(selectedSolo[0]);
                    }
                } else {
                    newBoard[Math.floor(height/2)][Math.floor(width/2)] = getPiece(selectedSolo[0]);
                }
                newGame.soloTeam = selectedSolo[2];
                newGame.soloDoubleTurns = selectedSolo[3];
                
                newGame.solo = true;
                newGame.soloRevealed = false;
                newGame.goldAscended = false;
                newGame.whiteEliminated = false, 
                newGame.blackEliminated = false, 
                newGame.goldEliminated = false, 
                newGame.players.push(playerID3);
                newGame.playerNames.push(name3);
            }
        break;
        case "boss_bat":
            // put pieces on board
            
            newBoard[4][0] = getPiece("Citizen");
            newBoard[4][1] = getPiece("Royal Knight");
            newBoard[4][2] = getPiece("Witch");
            newBoard[4][3] = getPiece("Hooker");
            newBoard[4][4] = getPiece("Huntress");
            
            newBoard[0][0] = getPiece("Undead");
            newBoard[0][1] = getPiece("Vampire");
            newBoard[0][2] = getPiece("Bat");
            newBoard[0][2].enemyVisibleStatus = 7;
            newBoard[0][3] = getPiece("Apprentice Vampire");
            newBoard[0][4] = getPiece("Undead");
            newBoard[0][0].protected = false;
            newBoard[0][1].protected = false;
            newBoard[0][2].protected = false;
            newBoard[0][3].protected = false;
            newBoard[0][4].protected = false;
        
        
            newGame.soloTeam = "Underworld";
            newGame.soloDoubleTurns = false;
            
            newGame.reducedIterations = true;
            
            newGame.solo = true;
            newGame.soloRevealed = false;
            newGame.goldAscended = false;
            newGame.whiteEliminated = false, 
            newGame.blackEliminated = false, 
            newGame.goldEliminated = false, 
            newGame.players.push(playerID3);
            newGame.playerNames.push(name3);
        
        break;
        case "boss_horseman":
        case "boss_horseman_reversed":
            // put pieces on board
            
            newBoard[0][0] = getPiece("Archivist Fox");
            newBoard[0][1] = getPiece("Sneaking Wolf");
            newBoard[0][2] = getPiece("Scared Wolf");
            newBoard[0][3] = getPiece("Alpha Wolf");
            newBoard[0][4] = getPiece("Dog");
            
            newBoard[3][2] = getPiece("Bloody Butcher");
 
            newBoard[4][0] = getPiece("Horseman of War");
            newBoard[4][1] = getPiece("Horseman of Pestilence");
            newBoard[4][2] = getPiece("Lamb");
            newBoard[4][3] = getPiece("Horseman of Famine");
            newBoard[4][4] = getPiece("Horseman of Death");
            newBoard[4][0].protected = false;
            newBoard[4][1].protected = false;
            newBoard[4][2].protected = false;
            newBoard[4][3].protected = false;
            newBoard[4][4].protected = false;
        
        
            newGame.soloTeam = "Horsemen";
            newGame.soloDoubleTurns = false;
            
            //newGame.reducedIterations = true;
            
            newGame.solo = true;
            newGame.soloRevealed = false;
            newGame.goldAscended = false;
            newGame.whiteEliminated = false, 
            newGame.blackEliminated = false, 
            newGame.goldEliminated = false, 
            newGame.players.push(playerID3);
            newGame.playerNames.push(name3);
        
        break;
        case "boss_flute":
            // put pieces on board
            
            newBoard[4][0] = getPiece("Bartender");
            newBoard[4][1] = getPiece("Alcoholic");
            newBoard[4][2] = getPiece("Witch");
            newBoard[4][3] = getPiece("Hooker");
            newBoard[4][4] = getPiece("Huntress");
            
            newBoard[0][1] = getPiece("Flute Player");
            newBoard[0][2] = getPiece("Flute Player");
            newBoard[0][3] = getPiece("Flute Player");
            newBoard[0][2].enemyVisibleStatus = 7;
            newBoard[0][2].protected = false;
        
        
            newGame.soloTeam = "Flute";
            newGame.soloDoubleTurns = true;
            
            newGame.reducedIterations = true;
            
            newGame.solo = true;
            newGame.soloRevealed = false;
            newGame.goldAscended = false;
            newGame.whiteEliminated = false, 
            newGame.blackEliminated = false, 
            newGame.goldEliminated = false, 
            newGame.players.push(playerID3);
            newGame.playerNames.push(name3);
        
        break;
        case "boss_ghast":
            // put pieces on board
            
            newBoard[6][0] = getPiece("Fortune Apprentice");
            //newBoard[6][1] = getPiece("Alcoholic");
            newBoard[6][2] = getPiece("Aura Teller");
            //newBoard[6][3] = getPiece("Royal Knight");
            //newBoard[6][4] = getPiece("Child");
            
            newBoard[3][0] = getPiece("Ghast");
            newBoard[3][0].enemyVisibleStatus = 7;
            newBoard[3][0].protected = false;
            newBoard[3][3] = getPiece("Ghast");
            newBoard[3][3].enemyVisibleStatus = 7;
            newBoard[3][3].protected = false;
            
            
            newBoard[2][0] = getPiece("FireballUp");
            newBoard[2][1] = getPiece("FireballUp");
            newBoard[4][1] = getPiece("FireballDown");
            newBoard[4][2] = getPiece("FireballDown");
            newBoard[4][3] = getPiece("FireballDown");
            newBoard[5][0] = getPiece("FireballDown");
            newBoard[6][4] = getPiece("FireballDown");
        
        
            newGame.soloTeam = "Ghast";
            newGame.soloDoubleTurns = false;
            
            //newGame.reducedIterations = true;
            
            newGame.solo = true;
            newGame.soloRevealed = false;
            newGame.goldAscended = false;
            newGame.whiteEliminated = false, 
            newGame.blackEliminated = false, 
            newGame.goldEliminated = false, 
            newGame.players.push(playerID3);
            newGame.playerNames.push(name3);
        
        break;
        case "boss_zombie":
            // put pieces on board
            
            newBoard[7][0] = getPiece("Hooker");
            newBoard[7][1] = getPiece("Fortune Teller");
            newBoard[7][2] = getPiece("Royal Knight");
            newBoard[7][3] = getPiece("Witch");
            newBoard[7][4] = getPiece("Idiot");
            
            newBoard[0][0] = getPiece("Zombie");
            newBoard[0][0].zombieID = 1;
            newBoard[0][0].zombieParent = 1;
            newBoard[0][0].zombieChildCount = 5;
            newBoard[0][1] = getPiece("Zombie2");
            newBoard[0][1].zombieID = 12;
            newBoard[0][1].zombieParent = 1;
            newBoard[0][1].zombieChildCount = 1;
            newBoard[0][2] = getPiece("Zombie2");
            newBoard[0][2].zombieID = 11;
            newBoard[0][2].zombieParent = 1;
            newBoard[0][2].zombieChildCount = 1;
            newBoard[0][3] = getPiece("Zombie2");
            newBoard[0][3].zombieID = 13;
            newBoard[0][3].zombieParent = 1;
            newBoard[0][3].zombieChildCount = 1;
            newBoard[0][4] = getPiece("Zombie2");
            newBoard[0][4].zombieID = 14;
            newBoard[0][4].zombieParent = 1;
            newBoard[0][4].zombieChildCount = 1;
            newBoard[1][0] = getPiece("Zombie3");
            newBoard[1][0].zombieID = 121;
            newBoard[1][0].zombieParent = 12;
            newBoard[1][0].zombieChildCount = 1;
            newBoard[1][1] = getPiece("Zombie3");
            newBoard[1][1].zombieID = 111;
            newBoard[1][1].zombieParent = 11;
            newBoard[1][1].zombieChildCount = 1;
            newBoard[1][2] = getPiece("Zombie3");
            newBoard[1][2].zombieID = 15;
            newBoard[1][2].zombieParent = 1;
            newBoard[1][2].zombieChildCount = 1;
            newBoard[1][3] = getPiece("Zombie3");
            newBoard[1][3].zombieID = 141;
            newBoard[1][3].zombieParent = 14;
            newBoard[1][3].zombieChildCount = 1;
            newBoard[1][4] = getPiece("Zombie3");
            newBoard[1][4].zombieID = 1111;
            newBoard[1][4].zombieParent = 111;
            newBoard[1][4].zombieChildCount = 1;
            newBoard[2][0] = getPiece("Zombie4");
            newBoard[2][0].zombieID = 131;
            newBoard[2][0].zombieParent = 13;
            newBoard[2][0].zombieChildCount = 1;
            newBoard[2][1] = getPiece("Zombie4");
            newBoard[2][1].zombieID = 151;
            newBoard[2][1].zombieParent = 15;
            newBoard[2][1].zombieChildCount = 1;
            newBoard[2][2] = getPiece("Zombie4");
            newBoard[2][2].zombieID = 1211;
            newBoard[2][2].zombieParent = 121;
            newBoard[2][2].zombieChildCount = 1;
            newBoard[2][3] = getPiece("Zombie4");
            newBoard[2][3].zombieID = 1311;
            newBoard[2][3].zombieParent = 131;
            newBoard[2][3].zombieChildCount = 1;
            newBoard[2][4] = getPiece("Zombie4");
            newBoard[2][4].zombieID = 1411;
            newBoard[2][4].zombieParent = 141;
            newBoard[2][4].zombieChildCount = 1;
            newBoard[3][0] = getPiece("Zombie5");
            newBoard[3][0].zombieID = 12111;
            newBoard[3][0].zombieParent = 1211;
            newBoard[3][0].zombieChildCount = 0;
            newBoard[3][1] = getPiece("Zombie5");
            newBoard[3][1].zombieID = 11111;
            newBoard[3][1].zombieParent = 1111;
            newBoard[3][1].zombieChildCount = 0;
            newBoard[3][2] = getPiece("Zombie5");
            newBoard[3][2].zombieID = 1511;
            newBoard[3][2].zombieParent = 151;
            newBoard[3][2].zombieChildCount = 1;
            newBoard[3][3] = getPiece("Zombie5");
            newBoard[3][3].zombieID = 14111;
            newBoard[3][3].zombieParent = 1411;
            newBoard[3][3].zombieChildCount = 0;
            newBoard[3][4] = getPiece("Zombie5");
            newBoard[3][4].zombieID = 13111;
            newBoard[3][4].zombieParent = 1311;
            newBoard[3][4].zombieChildCount = 0;
            newBoard[3][0].protected = false;
            newBoard[3][1].protected = false;
            newBoard[3][2].protected = false;
            newBoard[3][3].protected = false;
            newBoard[3][4].protected = false;
        
        
            newGame.soloTeam = "Graveyard";
            newGame.soloDoubleTurns = false;
            
            //newGame.reducedIterations = true;
            
            newGame.solo = true;
            newGame.soloRevealed = false;
            newGame.goldAscended = false;
            newGame.whiteEliminated = false, 
            newGame.blackEliminated = false, 
            newGame.goldEliminated = false, 
            newGame.players.push(playerID3);
            newGame.playerNames.push(name3);
        
        break;
        case "hexapawn":
            newBoard[0][0] = getPiece("Black Pawn");
            newBoard[0][1] = getPiece("Black Pawn");
            newBoard[0][2] = getPiece("Black Pawn");
            newBoard[2][0] = getPiece("White Pawn");
            newBoard[2][1] = getPiece("White Pawn");
            newBoard[2][2] = getPiece("White Pawn");
        break;
        case "pawnford":
            newBoard[0][0] = getPiece("Black Pawn");
            newBoard[0][1] = getPiece("Black Pawn");
            newBoard[0][2] = getPiece("Black Pawn");
            newBoard[2][0] = getPiece("White Pawn");
            newBoard[2][1] = getPiece("White Pawn");
            newBoard[2][2] = getPiece("White Pawn");
            
            newGame.stupidChance = 0.66;
            if(newGame.players[0] == null) newGame.playerNames[0] = "The Mayor";
            if(newGame.players[1] == null) newGame.playerNames[1] = "The Mayor";
        break;
        case "pawnford_big":
            newBoard[0][0] = getPiece("Black Pawn");
            newBoard[0][1] = getPiece("Black Pawn");
            newBoard[0][2] = getPiece("Black Pawn");
            newBoard[0][3] = getPiece("Black Pawn");
            newBoard[0][4] = getPiece("Black Pawn");
            newBoard[4][0] = getPiece("White Pawn");
            newBoard[4][1] = getPiece("White Pawn");
            newBoard[4][2] = getPiece("White Pawn");
            newBoard[4][3] = getPiece("White Pawn");
            newBoard[4][4] = getPiece("White Pawn");
            
            //newGame.stupidChance = 0.66;
            if(newGame.players[0] == null) newGame.playerNames[0] = "The Mayor";
            if(newGame.players[1] == null) newGame.playerNames[1] = "The Mayor";
        break;
        case "minichess":
            newBoard[0][0] = getPiece("Black Rook");
            newBoard[0][1] = getPiece("Black Knight");
            newBoard[0][2] = getPiece("Black Bishop");
            newBoard[0][3] = getPiece("Black Queen");
            newBoard[0][4] = getPiece("Black King");
            newBoard[1][0] = getPiece("Black Pawn");
            newBoard[1][1] = getPiece("Black Pawn");
            newBoard[1][2] = getPiece("Black Pawn");
            newBoard[1][3] = getPiece("Black Pawn");
            newBoard[1][4] = getPiece("Black Pawn");
            
            newBoard[4][0] = getPiece("White Rook");
            newBoard[4][1] = getPiece("White Knight");
            newBoard[4][2] = getPiece("White Bishop");
            newBoard[4][3] = getPiece("White Queen");
            newBoard[4][4] = getPiece("White King");
            newBoard[3][0] = getPiece("White Pawn");
            newBoard[3][1] = getPiece("White Pawn");
            newBoard[3][2] = getPiece("White Pawn");
            newBoard[3][3] = getPiece("White Pawn");
            newBoard[3][4] = getPiece("White Pawn");
        break;
        case "chess":
            newBoard[0][0] = getPiece("Black Rook");
            newBoard[0][1] = getPiece("Black Knight");
            newBoard[0][2] = getPiece("Black Bishop");
            newBoard[0][3] = getPiece("Black Queen");
            newBoard[0][4] = getPiece("Black King");
            newBoard[0][5] = getPiece("Black Bishop");
            newBoard[0][6] = getPiece("Black Knight");
            newBoard[0][7] = getPiece("Black Rook");
            newBoard[1][0] = getPiece("Black Pawn");
            newBoard[1][1] = getPiece("Black Pawn");
            newBoard[1][2] = getPiece("Black Pawn");
            newBoard[1][3] = getPiece("Black Pawn");
            newBoard[1][4] = getPiece("Black Pawn");
            newBoard[1][5] = getPiece("Black Pawn");
            newBoard[1][6] = getPiece("Black Pawn");
            newBoard[1][7] = getPiece("Black Pawn");
            
            newBoard[7][0] = getPiece("White Rook");
            newBoard[7][1] = getPiece("White Knight");
            newBoard[7][2] = getPiece("White Bishop");
            newBoard[7][3] = getPiece("White Queen");
            newBoard[7][4] = getPiece("White King");
            newBoard[7][5] = getPiece("White Bishop");
            newBoard[7][6] = getPiece("White Knight");
            newBoard[7][7] = getPiece("White Rook");
            newBoard[6][0] = getPiece("White Pawn");
            newBoard[6][1] = getPiece("White Pawn");
            newBoard[6][2] = getPiece("White Pawn");
            newBoard[6][3] = getPiece("White Pawn");
            newBoard[6][4] = getPiece("White Pawn");
            newBoard[6][5] = getPiece("White Pawn");
            newBoard[6][6] = getPiece("White Pawn");
            newBoard[6][7] = getPiece("White Pawn");
        break;
    }
    
    games.push(newGame);
    // store some data separately because we dont need to always deep copy it
    gamesHistory.push({ id: gameID, history: [], lastMoves: [], sinceCapture: 0 }); // history data
    gamesInterfaces.push({ id: gameID, channel: channel, guild: guild, spectator: { type: "spectator", msg: null }, interfaces: [], lastInteraction: null, lastInteractionTurn: null, lastMove: Date.now() }); // discord related data
}


// a testing setup where two pieces are one rank away from promoting
function loadPromoteTestSetup(board) {
    board[1][0] = getPiece("Citizen");
    board[board.length-2][4] = getPiece("Wolf");
}

function loadTestingSetup(board) {
    let testTown = "Runner";
    let testWolf = "Packless Wolf";
    board[board.length-1][0] = getPiece(testTown);
    board[board.length-1][1] = getPiece(testTown);
    board[board.length-1][2] = getPiece(testTown);
    board[board.length-1][3] = getPiece(testTown);
    board[board.length-1][4] = getPiece(testTown);
    board[0][0] = getPiece(testWolf);
    board[0][1] = getPiece("Wolf");
    board[0][2] = getPiece(testWolf);
    board[0][3] = getPiece(testWolf);
    board[0][4] = getPiece(testWolf);
}


// 0 -> unknown / likely knight
// 1 -> likely pawn
// 2 -> likely king
// 3 -> likely rook / king
// 4 -> piece known
// 5 -> active ability known
// 6 -> role known (disguise affected)
// 7 -> role known (disguise unaffected)
function loadDebugSetup(board) {
    // Location, Name, EnemyVisible, EnemyVisibleStatus
    let pieces = [
        ["B3", "Archivist Fox", "LikelyPawn", 1],
        ["C3", "Idiot", "Idiot", 7],
        ["A5", "Child", "Child", 7],
    ];
    for(let p in pieces) {
        let coords = nameToXY(pieces[p][0]);
        board[coords.y][coords.x] = getPiece(pieces[p][1]);
        board[coords.y][coords.x].enemyVisible = pieces[p][2];
        board[coords.y][coords.x].enemyVisibleStatus = pieces[p][3];
    }
}

// destroys a game
function destroyGame(id) {
    console.log("DESTROY", id);
    players = players.filter(el => el[1] != id); // delete players from playing players
    // in a previous version of the code it would filter out the game that is getting destroyed, causing other games to go into the place of that game and potentially also getting destroyed. Thus is now only replaces them with null and only clears them out of the game array completely if the entire array is empty anyway
    games[id] = null;
    gamesHistory[id] = null;
    gamesInterfaces[id] = null;
    if(games.filter(el => el != null).length == 0) {
        games = [];
        gamesHistory = [];
        gamesInterfaces = [];
    }
}

// concludes a game (reveals all pieces)
function concludeGame(id) {
    console.log("CONCLUDE", id);
    let concludedGame = games[id];
    if(!concludedGame || !concludedGame.state) return;
    for(let y = 0; y < games[id].height; y++) {
        for(let x = 0; x < games[id].width; x++) {
            concludedGame.state[y][x].enemyVisibleStatus = 7;
        }
    }
    concludedGame.concluded = true;
    
    console.log("CONCLUDE UPDATE", id);
    // Update Spectator Board
    updateSpectatorBoard(id);
}

// turn = 0 for town, 1 for wolves
function showMoves(gameID, turn, abilities = false, message = "") {
    let currentGame = games[gameID];
    let board = renderBoard(currentGame, message);
    let interactions;
    if(!abilities) {
        interactions = generateInteractions(currentGame.state, turn);
        interactions.sort((a,b) => (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0));
    } else {
        interactions = [{ type: 2, label: "Skip", style: 4, custom_id: "turnmove" }];
        let abilities = generateAbilities(currentGame, turn);
        abilities.sort((a,b) => (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0));
        interactions.push(...abilities);
    }
    let components = [ { type: 1, components: interactions.slice(0, 5) } ];
    if(interactions.length > 5) components.push({ type: 1, components: interactions.slice(5, 10) });
    if(interactions.length > 10) components.push({ type: 1, components: interactions.slice(10, 15) });
    if(interactions.length > 15) components.push({ type: 1, components: interactions.slice(15, 20) });
    return { content: board, ephemeral: true, fetchReply: true, components: components }
}

function isPawn(name) {
    return name.chess === "Pawn";
}

function getUnicode(chessName, team) {
    switch(chessName) {
        case "Pawn":
            return team==1?"♙":(team==0?"♟︎":"♙");
        case "King":
            return team==1?"♔":(team==0?"♚":"♔");
        case "Knight":
            return team==1?"♘":(team==0?"♞":"♘");
        case "Bishop":
            return team==1?"♗":(team==0?"♝":"♗");
        case "Rook":
            return team==1?"♖":(team==0?"♜":"♖");
        case "Queen":
            return team==1?"♕":(team==0?"♛":"♕");
        case "None":
            return team==1?"◼️":(team==0?"◻️":"◼️");
        case "Prince":
            return team==1?"◼️":(team==0?"◻️":"◼️");
    }
}

function numToRank(num) {
    return "ABCDEFGHIJKLMNOP"[num];
}

function rankToNum(rank) {
    return "ABCDEFGHIJKLMNOP".indexOf(rank);
}

function xyToName(x, y) {
    return numToRank(x) + (y+1);
}

function nameToXY(name) {
    return { x: rankToNum(name[0]), y: (+name.substr(1))-1 };
}

function inBoundsX(w, x) {
    return x>=0 && x<=w-1;
}
function inBoundsY(h, y) {
    return y>=0 && y<=h-1;
}

function inBounds(w, h, x, y) {
    return inBoundsX(w, x) && inBoundsY(h, y);
}

function inBoundsInv(h, w, y, x) {
    return inBoundsX(w, x) && inBoundsY(h, y);
}

// determines whether a piece can take other pieces
function canTakePieces(pieceName) {
    switch(pieceName) {
        default:
            return true;
        case "Flute Player": case "Angel": case "Vampire": case "Apprentice Vampire":
            return false;
    }
}

function checkEnemy(piece, team) {
    return piece.name != null && enemyTeam(team, piece.team);
}

function generatePositions(board, position, hideLog = false, pieceTypeOverride = null) {
    //BENCHMARK timeSpentChecking -= Date.now();
    let positions = [];
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    if(!hideLog) console.log("Finding moves for ", piece.name, " @ ", x, "|", numToRank(x), " ", y);
    const pieceTeam = piece.team;
    const pieceType = pieceTypeOverride ? pieceTypeOverride : piece.chess;
    const boardSize = Math.max(board.length, board[0].length);
    const canTake = canTakePieces(piece.name);
    let temp, xp = x+1, xm = x-1, yp = y+1, ym = y-1, bl = board.length, b0l = board[0].length;
    // Movement Logic
    // cannot move
    if(piece.sabotaged) {
        positions = [];
    } else if(piece.stay) {
        positions = [[x, y]];
    }
    else {
        switch(pieceType) {
            /* PAWN */
            case "Pawn": {
                switch(pieceTeam) {
                    case 0: { // White Pawn
                        if(y>0) {
                            if(board[ym][x].name == null) positions.push([x, ym]);
                            if(canTake && x>0 && checkEnemy(board[ym][xm], pieceTeam)) positions.push([xm, ym, true]);
                            if(canTake && x<(b0l-1) && checkEnemy(board[ym][xp], pieceTeam)) positions.push([xp, ym, true]);
                        }        
                    } break;
                    case 1: { // Black Pawn
                        if(y<(bl-1)) {
                            if(board[yp][x].name == null) positions.push([x, yp]);
                            if(canTake && x>0 && checkEnemy(board[yp][xm], pieceTeam)) positions.push([xm, yp, true]);
                            if(canTake && x<(b0l-1) && checkEnemy(board[yp][xp], pieceTeam)) positions.push([xp, yp, true]);
                        }    
                    } break;
                    case 2: { // GoldPawn
                        if(y>0) {
                            if(board[ym][x].name == null) positions.push([x, ym]);
                            if(canTake && x>0 && checkEnemy(board[ym][xm], pieceTeam)) positions.push([xm, ym, true]);
                            if(canTake && x<(b0l-1) && checkEnemy(board[ym][xp], pieceTeam)) positions.push([xp, ym, true]);
                        }         
                        if(y<(bl-1)) {
                            if(board[yp][x].name == null) positions.push([x, yp]);
                            if(canTake && x>0 && checkEnemy(board[yp][xm], pieceTeam)) positions.push([xm, yp, true]);
                            if(canTake && x<(b0l-1) && checkEnemy(board[yp][xp], pieceTeam)) positions.push([xp, yp, true]);
                        }         
                    } break;
                }
            } break;
            /* ROOK */
            case "Rook": {
                for(let xt1 = xp; xt1 < b0l; xt1++) {
                    if(inBoundsX(b0l, xt1)) {
                        if(board[y][xt1].name == null) { // can move there
                            positions.push([xt1, y]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[y][xt1].team)) { // can take there
                            positions.push([xt1, y, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let xt2 = xm; xt2 >= 0; xt2--) {
                    if(inBoundsX(b0l, xt2)) {
                        if(board[y][xt2].name == null) { // can move there
                            positions.push([xt2, y]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[y][xt2].team)) { // can take there
                            positions.push([xt2, y, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let yt1 = yp; yt1 < bl; yt1++) {
                    if(inBoundsY(bl, yt1)) {
                        if(board[yt1][x].name == null) { // can move there
                            positions.push([x, yt1]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yt1][x].team)) { // can take there
                            positions.push([x, yt1, true]);
                            break;
                        } 
                    }
                    break;// break if cant move or take there
                }
                for(let yt2 = ym; yt2 >= 0; yt2--) {
                    if(inBoundsY(bl, yt2)) {
                        if(board[yt2][x].name == null) { // can move there
                            positions.push([x, yt2]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yt2][x].team)) { // can take there
                            positions.push([x, yt2, true]);
                            break;
                        } 
                    }
                    break;// break if cant move or take there
                }
            } break;
            /* QUEEN */
            case "Queen": {
                for(let xt1 = xp; xt1 < b0l; xt1++) {
                    if(inBoundsX(b0l, xt1)) {
                        if(board[y][xt1].name == null) { // can move there
                            positions.push([xt1, y]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[y][xt1].team)) { // can take there
                            positions.push([xt1, y, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let xt2 = xm; xt2 >= 0; xt2--) {
                    if(inBoundsX(b0l, xt2)) {
                        if(board[y][xt2].name == null) { // can move there
                            positions.push([xt2, y]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[y][xt2].team)) { // can take there
                            positions.push([xt2, y, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let yt1 = yp; yt1 < bl; yt1++) {
                    if(inBoundsY(bl, yt1)) {
                        if(board[yt1][x].name == null) { // can move there
                            positions.push([x, yt1]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yt1][x].team)) { // can take there
                            positions.push([x, yt1, true]);
                            break;
                        } 
                    }
                    break;// break if cant move or take there
                }
                for(let yt2 = ym; yt2 >= 0; yt2--) {
                    if(inBoundsY(bl, yt2)) {
                        if(board[yt2][x].name == null) { // can move there
                            positions.push([x, yt2]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yt2][x].team)) { // can take there
                            positions.push([x, yt2, true]);
                            break;
                        } 
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x+offset, yof = y+offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x-offset, yof = y+offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x+offset, yof = y-offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x-offset, yof = y-offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
            } break;
            /* BISHOP */
            case "Bishop": {
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x+offset, yof = y+offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x-offset, yof = y+offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x+offset, yof = y-offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
                for(let offset = 1; offset < boardSize; offset++) {
                    let xof = x-offset, yof = y-offset;
                    if(inBounds(b0l, bl, xof, yof)) {
                        if(board[yof][xof].name == null) { // can move there
                            positions.push([xof, yof]);
                            continue;
                        } else if(canTake && enemyTeam(pieceTeam, board[yof][xof].team)) { // can take there
                            positions.push([xof, yof, true]);
                            break;
                        }
                    }
                    break; // break if cant move or take there
                }
            } break;
            /* KING */
            case "King": {
                let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]; // possible movements
                for(let i = 0; i < possibleMoves.length; i++) {
                    let px = x + possibleMoves[i][0];
                    let py = y + possibleMoves[i][1];
                    if(inBounds(b0l, bl, px, py)) {
                        if(board[py][px].name == null) positions.push([px, py]); // can move
                        else if(canTake && enemyTeam(pieceTeam, board[py][px].team)) positions.push([px, py, true]); // can take
                    }
                }
            } break;
            /* PRINCE */
            case "Prince": {
                let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1]]; // possible movements
                for(let i = 0; i < possibleMoves.length; i++) {
                    let px = x + possibleMoves[i][0];
                    let py = y + possibleMoves[i][1];
                    if(inBounds(b0l, bl, px, py)) {
                        if(board[py][px].name == null) positions.push([px, py]); // can move
                        else if(canTake && enemyTeam(pieceTeam, board[py][px].team)) positions.push([px, py, true]); // can take
                    }
                }
            } break;
            /* KNIGHT */
            case "Knight": {
                let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]; // possible movements
                for(let i = 0; i < possibleMoves.length; i++) {
                    let px = x + possibleMoves[i][0];
                    let py = y + possibleMoves[i][1];
                    if(inBounds(b0l, bl, px, py)) {
                        if(board[py][px].name == null) positions.push([px, py]); // can move
                        else if(canTake && enemyTeam(pieceTeam, board[py][px].team)) positions.push([px, py, true]); // can take
                    }
                }
            } break;
        }
    }
    if(hideLog) positions.sort((a,b) => (xyToName(a[0], a[1]) > xyToName(b[0], b[1])) ? 1 : ((xyToName(b[0], b[1]) > xyToName(a[0], a[1])) ? -1 : 0));
    //BENCHMARK timeSpentChecking += Date.now();
    return positions;
}

function hasAvailableMove(board, position) {
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    const pieceTeam = piece.team;
    const pieceType = piece.chess;
    const boardSize = Math.max(board.length, board[0].length);
    const canTake = canTakePieces(piece.name);
    // Movement Logic
    if(!canTake) {
        let positions = generatePositions(board, xyToName(x, y), true);
        if(positions.length >= 1) return true;
        else return false;
    } else if(piece.sabotaged) {
        return false;
    }
    /* PAWN */
    else if(pieceType == "Pawn" && pieceTeam == 0) {
        if(y>0) {
            if(board[y-1][x].name == null) return true;
            if(x>0 && board[y-1][x-1].name != null && enemyTeam(pieceTeam, board[y-1][x-1].team)) return true;
            if(x<(board[0].length-1) && board[y-1][x+1].name != null && enemyTeam(pieceTeam, board[y-1][x+1].team)) return true;
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 1) {
        if(y<(board.length-1)) {
            if(board[y+1][x].name == null) return true;
            if(x>0 && board[y+1][x-1].name != null && enemyTeam(pieceTeam, board[y+1][x-1].team)) return true;
            if(x<(board[0].length-1) && board[y+1][x+1].name != null && enemyTeam(pieceTeam, board[y+1][x+1].team)) return true;
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 2) {
        if(y>0) {
            if(board[y-1][x].name == null) return true;
            if(x>0 && board[y-1][x-1].name != null && enemyTeam(pieceTeam, board[y-1][x-1].team)) return true;
            if(x<(board[0].length-1) && board[y-1][x+1].name != null && enemyTeam(pieceTeam, board[y-1][x+1].team)) return true;
        }
        if(y<(board.length-1)) {
            if(board[y+1][x].name == null) return true;
            if(x>0 && board[y+1][x-1].name != null && enemyTeam(pieceTeam, board[y+1][x-1].team)) return true;
            if(x<(board[0].length-1) && board[y+1][x+1].name != null && enemyTeam(pieceTeam, board[y+1][x+1].team)) return true;
        }             
    } 
    /* ROOK */
    else if(pieceType == "Rook") {
        for(let xt1 = x+1; xt1 < board[0].length; xt1++) {
            if(inBoundsX(board[0].length, xt1) && board[y][xt1].team != pieceTeam) {
                return true;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBoundsX(board[0].length, xt2) && board[y][xt2].team != pieceTeam) {
                return true;
            }
        }
        for(let yt1 = y+1; yt1 < board.length; yt1++) {
            if(inBoundsY(board.length, yt1) && board[yt1][x].team != pieceTeam) {
                return true;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBoundsY(board.length, yt2) && board[yt2][x].team != pieceTeam) {
                return true;
            }
        }
    } /* QUEEN */
    else if(pieceType == "Queen") {
        for(let xt1 = x+1; xt1 < board[0].length; xt1++) {
            if(inBoundsX(board[0].length, xt1) && board[y][xt1].team != pieceTeam) {
                return true;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBoundsX(board[0].length, xt2) && board[y][xt2].team != pieceTeam) {
                return true;
            }
        }
        for(let yt1 = y+1; yt1 < board.length; yt1++) {
            if(inBoundsY(board.length, yt1) && board[yt1][x].team != pieceTeam) {
                return true;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBoundsY(board.length, yt2) && board[yt2][x].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y+offset) && board[y+offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y+offset) && board[y+offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y-offset) && board[y-offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y-offset) && board[y-offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
    } /* BISHOP */
    else if(pieceType == "Bishop") {
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y+offset) && board[y+offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y+offset) && board[y+offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y-offset) && board[y-offset][x+offset].team != pieceTeam) {
                return true;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y-offset) && board[y-offset][x-offset].team != pieceTeam) {
                return true;
            }
        }
    }
    /* KING */
    else if(pieceType == "King") {
        let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(board[0].length, board.length, px, py) && board[py][px].team != pieceTeam) return true;
        }
    }
    /* PRINCE */
    else if(pieceType == "Prince") {
        let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(board[0].length, board.length, px, py) && board[py][px].team != pieceTeam) return true;
        }
    }
    /* KNIGHT */
    else if(pieceType == "Knight") {
        let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(board[0].length, board.length, px, py) && board[py][px].team != pieceTeam) return true;
        }
    }
    return false;
}

function interactionsFromPositions(positions, from, back = "turnstart", action = "move", styleOverride = false) {
    let interactions = [{ type: 2, label: "Back", style: 4, custom_id: back }];
    for(let i = 0; i < positions.length; i++) {
        interactions.push({ type: 2, label: xyToName(positions[i][0], positions[i][1]) + (positions[i][2]?" ✘":""), style:  styleOverride?styleOverride:(positions[i][2]?3:1), custom_id: action + "-" + from + "-" + xyToName(positions[i][0], positions[i][1]) });
    }
    let interactionsOutput = [];
    let interactionsTemp = [];
    for(let i = 0; i < interactions.length; i++) {
        interactionsTemp.push(interactions[i]);
        if(interactionsTemp.length == 5) {
            interactionsOutput.push({ type: 1, components: interactionsTemp });
            interactionsTemp = [];
        }
    }
    if(interactionsTemp.length > 0) interactionsOutput.push({ type: 1, components: interactionsTemp });
    return interactionsOutput;
}


function generateInteractions(board, team) {
    let interactions = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == team && !board[y][x].sabotaged) {
                let pname = board[y][x].name;
                if(pname == "Bloody Butcher") pname = "Butcher";
                interactions.push({ type: 2, label: xyToName(x, y) + " " + pname + " " + getUnicode(board[y][x].chess, team), style: isPawn(board[y][x]) ? 2 : 1, custom_id: "select-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function generateAbilities(game, team) {
    let interactions = [];
    let board = game.state;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(board[y][x].team == team && board[y][x].active && !board[y][x].sabotaged && !board[y][x].enchanted) {
                let possibleAbilityUsages = getAbilityTargets(game, board[y][x], xyToName(x, y));
                if(possibleAbilityUsages[0].components.length > 1) { // possible action (back is always available)
                    interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: 3, custom_id: "ability-" + xyToName(x, y) });
                }
            }
            if(board[y][x].name == "Bloody Butcher" && team == 1 && !board[y][x].sabotaged && !board[y][x].enchanted) {
                let possibleAbilityUsages = getAbilityTargets(game, board[y][x], xyToName(x, y));
                if(possibleAbilityUsages[0].components.length > 1) { // possible action (back is always available)
                    interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: 3, custom_id: "ability-" + xyToName(x, y) });
                }
            }
        }
    }
    return interactions;
}

function round2dec(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function renderBoard(game, message = "Turn", turnOverride = null) {
    let board = game.state;
    let gameHistory = gamesHistory[game.id];
    let debugValues = "";
    //debugValues = " ⬜" + round2dec(evaluate(0, game)) + " ⬛" + round2dec(evaluate(1, game)) + (game.solo ? " 🟧" + round2dec(evaluate(2, game)) : "");
    let boardMsg = "**⬜ " + game.playerNames[0] + (game.playerNames[1] != null ? " vs. ⬛ " + game.playerNames[1] : "") + (game.playerNames.length == 3 ? " vs. 🟧 " + game.playerNames[2] : "")  + "**\n" + "**" + message + "**" + debugValues + "\n";
    let boardRows = ["🟦"];
    let visiblePieces = [];
    const letterRanks = ["🇦","🇧","🇨","🇩","​🇪","🇫","🇬","🇭","🇮","🇯","🇰","🇱","🇲","🇳","🇴","🇵"];
    const numberRow = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟",findEmoji("eleven"),findEmoji("twelve"),findEmoji("thirteen"),findEmoji("fourteen"),findEmoji("fifteen"),findEmoji("sixteen")];
    const curTurn = turnOverride != null ? turnOverride : game.turn;
    let bloodyButcher = false;
    // create top letter row
    for(let i = 0; i < game.width; i++) {
        boardRows[0] += letterRanks[i] + "​"; // seperate with zero width space
    }
    // iterate through board
    let invulSolo = false;
    let soloAffectedRoles = [];
    for(let y = 0; y < game.height; y++) {
        let row = numberRow[y];
        for(let x = 0; x < game.width; x++) {
                row += renderField(board[y][x], x, y, curTurn);
                if(curTurn == 1 && board[y][x].name == "Bloody Butcher") bloodyButcher = true;
                if(board[y][x].name != null && board[y][x].soloEffect == true) soloAffectedRoles.push(xyToName(x, y));
                if(board[y][x].team == 2 && board[y][x].enemyVisibleStatus == 0 && board[y][x].protected == true) invulSolo = true; // look for solos on turn 1
                if(board[y][x].name != null && board[y][x].team == curTurn) visiblePieces.push(board[y][x].name);
                else if(board[y][x].name != null && board[y][x].team != curTurn && board[y][x].enemyVisibleStatus == 6) visiblePieces.push(board[y][x].disguise?board[y][x].disguise:board[y][x].name);
                else if(board[y][x].name != null && board[y][x].team != curTurn && board[y][x].enemyVisibleStatus == 7) visiblePieces.push(board[y][x].name);
        }
        boardRows.push(row);
        row = "";
    }
    const boardSize = Math.max(board.length, board[0].length);
    if(boardSize <= 6) {
        // display last moves
        for(let i = 0; i < boardRows.length; i++) {
            boardRows[i] += "🟦";
            if(i == 0) {
                boardRows[i] += "🟦🟦🟦🟦🟦🟦🟦";
            } else {
                let lmIndex = gameHistory.lastMoves.length - i;
                if(gameHistory.lastMoves[lmIndex]) {
                    let lmMsg = "";
                    let lm = gameHistory.lastMoves[lmIndex];
                    let moveFrom = nameToXY(lm[4]);
                    let moveTo = nameToXY(lm[5]);
                    if(lm[0] == 0) lmMsg += "⬜"; 
                    else if(lm[0] == 1) lmMsg += "⬛";
                    else if(lm[0] == 2) lmMsg += "🟧";
                    if(lm[0] == curTurn && getTeam(lm[1]) == curTurn && lm[1] == "Bloody Butcher") lmMsg += findEmoji("Butcher");
                    else if(curTurn == 1 && lm[1] == "Bloody Butcher") lmMsg += findEmoji(lm[1]);
                    else if(lm[6] == 6 && lm[2]) lmMsg += findEmoji(lm[2]);
                    else if((lm[0] == curTurn && getTeam(lm[1]) == curTurn) || lm[6] >= 6) lmMsg += findEmoji(lm[1]);
                    else lmMsg += findEmoji((getTeam(lm[1]) == 0?"white":(getTeam(lm[1])==1?"black":"gold")) + lm[3]);
                    lmMsg += letterRanks[moveFrom.x];
                    lmMsg += numberRow[moveFrom.y];
                    if(lm.length == 7) {
                        lmMsg += "▶️";
                        lmMsg += letterRanks[moveTo.x];
                        lmMsg += numberRow[moveTo.y];
                    } else {
                        lmMsg += lm[7];
                        // Array.from("").length is more precise than "".length
                        if(Array.from(lm[7]).length < 3) {
                            lmMsg += letterRanks[moveTo.x];
                            lmMsg += numberRow[moveTo.y];
                        }
                    }
                    boardRows[i] += lmMsg;
                } else {
                    boardRows[i] += "🟦🟦🟦🟦🟦🟦🟦";
                }
            }
        }
        // divider
        boardRows.push("🟦".repeat(game.width) + "🟦🟦🟦🟦🟦🟦🟦🟦🟦");
    } else if(boardSize <= 8) {
        // display last moves
        for(let i = 0; i < boardRows.length; i++) {
            if(i == 0) {
                boardRows[i] += "🟦🟦🟦🟦🟦🟦";
            } else {
                let lmIndex = gameHistory.lastMoves.length - i;
                if(gameHistory.lastMoves[lmIndex]) {
                    let lmMsg = "";
                    let lm = gameHistory.lastMoves[lmIndex];
                    let moveFrom = nameToXY(lm[4]);
                    let moveTo = nameToXY(lm[5]);
                    if(lm[0] == 0) lmMsg += "⬜"; 
                    else if(lm[0] == 1) lmMsg += "⬛";
                    else if(lm[0] == 2) lmMsg += "🟧";
                    lmMsg += letterRanks[moveFrom.x];
                    lmMsg += numberRow[moveFrom.y];
                    if(lm.length == 7) {
                        lmMsg += "▶️";
                        lmMsg += letterRanks[moveTo.x];
                        lmMsg += numberRow[moveTo.y];
                    } else {
                        lmMsg += lm[7];
                        // Array.from("").length is more precise than "".length
                        if(Array.from(lm[7]).length < 3) {
                            lmMsg += letterRanks[moveTo.x];
                            lmMsg += numberRow[moveTo.y];
                        }
                    }
                    boardRows[i] += lmMsg;
                } else {
                    boardRows[i] += "🟦🟦🟦🟦🟦🟦";
                }
            }
        }
        // divider
        boardRows.push("🟦".repeat(game.width) + "🟦🟦🟦🟦🟦🟦🟦");
    } else { // too big, no last moves
        for(let i = 0; i < boardRows.length; i++) {
            boardRows[i] += "🟦";
        }
        boardRows.push("🟦".repeat(game.width) + "🟦🟦");
    }
    if(game.solo && !game.goldEliminated) {
        switch(game.soloTeam) {
            case "Flute":
                if(game.soloRevealed) boardRows.push(findEmoji("Flute") + "​ **Enchanted:** " + (soloAffectedRoles.length>0?soloAffectedRoles.join(", "):"*None*"));
            break;
            case "Underworld":
                if(game.soloRevealed) boardRows.push(findEmoji("UnderworldCard") + "​ **Demonized:** " + (soloAffectedRoles.length>0?soloAffectedRoles.join(", "):"*None*"));
            break;
            default:
            break;
        }
    }
    
    // add explanations for visible pieces
    if(game.selectedPiece) visiblePieces.push(game.selectedPiece.name);
    visiblePieces = [...new Set(visiblePieces)];
    visiblePieces.sort();
    for(let i = 0; i < visiblePieces.length; i++) {
        if(["Zombie2","Zombie3","Zombie4","Zombie5","Black Pawn","White Pawn","Black Rook","White Rook","Black Knight","White Knight","Black Bishop","White Bishop","Black Queen","White Queen","Black King","White King"].indexOf(visiblePieces[i]) > -1) continue; // unlisted roles
        if(visiblePieces[i] == "Bloody Butcher") {
            bloodyButcher = true;
            continue;
        }
        boardRows.push(findEmoji((getTeam(visiblePieces[i])==1?"Black":(getTeam(visiblePieces[i])==0?"White":"Gold")) + getChessName(visiblePieces[i])) + " " + findEmoji(visiblePieces[i]) + " **" + visiblePieces[i] + ":** " + getAbilityText(visiblePieces[i]));
    }
    if(bloodyButcher) boardRows.push(findEmoji("BlackPawn") + " " + findEmoji("Bloody Butcher") + " **Bloody Butcher:** " + getAbilityText("Bloody Butcher"));
    if(invulSolo) boardRows.push(findEmoji("GoldUnknown") + " " + " **Solo/Unaligned:** This piece cannot be taken until its first move.");
    return boardMsg + applyDiscordCharLimit(boardRows, "\n", 1999 - boardMsg.length);
}

// cutoff a message if more doesnt fit
function applyDiscordCharLimit(marr, delimiter, length) {
    let output = "";
    for(let i = 0; i < marr.length; i++) {
        if(output.length + marr[i].length < length) {
            output += marr[i] + delimiter;
        } else {
            break;
        }
    }
    return output;
}

// find an emoji by name
function findEmoji(name) {
    switch(name) {
        case "White Pawn": name = "WP"; break;
        case "Black Pawn": name = "BP"; break;
        case "Lamb": name = "FlockTeam"; break;
    }
    name = name.toLowerCase().replace(/[^a-z0-9]/g,"");
    let emoji = client.emojis.cache.find(el => el.name.toLowerCase() === name);
    if(emoji) emoji = `<:${emoji.name}:${emoji.id}>`;
    else {
        console.log("MISSING EMOJI", name);
        emoji = "❓";
    }
    // return
    return emoji;
}

function renderField(field, x, y, turn) {
    let fieldName;
    switch(field.name) {
        default: 
            // get name
            if(field.team == turn || field.enemyVisibleStatus == 7) fieldName = field.name;
            else if(field.enemyVisibleStatus == 6 && !field.disguise) fieldName = field.name;
            else if(field.enemyVisibleStatus == 6 && field.disguise) fieldName = field.disguise;
            else fieldName = (field.team==1?"black":(field.team==0?"white":"gold")) + field.enemyVisible;
            // get emoji
            return findEmoji(fieldName);
        case "Bloody Butcher":
            // get name
            if(turn == 0 || field.enemyVisibleStatus == 7) fieldName = "Butcher";
            else if(turn == 1) fieldName = "Bloody Butcher";
            else if(field.enemyVisibleStatus == 6 && !field.disguise) fieldName = "Butcher";
            else if(field.enemyVisibleStatus == 6 && field.disguise) fieldName = field.disguise;
            else fieldName = (field.team==1?"black":(field.team==0?"white":"gold")) + field.enemyVisible;
            // get emoji
            return findEmoji(fieldName);
        case null:
            return findEmoji(((x&1)^(y&1))?"ws":"bs");
        case "Selected":
            return "❗";
    }
}

/* Register Slash Commands */
function registerCommands() {
    //client.application?.commands.create([]); // delete all global commands
    client.application?.commands.create({
        name: 'play',
        description: 'Starts a game.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "team",
                description: "Which team you want to play as. Defaults to random.",
                required: false,
                choices: [{"name": "Townsfolk (White)","value": "white"},{"name": "Werewolf (Black)","value": "black"},{"name": "Solo (Gold)","value": "gold"}]
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "solo",
                description: "Which solo do you want to fight against. Defaults to random/none.",
                required: false,
                choices: [{"name": "None","value": ""},{"name": "Flute Team","value": "flute"},{"name": "Underworld Team","value": "underworld"},{"name": "Graveyard Team","value": "graveyard"},{"name": "Ghast Team","value": "ghast"}]
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "mode",
                description: "Which gamemode you want to play. Defaults to WWRess (Default).",
                required: false,
                choices: [{"name": "WWRess (Simplified)","value": "simplified"},{"name": "WWRess","value": "default"},{"name": "WWRess (Advanced)","value": "advanced"},{"name": "Hexapawn","value": "hexapawn"},{"name": "Pawnford","value": "pawnford"},{"name": "Big Pawnford","value": "pawnford_big"},{"name": "Chess","value": "chess"},{"name": "Minichess","value": "minichess"}]
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "ai_strength",
                description: "The strength of the AI.",
                required: false,
                choices: [{"name": "Weak","value": "weak"},{"name": "Medium (Default)","value": "default"},{"name": "Strong","value": "strong"}]
            }
        ]
    });
    client.application?.commands.create({
        name: 'boss',
        description: 'Starts a boss battle.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "mode",
                description: "Which gamemode you want to play. Defaults to WWRess (Default).",
                required: false,
                choices: [{"name": "Flute Boss","value": "boss_flute"},{"name": "Bat Boss","value": "boss_bat"},{"name": "Ghast Boss (Reversed)","value": "boss_ghast"},{"name": "Zombie Boss","value": "boss_zombie"},{"name": "Horsemen Boss","value": "boss_horseman"},{"name": "Horsemen Boss (Reversed)","value": "boss_horseman_reversed"}]
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "ai_strength",
                description: "The strength of the AI.",
                required: false,
                choices: [{"name": "Weak","value": "weak"},{"name": "Medium (Default)","value": "default"},{"name": "Strong","value": "strong"}]
            }
        ]
    });
    
    client.application?.commands.create({
        name: 'aigame',
        description: 'Starts a game with just AIs.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "mode",
                description: "Which gamemode you want to play. Defaults to WWRess (Default).",
                required: false,
                choices: [{"name": "WWRess (Simplified)","value": "simplified"},{"name": "WWRess","value": "default"},{"name": "WWRess (Advanced)","value": "advanced"},{"name": "Hexapawn","value": "hexapawn"},{"name": "Pawnford","value": "pawnford"},{"name": "Big Pawnford","value": "pawnford_big"},{"name": "Boss Battle (Flute)","value": "boss_flute"},{"name": "Boss Battle (Bat)","value": "boss_bat"},{"name": "Boss Battle (Ghast)","value": "boss_ghast"},{"name": "Boss Battle (Zombie)","value": "boss_zombie"},{"name": "Boss Battle (Horsemen)","value": "boss_horseman"},{"name": "Chess","value": "chess"},{"name": "Minichess","value": "minichess"}]
            }
        ]
    });
    client.application?.commands.create({
        name: 'challenge',
        description: 'Starts a game with another player.',
        options: [
            {
                type: ApplicationCommandOptionType.Mentionable,
                name: "opponent",
                description: "The name of the person you'd like to challenge.",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "mode",
                description: "Which gamemode you want to play. Defaults to WWRess (Default).",
                required: false,
                choices: [{"name": "WWRess (Simplified)","value": "simplified"},{"name": "WWRess","value": "default"},{"name": "WWRess (Advanced)","value": "advanced"},{"name": "Hexapawn","value": "hexapawn"},{"name": "Chess","value": "chess"},{"name": "Minichess","value": "minichess"}]
            }
        ]
    });
    client.application?.commands.create({
        name: 'challenge_solo',
        description: 'Starts a game with another player with a solo.',
        options: [
            {
                type: ApplicationCommandOptionType.Mentionable,
                name: "opponent",
                description: "The name of the person you'd like to challenge.",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "solo",
                description: "Which solo do you want to fight against. Defaults to random",
                required: false,
                choices: [{"name": "Flute Team","value": "flute"},{"name": "Underworld Team","value": "underworld"},{"name": "Graveyard Team","value": "graveyard"},{"name": "Ghast Team","value": "graveyard"}]
            }
        ]
    });
    client.application?.commands.create({
        name: 'pieces',
        description: 'Lists the pieces of a team.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "team",
                description: "The name of the team.",
                required: true,
                choices: [{"name": "Townsfolk (White)","value": "townsfolk"},{"name": "Werewolves (Black)","value": "werewolf"},{"name": "Solo / Unaligned (Gold)","value": "solo"}]
            }
        ]
    });
    client.application?.commands.create({
        name: 'resign',
        description: 'Resigns the game.'
    });
    client.application?.commands.create({
        name: 'resend',
        description: 'Resends the private board message.'
    });
    client.application?.commands.create({
        name: 'accept',
        description: 'Accepts a challenge.'
    });
    client.application?.commands.create({
        name: 'deny',
        description: 'Denies a challenge.'
    });
    client.application?.commands.create({
        name: 'help',
        description: 'Explains the game.'
    });
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