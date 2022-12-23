/* Discord */
const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
global.client = new Client({ intents: ['GUILDS', 'GUILD_WEBHOOKS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'] });
config = require("./config.json");

/* Setup */
client.on("ready", () => {
    // on bot ready
    registerCommands();
});

// check if user is a Game Master
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


/** GLOBAL VARIABLES **/
var games = [];
var players = [];
var outstandingChallenge = [];

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

// create a deep copy of an element by JSON stringifying and then parsing it
function deepCopy(el) {
    return JSON.parse(JSON.stringify(el));
}

function turnStart(interaction, gameid, turn, mode = "editreply") {
    let availableAbilities = showMoves(gameid, turn, true);
    response(interaction, availableAbilities, mode);
}

function turnMove(interaction, gameid, turn, mode = "editreply") {
    let availableMoves = showMoves(gameid, turn);
    response(interaction, availableMoves, mode);
}

function response(interaction, resp, mode) {
    switch(mode) {
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

// moves a piece from one place to another (and/or replaces the piece with another piece)
function movePiece(interaction, id, from, to, repl = null) {
    // get coords
    let moveFrom = nameToXY(from);
    let moveTo = nameToXY(to);
            
    // move piece
    let moveCurGame = games[id];
    let movedPieceCopy = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let movedPiece = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let beatenPiece = deepCopy(moveCurGame.state[moveTo.y][moveTo.x]);
    if(repl) movedPiece = repl; // replace piece for promotion
    moveCurGame.state[moveFrom.y][moveFrom.x] = getPiece(null);
    moveCurGame.state[moveTo.y][moveTo.x] = movedPiece;
    
    // 0 -> unknown
    // 1 -> likely pawn
    // 2 -> likely king
    // 3 -> likely rook / king
    // 4 -> piece known
    // 5 -> active ability known
    // 6 -> role known
    let movedXorig = moveFrom.x - moveTo.x;
    let movedYorig = moveFrom.y - moveTo.y;
    let movedX = Math.abs(movedXorig);
    let movedY = Math.abs(movedYorig);
    if(movedPiece.enemyVisibleStatus < 4) { 
        console.log("MOVED", movedXorig, movedYorig, beatenPiece.name);
        // definitely a knight
        if((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) {
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Knight";
        }
        // pawn condition
        else if(movedPiece.enemyVisibleStatus < 1 && moveCurGame.turn == 0 && movedYorig == 1 && movedX == 0 && beatenPiece.name == null) { // white pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(movedPiece.enemyVisibleStatus < 1 && moveCurGame.turn == 0 && movedYorig == 1 && movedX == 1 && beatenPiece.name != null) { // white pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(movedPiece.enemyVisibleStatus < 1 && moveCurGame.turn == 1 && movedYorig == -1 && movedX == 0 && beatenPiece.name == null) { // black pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(movedPiece.enemyVisibleStatus < 1 && moveCurGame.turn == 1 && movedYorig == -1 && movedX == 1 && beatenPiece.name != null) { // black pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        }
        // king condition
        else if(movedPiece.enemyVisibleStatus < 2 && movedY == 0 && movedX == 1) { // rook like move (left/right)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if(movedPiece.enemyVisibleStatus < 2 && ((moveCurGame.turn == 0 && movedYorig == -1) || (moveCurGame.turn == 1 && movedYorig == 1))  && (movedX == 0 || movedX == 1)) { // rook like move (down, side down)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if(movedPiece.enemyVisibleStatus < 2 && ((moveCurGame.turn == 0 && movedYorig == 1) || (moveCurGame.turn == 1 && movedYorig == -1))  && movedX == 0 && beatenPiece.name != null) { // rook like move (up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if(movedPiece.enemyVisibleStatus < 2 && ((moveCurGame.turn == 0 && movedYorig == 1) || (moveCurGame.turn == 1 && movedYorig == -1))  && movedX == 1 && beatenPiece.name == null) { // rook like move (side up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        }
        // rook condition
        else if(movedPiece.enemyVisibleStatus < 3 && ((movedY > 1 && movedX == 0) || (movedY == 0 && movedX > 1))) {
            movedPiece.enemyVisibleStatus = 3;
            movedPiece.enemyVisible = "LikelyRook";
        }
        // queen condition
        else if(movedPiece.enemyVisibleStatus < 4 && (movedY > 1 || movedX > 1) && movedY > 1 && movedX > 1) {
            movedPiece.enemyVisibleStatus = 3;
            movedPiece.enemyVisible = "Queen";
        }
    }
    
    // find position to go to if attack blocked
    let defensiveX = moveTo.x;
    let defensiveY = moveTo.y;
    if(moveTo.x != moveFrom.x) defensiveX -= Math.sign(moveTo.x - moveFrom.x)
    if(moveTo.y != moveFrom.y) defensiveY -= Math.sign(moveTo.y - moveFrom.y)
    if((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) { // knight has no intermediate steps and stays if blocked
        defensiveX = moveFrom.x;
        defensiveY = moveFrom.y;
    }
    
    switch(beatenPiece.name) {
        default: case null:
            // store move
            if(from == to) moveCurGame.lastMoves.push([moveCurGame.turn, movedPieceCopy.name, movedPiece.enemyVisibleStatus<4?"Pawn":movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus<4?4:movedPiece.enemyVisibleStatus, "⏫🟦🟦"]);
            else moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
        break;
        case "Ranger":
            movedPiece.enemyVisibleStatus = 6;
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
            moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, "Ranger", "", to, to, 6, "👁️" + findEmoji(movedPiece.name) + "🟦"]);
        break;
        case "Huntress":
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
            moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, "Huntress", "", to, to, 6, "🇽🟦🟦"]);
            moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
        break;
        // Extra Move Pieces
        case "Child":
        case "Wolf Cub":
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
            moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, "", to, to, 6, "🟦" + "2️⃣" + "🇽"]);
            if(moveCurGame.turn == 0) moveCurGame.doubleMove0 = true;
            else if(moveCurGame.turn == 1) moveCurGame.doubleMove1 = true;
        break;
        // Fortune Apprentice
        case "Fortune Teller":
        case "Aura Teller":
        case "Crowd Seeker":
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
            for(let y = 0; y < 5; y++) {
                for(let x = 0; x < 5; x++) {
                    let xyPiece = moveCurGame.state[y][x];
                    if(xyPiece.name == "Fortune Apprentice") {
                        moveCurGame.state[y][x] = getPiece(beatenPiece.name);
                    }
                }
            }
        break;
        // Defensive Pieces, Single Defense
        case "Runner":
        case "Idiot":
        case "Scared Wolf":
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, xyToName(defensiveX, defensiveY), movedPiece.enemyVisibleStatus]);
            moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, "", to, to, 6, "🛡️🟦🟦"]);
            moveCurGame.state[defensiveY][defensiveX] = movedPiece;
            moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Attacked " + beatenPiece.name);
            moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 6;
        break;
        case "Cursed Civilian":
            moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, xyToName(defensiveX, defensiveY), movedPiece.enemyVisibleStatus]);
            moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, "", to, to, 6, "🔀" + findEmoji("Wolf") + "🟦"]);
            moveCurGame.state[defensiveY][defensiveX] = movedPiece;
            moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Wolf");
            moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 6;
        break;
        case "Alcoholic":
            let bartenderAlive = false;
            for(let y = 0; y < 5; y++) {
                for(let x = 0; x < 5; x++) {
                    let xyPiece = moveCurGame.state[y][x];
                    if(xyPiece.name == "Bartender") {
                        bartenderAlive = true;
                    }
                }
            }
            if(bartenderAlive) {
                moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, xyToName(defensiveX, defensiveY), movedPiece.enemyVisibleStatus]);
                moveCurGame.lastMoves.push([(moveCurGame.turn+1)%2, beatenPiece.name, "", to, to, 6, "🛡️🟦🟦"]);
                moveCurGame.state[defensiveY][defensiveX] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 6;
            } else {
                moveCurGame.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
            }
        break;
    }
    
    switch(movedPiece.name) {
        case "Amnesiac": // Amnesiac -> Change role after onhe move
            console.log("AMNESIAC CHANGE", movedPiece.convertTo);
            moveCurGame.state[moveTo.y][moveTo.x] = getPiece(movedPiece.convertTo);
        break;
    	case "Direwolf": // Direwolf -> Double move if last piece
            let wolfCount = 0;
            for(let y = 0; y < 5; y++) {
                for(let x = 0; x < 5; x++) {
                    let xyPiece = moveCurGame.state[y][x];
                    if(xyPiece.team == 1) {
                        wolfCount++;
                    }
                }
            }
            if(wolfCount == 1 && !moveCurGame.inDoubleMove) {
		    moveCurGame.doubleMove1 = true;
		    movedPiece.enemyVisibleStatus = 6;
	    }
    	break;
    }
    moveCurGame.inDoubleMove = false;
    
    
    // promote?
    if(movedPiece.chess == "Pawn" && moveCurGame.turn == 0 && moveTo.y == 0) {
        if(interaction) {
            interaction.update(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: [{ type: 2, label: "Runner ♖", style: 1, custom_id: "promote-"+to+"-Runner" }, { type: 2, label: "Hooker ♔", style: 1, custom_id: "promote-"+to+"-Hooker" }] }]));
        } else {
            movePiece(interaction, id, to, to, getPiece("Runner"));
        }
    } else if(movedPiece.chess == "Pawn" && moveCurGame.turn == 1 && moveTo.y == 4) {
        if(interaction) {
            interaction.update(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: [{ type: 2, label: "Warlock ♜", style: 1, custom_id: "promote-"+to+"-Warlock" }, { type: 2, label: "Alpha Wolf ♚", style: 1, custom_id: "promote-"+to+"-Alpha Wolf" }] }]));
        } else {
            movePiece(interaction, id, to, to, getPiece("Warlock"));
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

function displayBoard(game, message, comp = [], turnOverride = null) {
    return { content: renderBoard(game, message, turnOverride), components: comp, ephemeral: true, fetchReply: true };
}

function emptyMessage() {
    return { content: "*Loading...*", components: [], ephemeral: true, fetchReply: true };
}

async function busyWaiting(interaction, gameid, player) {
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
            // if edit fails retry;
            try {
                if(interaction) turnStart(interaction, gameid, player, "editreply");  
                return;
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

function nextTurn(game) {
    // increment turn
    console.log("NEXT TURN");
    let oldTurn = game.turn;
    game.turn = (game.turn + 1) % 2;
    
    // find a valid move
   let board = game.state;
    let pieces = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == game.turn) {
                pieces.push([board[y][x].name, xyToName(x, y), y, x]);
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
    
    // Update Spectator Board
    let msgSpec = displayBoard(game, "SPECTATOR BOARD", [], game.players[1] == null ? 0 : -1);
    msgSpec.ephemeral = false;
    game.msg.edit(msgSpec);
    
    // WIN Message
    if(pieces == 0 || iterations == 100) {
        let guild = client.guilds.cache.get(game.guild);
        let channel = guild.channels.cache.get(game.channel)
        if(game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against <@" + game.players[game.turn] + ">!");
        else if(oldTurn == 0 && !game.players[1]) channel.send("<@" + game.players[oldTurn] + "> has won against **AI**!");
        else if(oldTurn == 1 && !game.players[1]) channel.send("**AI** has won against <@" + game.players[game.turn] + ">!");
        concludeGame(game.id);
        delayedDestroy(game.id);
        console.log("WIN");
        return;
    }
    
    // DOUBLE MOVE (CHILD/CUB)
    if(game.turn == 1 && game.doubleMove0 == true) { // double move town (Child)
        game.doubleMove0 = false;
    	game.inDoubleMove = true;
        nextTurn(game);
        return;
    } else if(game.turn == 0 && game.doubleMove1 == true) { // double move wolf (Cub)
        game.doubleMove1 = false;
    	game.inDoubleMove = true;
        nextTurn(game);
        return;
    }
    
    // Do AI Turn if AI in play
    if(game.turn == 1 && game.players[1] == null) {
        AImove(game)
    }
}

function AImove(game) {
    let board = game.state;
    let pieces = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == 1) {
                pieces.push([board[y][x].name, xyToName(x, y), y, x]);
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
    
    // duplicate taking moves
    positionsDuplicate = deepCopy(positions);
    for(let i = 0; i < positionsDuplicate.length; i++) {
        if(positionsDuplicate[i][2] === true) {
            positions.push(positionsDuplicate[i]);
            positions.push(positionsDuplicate[i]);
            positions.push(positionsDuplicate[i]);
        }
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
        let gameID = getPlayerGameId(interaction.member.id);
        let curGame = games[gameID];
        switch(type) {
            // select a piece; show available moves
            case "select":    
                let selection = nameToXY(arg1);
                let currentGame = deepCopy(curGame);
                
                // generate list of possible moves
                console.log("BOARD AT SELECT", currentGame.state.map(el => el.map(el2 => el2.name).join(",")).join("\n"));
                let positions = generatePositions(currentGame.state, arg1);
                console.log("POSSIBLE MOVES", positions);
                let components = interactionsFromPositions(positions, arg1, "turnmove", "move");
                //console.log(components);
                
                currentGame.selectedPiece = deepCopy(currentGame.state[selection.y][selection.x]);
                currentGame.state[selection.y][selection.x] = getPiece("Selected");
                
                interaction.update(displayBoard(currentGame, "Pick a Move", components));
            break;
            // move a piece to another location; update board
            case "move":
                movePiece(interaction, gameID, arg1, arg2);
            break;
            // promote a piece; update board
            case "promote":
                movePiece(interaction, gameID, arg1, arg1, getPiece(arg2));
            break;
            // back to turn start menu
            case "turnstart":
                turnStart(interaction, gameID, curGame.turn, "update") 
            break;
            // back to turn move menu
            case "turnmove":
                turnMove(interaction, gameID, curGame.turn, "update") 
            break;
             // select an ability piece; show available actions
            case "ability":    
                let abilitySelection = nameToXY(arg1);
                let abilityPiece = curGame.state[abilitySelection.y][abilitySelection.x];
                
                let positions, components = [];
                // provide options
                switch(abilityPiece.name) {
                    default: case null:
                        components = interactionsFromPositions([], arg1, "turnstart");
                    break;
                    case "Fortune Teller":
                        positions = generatePositions(curGame.state, arg1);
                        components = interactionsFromPositions(positions, arg1, "turnstart", "investigate");
                    break;
                }
                
                // update message
                interaction.update(displayBoard(curGame, "Pick a Target", components));
            break;
            /** ACTIVE ABILITIES **/
            // investigate
            case "investigate":
                let investTarget = nameToXY(arg2);
                curGame.state[investTarget.y][investTarget.x].enemyVisibleStatus = 6;
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
                
                // spectator board
                let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], 0);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    games[id].msg = m;
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
            }
        break;
        case "resign":
            if(!isPlaying(interaction.member.id)) {
                interaction.reply({ content: "❎ You're not in a game!", ephemeral: true });
            } else {
                let id = getPlayerGameId(interaction.member.id);
                concludeGame(id);
                destroyGame(id);
                interaction.reply("✅ " + interaction.member.user.username + " resigned!");
                console.log("RESIGN");
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
                
                let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], -1);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    games[id].msg = m;
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
            }
        break;
        case "accept":
            if(!isOutstanding(interaction.member.id)) {
                interaction.reply({ content: "❎ You have no outstanding challenges!", ephemeral: true });
            } else {
                let challenge = outstandingChallenge.filter(el => el[0] == interaction.member.id)[0];
                console.log("CHALLENGE", challenge);
                
                interaction.channel.send("<@" + challenge[1] + "> Your challenge has been accepted by <@" + interaction.member.id + ">!");
                
                interaction.reply(displayBoard(games[challenge[2]], "Waiting on Opponent", [], 1));
                busyWaiting(interaction, challenge[2], 1);
                
                outstandingChallenge = outstandingChallenge.filter(el => el[0] != interaction.member.id);
            }
        break;
    }
})


function getTeam(piece) {
    switch(piece) {
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child":
        case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
        case "Royal Knight": case "Alcoholic": case "Amnesiac":
        case "Runner": case "Fortune Teller": case "Witch":
        case "Cursed Civilian":
        case "Attacked Runner": case "Attacked Idiot":
            return 0;
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
        case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
        case "Direwolf": case "Clairvoyant Fox": case "Fox":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
         case "White Werewolf":
         case "Attacked Scared Wolf":
            return 1;
        case "Selected":
        case null:
            return -1;
    }
}

function isActive(piece) {
    switch(piece) {
        default:
            return false;
        case "Hooker": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Fortune Teller": case "Witch":
        case "Tanner": case "Archivist Fox": case "Dog": case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Clairvoyant Fox": case "Warlock": case "Saboteur Wolf":
            return true;
    }
}

function getAbilityText(piece) {
    switch(piece) {
        case "Citizen":
            return "No ability.";
        case "Ranger":
            return "Reveals killer, when taken.";
        case "Huntress": 
            return "Takes killer, when taken.";
        case "Bartender":
            return "No ability. Relevant for Alcoholic.";
        case "Fortune Apprentice":
            return "Replaced FT/AT/CS if they are taken.";
        case "Child":
            return "Additional move, when taken.";
        case "Hooker":
            return "";
        case "Idiot":
            return "Survives one attack, but becomes unmovable.";
        case "Attacked Idiot":
            return "Survived an attack. No ability.";
        case "Crowd Seeker":
            return "";
        case "Aura Teller":
            return "";
        case "Royal Knight":
            return "";
        case "Alcoholic":
            return "Invulnerable, if Bartender exists.";
        case "Amnesiac":
            return "Changes after one move.";
        case "Runner":
            return "Survives one attack.";
        case "Attacked Runner":
            return "Survived an attack. No ability.";
        case "Fortune Teller":
            return "";
        case "Witch":
            return "";
        case "Cursed Civilian":
            return "Becomes a Wolf, when taken.";
        case "Wolf":
            return "No ability.";
        case "Wolf Cub":
            return "Additional move, when taken.";
        case "Tanner":
            return "";
        case "Archivist Fox":
            return "";
        case "Recluse":
            return "";
        case "Dog":
            return "";
        case "Infecting Wolf":
            return "";
        case "Alpha Wolf":
            return "";
        case "Psychic Wolf":
            return "";
        case "Sneaking Wolf":
            return "";
        case "Direwolf":
            return "Double moves, if last piece.";
        case "Clairvoyant Fox":
            return "";
        case "Fox":
            return "No ability.";
        case "Warlock":
            return "";
        case "Scared Wolf":
            return "Survives one attack.";
        case "Attacked Scared Wolf":
            return "Survived an attack. No ability.";
        case "Saboteur Wolf":
            return "";
         case "White Werewolf":
            return "";
    }
}

function getChessName(piece) {
    switch(piece) {
        default:
            return null;
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child":
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
            return "Pawn";
         case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
         case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
            return "King";
         case "Royal Knight": case "Alcoholic": case "Amnesiac":
         case "Direwolf": case "Clairvoyant Fox": case "Fox":
            return "Knight";
        case "Runner": case "Fortune Teller": case "Witch":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "Attacked Runner": case "Attacked Scared Wolf":
            return "Rook";
         case "Cursed Civilian":
         case "White Werewolf":
            return "Queen";
        case "Attacked Idiot":
        case "Selected":
        case null:
            return "None";
    }
}

function getChessValue(name) {
    switch(name) {
        case "Pawn":
            return 1;
        case "Knight":
            return 3;
        case "King":
            return 3;
        case "Rook":
            return 5;
        case "Queen":
            return 9;
    }
}

// creates a piece object
function getPiece(name, metadata = {}) {
    var piece = { name: name, team: getTeam(name), chess: getChessName(name), enemyVisible: "Unknown", enemyVisibleStatus: 0, active: isActive(name) };
    switch(name) {
        case "Amnesiac":
            piece.convertTo = metadata.amnesiac;
        break;
    }
    return piece;
}

function loadDefaultSetup(board) {
    board[4][0] = getPiece("Hooker");
    board[4][1] = getPiece("Citizen");
    board[4][2] = getPiece("Citizen");
    board[4][3] = getPiece("Runner");
    board[4][4] = getPiece("Citizen");
    board[0][0] = getPiece("Wolf");
    board[0][1] = getPiece("Warlock");
    board[0][2] = getPiece("Wolf");
    board[0][3] = getPiece("Wolf");
    board[0][4] = getPiece("Alpha Wolf");
}

function loadPromoteTestSetup(board) {
    board[1][0] = getPiece("Citizen");
    board[3][4] = getPiece("Wolf");
}

function loadTestingSetup(board) {
    let testTown = "Fortune Teller";
    let testWolf = "Direwolf";
    board[4][0] = getPiece(testTown);
    board[4][1] = getPiece(testTown);
    board[4][2] = getPiece(testTown);
    board[4][3] = getPiece(testTown);
    board[4][4] = getPiece(testTown);
    board[0][0] = getPiece(testWolf);
    board[0][1] = getPiece(testWolf);
    board[0][2] = getPiece(testWolf);
    board[0][3] = getPiece(testWolf);
    board[0][4] = getPiece(testWolf);
}

function generateRoleList(board) {
    // name, chess value, wwr value, incompatible with, requires
    // all town pieces
    let town = [
        ["Citizen", 1, 0, [], ""],
        ["Ranger", 1, 1, [], ""],
        ["Huntress", 1, 5, [], ""],
        ["Bartender", 1, 1, [], "Alcoholic"],
        ["Fortune Apprentice", 1, 3, [], ""],
        ["Fortune Apprentice", 1, 3, [], ""], // double chance
        ["Child", 1, 2, [], ""],
        ["Hooker", 3, 4, [], ""],
        ["Idiot", 3, 2, [], ""],
        ["Crowd Seeker", 3, 2, ["FortuneTeller","AuraTeller"], ""],
        ["Aura Teller", 3, 2, ["FortuneTeller","CrowdSeeker"], ""],
        ["Royal Knight", 3, 2, [], ""],
        ["Alcoholic", 3, 4, [], "Bartender"],
        ["Amnesiac", 3, 1, [], []],
        ["Amnesiac", 3, 1, [], []],
        ["Fortune Teller", 5, 3, ["CrowdSeeker","AuraTeller"], ""],
        ["Runner", 5, 3, [], ""],
        ["Witch", 5, 2, [], ""],
        ["Cursed Civilian", 9, -3, [], ""],
    ];
    // all wolf pieces
    let wolf = [
        ["Wolf", 1, 0, [], ""],
        ["Wolf Cub", 1, 2, [], ""],
        ["Tanner", 1, 2, ["Sneaking Wolf"], ""],
        ["Archivist Fox", 1, 2, [], ""],
        ["Recluse", 1, 1, [], ""],
        ["Dog", 1, 3, ["Fox"], ""],
        ["Infecting Wolf", 3, 5, ["Saboteur Wolf"], ""],
        ["Alpha Wolf", 3, 3, [], ""],
        ["Psychic Wolf", 3, 2, ["Clairvoyant Fox","Warlock"], ""],
        ["Sneaking Wolf", 3, 1, ["Tanner"], ""],
        ["Direwolf", 3, 3, [], ""],
        ["Clairvoyant Fox", 3, 3, ["Warlock","Psychic Wolf"], ""],
        ["Fox", 3, 0, ["Dog"], ""],
        ["Scared Wolf", 5, 3, [], ""],
        ["Saboteur Wolf", 5, 3, ["Infecting Wolf"], ""],
        ["Warlock", 5, 5, ["Psychic Wolf","Clairvoyant Fox"], ""],
        ["White Werewolf", 9, 0, [], ""],
    ];
    // preparation
    let townSelected = [];
    let wolfSelected = [];
    let iterations = 0;
    let metadata = {};
    // attempt to select pieces
    while(iterations < 1000) {
        metadata = {};
        // select pieces TOWN
        townSelected = [];
        for(let i = 0; i < 5; i++) {
            townSelected.push(town[Math.floor(Math.random() * town.length)]);
            // add previous requirement if exists
            let prevReq = townSelected[townSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                townSelected.push(town.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // select pieces WOLF
        wolfSelected = [];
        for(let i = 0; i < 5; i++) {
            wolfSelected.push(wolf[Math.floor(Math.random() * wolf.length)]);
            // add previous requirement if exists
            let prevReq = wolfSelected[wolfSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                wolfSelected.push(wolf.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // EVALUATE setup
        // calculate values town
        let totalChessValueTown = townSelected.map(el => el[1]).reduce((a,b) => a+b);
        let totalWWRValueTown  = townSelected.map(el => el[2]).reduce((a,b) => a+b);
        let totalValueTown = totalChessValueTown + totalWWRValueTown;
        let combinedIncompTown = [].concat.apply([], townSelected.map(el => el[3]));
        // calculate values wolf
        let totalChessValueWolf = wolfSelected.map(el => el[1]).reduce((a,b) => a+b);
        let totalWWRValueWolf  = wolfSelected.map(el => el[2]).reduce((a,b) => a+b);
        let totalValueWolf = totalChessValueTown + totalWWRValueTown;
        let combinedIncompWolf = [].concat.apply([], wolfSelected.map(el => el[3]));
        
        // special handling
        // town
        let townNames = townSelected.map(el => el[0]);
        // AMNESIAC
        if(townNames.indexOf("Amnesiac") > -1) { // find 
            let amnesiacCount = townNames.filter(el => el=="Amnesiac").length
            let amnesiacRole = town[Math.floor(Math.random() * town.length)];
            if(amnesiacRole == "Amnesiac" || amnesiacRole == "Bartender" || (amnesiacRole == "Alcoholic" && townNames.indexOf("Alcoholic") == -1)) {
                console.log("DISCARD - Amnesiac");
                continue;
            }
            totalChessValueTown = totalChessValueTown - (amnesiacCount * 3) + (amnesiacCount * ((3 + amnesiacRole[1] * 3) / 4));
            totalWWRValueTown = totalChessValueTown - (amnesiacCount * 1) + (amnesiacCount * ((1 + amnesiacRole[2] * 3) / 4));
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
            totalWWRValueTown = totalChessValueTown - (faCount * 1) + (faCount * ((1 + faRole[2]) / 2));
            totalValueTown = totalChessValueTown + totalWWRValueTown;
        }
        
        // condition
        if(totalChessValueTown <= 15 && totalWWRValueTown <= 12 && totalValueTown <= 23 && totalChessValueWolf <= 15 && totalWWRValueWolf <= 12 && totalValueWolf <= 23 && townSelected.length == 5 && wolfSelected.length == 5 && combinedIncompTown.indexOf(townSelected[0]) == -1 && (totalValueTown == totalValueWolf || totalValueTown+1 == totalValueWolf || totalValueTown-1 == totalValueWolf) &&combinedIncompTown.indexOf(townSelected[1]) == -1 && combinedIncompTown.indexOf(townSelected[2]) == -1 && combinedIncompTown.indexOf(townSelected[3]) == -1 && combinedIncompTown.indexOf(townSelected[4]) == -1 && combinedIncompWolf.indexOf(townSelected[0]) == -1 && combinedIncompWolf.indexOf(townSelected[1]) == -1 && combinedIncompWolf.indexOf(townSelected[2]) == -1 && combinedIncompWolf.indexOf(townSelected[3]) == -1 && combinedIncompWolf.indexOf(townSelected[4]) == -1) {
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
    for(let i = 0; i < 5; i++) {
        board[4][i] = getPiece(townSelected[i][0], metadata);
        board[0][i] = getPiece(wolfSelected[i][0], metadata);
    }
}

// randomizes an array
function randomize(arr) {
    return arr .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
}

// setups a new game
const emptyBoard = [[getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)]];
function createGame(playerID, playerID2, gameID, name1, name2, channel, guild) {
    // store players as playing players
    players.push([playerID, gameID]);
    if(playerID2) players.push([playerID2, gameID]);
    // create a blank new board
    let newBoard = deepCopy(emptyBoard);
    // put pieces on board
    
    //loadDefaultSetup(newBoard);
    //generateRoleList(newBoard);
    
    //loadPromoteTestSetup(newBoard);
    loadTestingSetup(newBoard);
    
    // push game to list of games
    games.push({id: gameID, players: [ playerID, playerID2 ], playerNames: [ name1, name2 ], state: newBoard, turn: 0, channel: channel, guild: guild, lastMoves: [], concluded: false, selectedPiece: null, doubleMove0: false, doubleMove1: false, inDoubleMove: false, msg: null });
}

// destroys a game
function destroyGame(id) {
    console.log("DESTROY", id);
    console.log("PRE", players);
    players = players.filter(el => el[1] != id); // delete players from playing players
    console.log("POST", players);
    games[id] = null; // remove game from game list
}

// concludes a game (reveals all pieces)
function concludeGame(id) {
    console.log("CONCLUDE", id);
    let concludedGame = games[id];
    if(!concludedGame.state) return;
    for(let y = 0; y < 5; y++) {
        for(let x = 0; x < 5; x++) {
            concludedGame.state[y][x].enemyVisibleStatus = 6;
        }
    }
    concludedGame.concluded = true;
    
    console.log("CONCLUDE UPDATE", id);
    // Update Spectator Board
    let msgSpec = displayBoard(games[id], "SPECTATOR BOARD", [], -1);
    msgSpec.ephemeral = false;
    games[id].msg.edit(msgSpec);
}

// turn = 0 for town, 1 for wolves
function showMoves(gameID, turn, abilities = false) {
    let currentGame = games[gameID];
    let board = renderBoard(currentGame);
    let interactions;
    if(!abilities) interactions = generateInteractions(currentGame.state, turn);
    else interactions = generateAbilities(currentGame.state, turn);
    return { content: board, ephemeral: true, fetchReply: true, components: [ { type: 1, components: interactions } ] }
}

function isPawn(name) {
    return name.chess === "Pawn";
}

function getUnicode(chessName, team) {
    switch(chessName) {
        case "Pawn":
            return team?"♙":"♟︎";
        case "King":
            return team?"♔":"♚";
        case "Knight":
            return team?"♘":"♞";
        case "Rook":
            return team?"♖":"♜";
        case "Queen":
            return team?"♕":"♛";
        case "None":
            return team?"◼️":"◻️";
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
    console.log("Finding moves for ", piece.name, " @ ", x, "|", numToRank(x), " ", y);
    const pieceTeam = piece.team;
    const enemyTeam = (pieceTeam + 1) % 2;
    const pieceType = piece.chess;
    // Movement Logic
    /* PAWN */
    if(pieceType == "Pawn" && pieceTeam == 0) {
        if(y>0) {
            if(board[y-1][x].name == null) positions.push([x, y-1]);
            if(x>0 && board[y-1][x-1].name != null && board[y-1][x-1].team == enemyTeam) positions.push([x-1, y-1, true]);
            if(x<4 && board[y-1][x+1].name != null && board[y-1][x+1].team == enemyTeam) positions.push([x+1, y-1, true]);
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 1) {
        if(y<4) {
            if(board[y+1][x].name == null) positions.push([x, y+1]);
            if(x>0 && board[y+1][x-1].name != null && board[y+1][x-1].team == enemyTeam) positions.push([x-1, y+1, true]);
            if(x<4 && board[y+1][x+1].name != null && board[y+1][x+1].team == enemyTeam) positions.push([x+1, y+1, true]);
        }            
    } 
    /* ROOK */
    else if(pieceType == "Rook") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(inBounds(xt1) && board[y][xt1].team == enemyTeam) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(inBounds(xt2) && board[y][xt2].team == enemyTeam) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(inBounds(yt1) && board[yt1][x].team == enemyTeam) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(inBounds(yt2) && board[yt2][x].team == enemyTeam) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
    } /* QUEEN */
    else if(pieceType == "Queen") {
        for(let xt1 = x+1; xt1 < 5; xt1++) {
            if(inBounds(xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(inBounds(xt1) && board[y][xt1].team == enemyTeam) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBounds(xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(inBounds(xt2) && board[y][xt2].team == enemyTeam) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < 5; yt1++) {
            if(inBounds(yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(inBounds(yt1) && board[yt1][x].team == enemyTeam) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBounds(yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(inBounds(yt2) && board[yt2][x].team == enemyTeam) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 0; offset < 5; offset--) {
            if(inBounds(x+offset, y+offset) && board[y+offset][x+offset].name == null) {
                positions.push([x+offset, y+offset]);
            } else if(inBounds(x+offset, y+offset) && board[y+offset][x+offset].team == enemyTeam) {
                positions.push([x+offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 0; offset < 5; offset--) {
            if(inBounds(x-offset, y+offset) && board[y+offset][x-offset].name == null) {
                positions.push([x-offset, y+offset]);
            } else if(inBounds(x-offset, y+offset) && board[y+offset][x-offset].team == enemyTeam) {
                positions.push([x-offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 0; offset < 5; offset--) {
            if(inBounds(x+offset, y-offset) && board[y-offset][x+offset].name == null) {
                positions.push([x+offset, y-offset]);
            } else if(inBounds(x+offset, y-offset) && board[y-offset][x+offset].team == enemyTeam) {
                positions.push([x+offset, y-offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 0; offset < 5; offset--) {
            if(inBounds(x-offset, y-offset) && board[y-offset][x-offset].name == null) {
                positions.push([x-offset, y-offset]);
            } else if(inBounds(x-offset, y-offset) && board[y-offset][x-offset].team == enemyTeam) {
                positions.push([x-offset, y-offset, true]);
                break;
            } else {
                break;
            }
        }
    }
    /* KING */
    else if(pieceType == "King") {
        let possibleMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(inBounds(px, py) && board[py][px].team == enemyTeam) positions.push([px, py, true]);
        }
    }
    /* KNIGHT */
    else if(pieceType == "Knight") {
        let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(inBounds(px, py) && board[py][px].team == enemyTeam) positions.push([px, py, true]);
        }
    }
    positions.sort((a,b) => (xyToName(a[0], a[1]) > xyToName(b[0], b[1])) ? 1 : ((xyToName(b[0], b[1]) > xyToName(a[0], a[1])) ? -1 : 0));
    return positions;
}

function interactionsFromPositions(positions, from, back = "turnstart", action = "move") {
    let interactions = [{ type: 2, label: "Back", style: 4, custom_id: back }];
    for(let i = 0; i < positions.length; i++) {
        interactions.push({ type: 2, label: xyToName(positions[i][0], positions[i][1]) + (positions[i][2]?" ✘":""), style:  (positions[i][2]?3:1), custom_id: action + "-" + from + "-" + xyToName(positions[i][0], positions[i][1]) });
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
            if(board[y][x].team == team) {
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: isPawn(board[y][x]) ? 2 : 1, custom_id: "select-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function generateAbilities(board, team) {
    let interactions = [];
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == team && board[y][x].active) {
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: 1, custom_id: "ability-" + xyToName(x, y) });
            }
        }
    }
    return interactions;
}

function renderBoard(game, message = "Turn", turnOverride = null) {
    let board = game.state;
    let boardMsg = "**" + game.playerNames[0] + " vs. " + game.playerNames[1] +  "**\n" + "**" + message + "**\n";
    let boardRows = ["🟦🇦​🇧​🇨​🇩​🇪"];
    let visiblePieces = [];
    const letterRanks = ["🇦","🇧","🇨","🇩","​🇪"];
    const numberRow = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣"];
    const curTurn = turnOverride != null ? turnOverride : game.turn;
    for(let y = 0; y < board.length; y++) {
        let row = numberRow[y];
        for(let x = 0; x < board[0].length; x++) {
                row += renderField(board[y][x], x, y, curTurn);
                if(board[y][x].name != null && board[y][x].team == curTurn) visiblePieces.push(board[y][x].name);
                else if(board[y][x].name != null && board[y][x].team != curTurn && board[y][x].enemyVisibleStatus == 6) visiblePieces.push(board[y][x].name);
        }
        boardRows.push(row);
        row = "";
    }
    // display last moves
    for(let i = 0; i < boardRows.length; i++) {
        boardRows[i] += "🟦";
        if(i == 0) {
            boardRows[i] += "🇱​🇦​🇸​🇹​🇲​🇴​🇻​🇪​🇸";
        } else {
            boardRows[i] += "🟦";
            let lmIndex = game.lastMoves.length - i;
            if(game.lastMoves[lmIndex]) {
                let lmMsg = "";
                let lm = game.lastMoves[lmIndex];
                let moveFrom = nameToXY(lm[3]);
                let moveTo = nameToXY(lm[4]);
                if(lm[0] == 0) lmMsg += "⬜"; 
                else lmMsg += "⬛";
                if(lm[0] == curTurn || lm[5] == 6) lmMsg += findEmoji(lm[1]);
                else lmMsg += findEmoji((lm[0] == 0?"white":"black") + lm[2]);
                lmMsg += letterRanks[moveFrom.x];
                lmMsg += numberRow[moveFrom.y];
                if(lm.length == 6) {
                    lmMsg += "▶️";
                    lmMsg += letterRanks[moveTo.x];
                    lmMsg += numberRow[moveTo.y];
                } else {
                    lmMsg += lm[6];
                }
                boardRows[i] += lmMsg + "🟦";
            } else {
                boardRows[i] += "🟦🟦🟦🟦🟦🟦🟦🟦";
            }
        }
    }
    // divider
    boardRows.push("🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦");
    // add explanations for visible pieces
    if(game.selectedPiece) visiblePieces.push(game.selectedPiece.name);
    visiblePieces = [...new Set(visiblePieces)];
    visiblePieces.sort();
    for(let i = 0; i < visiblePieces.length; i++) {
        boardRows.push(findEmoji((getTeam(visiblePieces[i])?"Black":"White") + getChessName(visiblePieces[i])) + " " + findEmoji(visiblePieces[i]) + " **" + visiblePieces[i] + " (" + getChessName(visiblePieces[i]) + "):** " + getAbilityText(visiblePieces[i]));
    }
    return boardMsg + boardRows.join("\n");
}

// find an emoji by name
function findEmoji(name) {
    name = name.toLowerCase().replace(/[^a-z]/g,"");
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
    switch(field.name) {
        default: 
            // get name
            let fieldName;
            if(field.team == turn || field.enemyVisibleStatus == 6) fieldName = field.name;
            else fieldName = (field.team?"black":"white") + field.enemyVisible;
            // get emoji
            return findEmoji(fieldName);
        case null:
            return findEmoji(((x&1)^(y&1))?"whitesquare":"blacksquare");
        case "Selected":
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
