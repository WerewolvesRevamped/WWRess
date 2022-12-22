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

var games = [];
var players = [];
var outstandingChallenge = [];

function isPlaying(id) {
    return players.map(el => el[0]).indexOf(id) != -1;
}

function isOutstanding(id) {
    return outstandingChallenge.map(el => el[0]).indexOf(id) != -1;
}

function getPlayerGameId(id) {
    let ind = players.map(el => el[0]).indexOf(id);
    return players[ind][1];
}

function deepCopy(el) {
    return JSON.parse(JSON.stringify(el));
}

function movePiece(interaction, id, from, to, repl = null) {
    // get coords
    let moveFrom = nameToXY(from);
    let moveTo = nameToXY(to);
            
    // move piece
    let moveCurGame = games[id];
    let movedPiece = moveCurGame.state[moveFrom.y][moveFrom.x];
    if(repl) movedPiece = repl; // replace piece for promotion
    moveCurGame.state[moveFrom.y][moveFrom.x] = null;
    moveCurGame.state[moveTo.y][moveTo.x] = movedPiece;
    
    
    // promote?
    if(movedPiece == "Citizen" && moveTo.y == 0) {
        if(interaction) {
            interaction.update(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: [{ type: 2, label: "Runner", style: 1, custom_id: "promote-"+to+"-Runner" }] }]));
        } else {
            movePiece(interaction, id, to, to, "Runner");
            nextTurn(moveCurGame);
        }
    } else if(movedPiece == "Wolf" && moveTo.y == 4) {
        if(interaction) {
            interaction.update(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: [{ type: 2, label: "Warlock", style: 1, custom_id: "promote-"+to+"-Warlock" }] }]));
        } else {
            movePiece(interaction, id, to, to, "Warlock");
            nextTurn(moveCurGame);
        }
    } else {
        // turn complete
        if(interaction) {
            interaction.update(displayBoard(moveCurGame, "Waiting on Opponent"));     
            busyWaiting(interaction, id, moveCurGame.turn);
        }
        nextTurn(moveCurGame);
    }
}

function displayBoard(game, message, comp = []) {
    return { content: renderBoard(game, message), components: comp, ephemeral: true, fetchReply: true };
}

async function busyWaiting(interaction, gameid, player) {
    await sleep(500);
    while(true) {
        await sleep(100);
        if(!games[gameid]) return;
        if(games[gameid].turn == player) {
            let availableMoves = showMoves(gameid, player);
            interaction.editReply(availableMoves);  
            return;
        }
    }
}

function nextTurn(game) {
    console.log("NEXT TURN");
    let oldTurn = game.turn;
    game.turn = (game.turn + 1) % 2;
    
    // find a valid move
   let board = game.state;
    let pieces = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(getTeam(board[y][x]) == game.turn) {
                pieces.push([board[y][x], xyToName(x, y), y, x]);
            }
        }
    }
    let iterations = 0;
    if(pieces.length > 0) {
        let positions = [];
        let selectedPiece;

        while(positions.length == 0 && iterations < 100) {
            selectedPiece = pieces[Math.floor(Math.random() * pieces.length)][1];
            positions = generatePositions(game.state, selectedPiece);
            iterations++;
        }
    }
    console.log("VALIDATING TURN", pieces, iterations);
    
    if(pieces == 0 || iterations == 100) {
         let guild = client.guilds.cache.get(game.guild);
        let channel = guild.channels.cache.get(game.channel)
        if(game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against <@" + game.players[game.turn] + ">!");
        else if(oldTurn == 0 && !game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against **AI**!");
        else if(oldTurn == 1 && !game.players[1]) channel.send("**AI** has won against <@" + game.players[game.turn] + ">!");
        destroyGame(game.id);
        return;
    }
    
    if(game.turn == 1 && game.players[1] == null) {
        AImove(game)
    }
}

function AImove(game) {
    let board = game.state;
    let pieces = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(getTeam(board[y][x]) == 1) {
                pieces.push([board[y][x], xyToName(x, y), y, x]);
            }
        }
    }
    let positions = [];
    let selectedPiece;
    let iterations = 0;

    while(positions.length == 0 && iterations < 100) {
        selectedPiece = pieces[Math.floor(Math.random() * pieces.length)][1];
        positions = generatePositions(game.state, selectedPiece);
        iterations++;
    }
    
    let selectedMove = positions[Math.floor(Math.random() * positions.length)];
    
    console.log("AI MOVE", selectedPiece, xyToName(selectedMove[0], selectedMove[1]));
    movePiece(null, game.id, selectedPiece, xyToName(selectedMove[0], selectedMove[1]));
}

/* New Slash Command */
client.on('interactionCreate', async interaction => {
    if(interaction.isButton()) {
        console.log("INTERACTION", interaction.customId);
        let type = interaction.customId.split("-")[0];
        let arg1 = interaction.customId.split("-")[1];
        let arg2 = interaction.customId.split("-")[2];
        switch(type) {
            // select a piece; show available moves
            case "select":    
                let selection = nameToXY(arg1);
                let selectGameID = getPlayerGameId(interaction.member.id);
                let currentGame = deepCopy(games[selectGameID]);
                
                // generate list of possible moves
                console.log("BOARD AT SELECT", currentGame.state);
                let positions = generatePositions(currentGame.state, arg1);
                console.log("POSSIBLE MOVES", positions);
                let components = interactionsFromPositions(positions, arg1);
                //console.log(components);
                
                currentGame.state[selection.y][selection.x] = "selected";
                let selectBoardRender = renderBoard(currentGame);
                
                interaction.update(displayBoard(currentGame, "Pick a Move", components));
            break;
            // move a piece to another location; update board
            case "move":
                let moveGameID = getPlayerGameId(interaction.member.id);
                movePiece(interaction, moveGameID, arg1, arg2);
            break;
            // promote a piece; update board
            case "promote":
                let promoteGameID = getPlayerGameId(interaction.member.id);
                movePiece(interaction, promoteGameID, arg1, arg1, arg2);
            break;
            // back to turn start menu
            case "turnstart":
                let turnGameID = getPlayerGameId(interaction.member.id);
                interaction.update(showMoves(turnGameID, games[turnGameID].turn));     
            break;
        }
    }
    
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
        case "play":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're already in a game!", ephemeral: true });
            } else {
                createGame(interaction.member.id, null, games.length, interaction.member.user.username, "*AI*", interaction.channel.id, interaction.guild.id);
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                let availableMoves = showMoves(id, 0);
                interaction.reply(availableMoves);  
            }
        break;
        case "resign":
            if(!isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're not in a game!", ephemeral: true });
            } else {
                 let id = getPlayerGameId(interaction.member.id);
                 destroyGame(id);
                interaction.reply("✅ " + interaction.member.user.username + " resigned!");
            }
        break;
        case "challenge":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're already in a game!", ephemeral: true });
            } else {
                let opponent = interaction.options.get('opponent').value;
                opponent = interaction.guild.members.cache.get(opponent);
                if(!opponent || opponent.bot) {
                    interaction.reply({ content: "❎ Could not find opponent!", ephemeral: true });
                    return;
                }
                if(isPlaying(opponent.id)) {
                    interaction.reply({ content: "❎ Your selected opponent is already in a game!", ephemeral: true });
                    return;
                }
                
                let gameID = games.length;
                createGame(interaction.member.id, opponent.id, gameID, interaction.member.user.username, opponent.user.username, interaction.channel.id, interaction.guild.id);
                
                interaction.channel.send("<@" + opponent.id + "> You have been challenged by <@" + interaction.member.id + ">! Run `/accept` to accept the challenge.");
                
                outstandingChallenge.push([opponent.id, interaction.member.id, gameID])
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                let availableMoves = showMoves(id, 0);
                interaction.reply(availableMoves);  
            }
        break;
        case "accept":
            if(!isOutstanding(interaction.member.id)) {
                interaction.reply({ content: "❎ You have no outstanding challenges!", ephemeral: true });
            } else {
                let challenge = outstandingChallenge.filter(el => el[0] == interaction.member.id)[0];
                console.log("CHALLENGE", challenge);
                
                interaction.channel.send("<@" + challenge[1] + "> Your challenge has been accepted by <@" + interaction.member.id + ">!");
                
                interaction.reply(displayBoard(games[challenge[2]], "Waiting on Opponent"));
                busyWaiting(interaction, challenge[2], 1);
                
                outstandingChallenge = outstandingChallenge.filter(el => el[0] != interaction.member.id);
            }
        break;
    }
})

function destroyGame(id) {
    let playersDel = games[id].players;
    players = players.filter(el => el[0] != playersDel[0] && el[0] != playersDel[1]);
    games[id] = null;
}


const emptyBoard = [[null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null]];
function createGame(playerID, playerID2, gameID, name1, name2, channel, guild) {
    players.push([playerID, gameID]);
    if(playerID2) players.push([playerID2, gameID]);
    let newBoard = deepCopy(emptyBoard);
    newBoard[4][0] = "Citizen";
    newBoard[4][1] = "Citizen";
    newBoard[4][2] = "Citizen";
    newBoard[4][3] = "Runner";
    newBoard[4][4] = "Citizen";
    newBoard[0][0] = "Wolf";
    newBoard[0][1] = "Warlock";
    newBoard[0][2] = "Wolf";
    newBoard[0][3] = "Wolf";
    newBoard[0][4] = "Wolf";
    games.push({id: gameID, players: [ playerID, playerID2 ], playerNames: [ name1, name2 ], state: newBoard, turn: 0, channel: channel, guild: guild });
}

// turn = 0 for town, 1 for wolves
function showMoves(gameID, turn) {
    let currentGame = games[gameID];
    let board = renderBoard(currentGame);
    let interactions = generateInteractions(currentGame.state, turn);
    return { content: board, ephemeral: true, fetchReply: true, components: [ { type: 1, components: interactions } ] }
}

function getTeam(piece) {
    switch(piece) {
        case "Citizen": case "Runner":
            return 0;
        case "Wolf": case "Warlock":
            return 1;
    }
}

function numToRank(num) {
    return "ABCDE"[num];
}

function rankToNum(rank) {
    return "ABCDE".indexOf(rank);
}

function xyToName(x, y) {
    return numToRank(x) + (y+1);
}

function nameToXY(name) {
    return { x: rankToNum(name[0]), y: (+name[1])-1 };
}

function inBoundsOne(x) {
    return x>=0 && x<=4;
}

function inBounds(x, y = 1) {
    return inBoundsOne(x) && inBoundsOne(y);
}

function generatePositions(board, position) {
    let positions = [];
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    console.log("Finding moves for ", piece, " @ ", x, "|", numToRank(x), " ", y);
    const enemyTeam = (getTeam(piece) + 1) % 2;
    switch(piece) {
        // Pawn
        case "Citizen":
            if(y>0) {
                if(board[y-1][x] == null) positions.push([x, y-1]);
                if(x>0 && board[y-1][x-1] != null && getTeam(board[y-1][x-1]) == enemyTeam) positions.push([x-1, y-1, true]);
                if(x<4 && board[y-1][x+1] != null && getTeam(board[y-1][x+1]) == enemyTeam) positions.push([x+1, y-1, true]);
            }            
        break;
        case "Wolf":
            if(y<4) {
                if(board[y+1][x] == null) positions.push([x, y+1]);
                if(x>0 && board[y+1][x-1] != null && getTeam(board[y+1][x-1]) == enemyTeam) positions.push([x-1, y+1, true]);
                if(x<4 && board[y+1][x+1] != null && getTeam(board[y+1][x+1]) == enemyTeam) positions.push([x+1, y+1, true]);
            }            
        break;
        // Rook
        case "Runner":
        case "Warlock":
            for(let xt1 = x+1; xt1 < 5; xt1++) {
                if(inBounds(xt1) && board[y][xt1] == null) {
                    positions.push([xt1, y]);
                } else if(inBounds(xt1) && getTeam(board[y][xt1]) == enemyTeam) {
                    positions.push([xt1, y, true]);
                    break;
                } else {
                    break;
                }
            }
            console.log(positions);
            for(let xt2 = x-1; xt2 >= 0; xt2--) {
                if(inBounds(xt2) && board[y][xt2] == null) {
                    positions.push([xt2, y]);
                } else if(inBounds(xt2) && getTeam(board[y][xt2]) == enemyTeam) {
                    positions.push([xt2, y, true]);
                    break;
                } else {
                    break;
                }
            }
            console.log(positions);
            for(let yt1 = y+1; yt1 < 5; yt1++) {
                if(inBounds(yt1) && board[yt1][x] == null) {
                    positions.push([x, yt1]);
                } else if(inBounds(yt1) && getTeam(board[yt1][x]) == enemyTeam) {
                    positions.push([x, yt1, true]);
                    break;
                } else {
                    break;
                }
            }
            console.log(positions);
            for(let yt2 = y-1; yt2 >= 0; yt2--) {
                if(inBounds(yt2) && board[yt2][x] == null) {
                    positions.push([x, yt2]);
                } else if(inBounds(yt2) && getTeam(board[yt2][x]) == enemyTeam) {
                    positions.push([x, yt2, true]);
                    break;
                } else {
                    break;
                }
            }
            console.log(positions);
        break;
    }
    return positions;
}

function interactionsFromPositions(positions, from) {
    let interactions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
    for(let i = 0; i < positions.length; i++) {
        interactions.push({ type: 2, label: xyToName(positions[i][0], positions[i][1]) + (positions[i][2]?" ✘":""), style:  (positions[i][2]?3:1), custom_id: "move-" + from + "-" + xyToName(positions[i][0], positions[i][1]) });
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

function isLowValuePiece(name) {
    switch(name) {
        default:
            return false;
        case "Citizen": case "Wolf":
            return true;
    }
}

function generateInteractions(board, team) {
    let interactions = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(getTeam(board[y][x]) == team) {
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x], style: isLowValuePiece(board[y][x]) ? 2 : 1, custom_id: "select-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function renderBoard(game, message = "Turn") {
    let board = game.state;
    let boardMsg = "**" + game.playerNames[0] + " vs. " + game.playerNames[1] +  "**\n" + "**" + message + "** " + game.turn + "\n🟦🇦​🇧​🇨​🇩​🇪\n";
    const numberRow = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];
    for(let y = 0; y < board.length; y++) {
        let row = numberRow[y];
        for(let x = 0; x < board[0].length; x++) {
                row += renderField(board[y][x], x, y);
        }
        boardMsg += row + "\n";
        row = "";
    }
    return boardMsg;
}

function renderField(field, x, y) {
    switch(field) {
        default: 
            let fieldName = field.toLowerCase().replace(/[^a-z]/g,"");
            let emoji = client.emojis.cache.find(el => el.name.toLowerCase() === fieldName);
            if(emoji) emoji = `<:${emoji.name}:${emoji.id}>`;
            else emoji = "❓";
            return emoji;
        case null:
            return ((x&1)^(y&1))?"⬜":"🟫";
        case "selected":
            return "❗";
    }
}

/* Register Slash Commands */
function registerCommands() {
    client.application?.commands.create({
        name: 'play',
        description: 'Starts a game.'
    });
    client.application?.commands.create({
        name: 'challenge',
        description: 'Starts a game with another player.',
        options: [
            {
                type: "MENTIONABLE",
                name: "opponent",
                description: "The name of the person you'd like to challenge.",
                required: true
            }
        ]
    });
    client.application?.commands.create({
        name: 'resign',
        description: 'Resigns the game.'
    });
    client.application?.commands.create({
        name: 'accept',
        description: 'Accepts a challenge.'
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
