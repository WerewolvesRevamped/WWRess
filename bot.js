/* Discord */
const { Client, Intents, ApplicationCommandOptionType } = require('discord.js');
global.client = new Client({ intents: ['GUILDS', 'GUILD_WEBHOOKS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'] });
config = require("./config.json");

/* Setup */
client.on("ready", () => {
    // on bot ready
    registerCommands();
});


/** AI **/
const PawnValue = 2.0;
const KingValue = 4.0; 
const KnightValue = 4.0;
const RookValue = 7.0;
const QueenValue = 13.0;
const NoneValue = 0.25;

const UnknownValue = 5.0;
const LikelyPawnValue = 3.0;
const LikelyKingValue = 5.0;
const LikelyKnightValue = 4.5;
const LikelyRookValue = 8.0;

const PawnTable = [
    [0.5, 1.0, -1.0, 1.0, 0.5],
    [0.5, -1.0, 0.0, -1.0, 0.5],
    [0.5, 1.5, 2.5, 1.5, 0.5],
    [2.0, 3.0, 5.0, 3.0, 2.0],
    [0.0, 0.0, 0.0, 0.0, 0.0]
];

const KingTable = [
    [-2.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 1.0, 1.5, 1.0, -1.0],
    [-1.0, 1.5, 2.0, 1.5, -1.0],
    [-1.0, 1.0, 1.5, 1.0, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -2.0]
];

const KnightTable = [
    [-5.0, -4.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0, 0.5, -2.0, -4.0],
    [-3.0, 0.5, 2.0, 0.5, -3.0],
    [-4.0, -2.0, 0.5, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -4.0, -5.0]
];

const RookTable = [
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, -0.5],
    [0.0, 1.0, 1.0, 1.0, 0.0]
];

const QueenTable = [
    [0.5, 2.0, 1.0, 2.0, 0.5],
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [0.0, 0.5, 0.5, 0.5, 0.0],
    [-0.5, 0.5, 0.5, 0.5, -0.5],
    [-1.5, -0.5, -0.5, -0.5, -1.5]
];

const NoneTable = [
    [0.0, -0.5, -1.0, -0.5, 0.0],
    [0.0, -0.5, -1.5, -0.5, 0.0],
    [0.0, -0.5, -2.0, -0.5, 0.0],
    [0.5, -1.5, -2.5, -1.5, 0.5],
    [0.5, 1.0, 1.5, 1.0, 0.5]
];

const SoloTable = [
    [-1.0, -0.75, -0.25, -0.75, -1.0],
    [-0.5, 0.5, 1.0, 0.5, -0.5],
    [0.0, 1.0, 2.0, 1.0, 0.0],
    [-0.5, 0.5, 1.0, 0.5, -0.5],
    [-1.0, -0.75, -0.25, -0.75, -1.0]
];

function getEvaluationData(piece) {
    switch(piece) {
        case "Pawn": case "ActivePawn":
            return { value: PawnValue, table: PawnTable };
        case "King": case "ActiveKing":
            return { value: KingValue, table: KingTable };
        case "Knight": case "ActiveKnight":
            return { value: KnightValue, table: KnightTable };
        case "Rook": case "ActiveRook":
            return { value: RookValue, table: RookTable };    
        case "Queen": case "ActiveQueen":
            return { value: QueenValue, table: QueenTable };   
        case "None":
            return { value: NoneValue, table: NoneTable };    
        case "LikelyPawn":
            return { value: LikelyPawnValue, table: PawnTable };    
        case "LikelyKing":
            return { value: LikelyKingValue, table: KingTable };    
        case "LikelyKnight":
            return { value: LikelyKnightValue, table: KnightTable };    
        case "LikelyRook": case "LikelyRook":
            return { value: LikelyRookValue, table: RookTable };    
        default:
            return { value: PawnValue, table: PawnTable };
        case "Unknown":
            return { value: UnknownValue, table: KingTable };
        break;
    }
}

function table(defTable, tbl, x, y, boardWidthFactor, boardHeightFactor) {
    if(defTable) return tbl[y][x];
    else return tbl[Math.floor(y * boardHeightFactor)][Math.floor(x * boardWidthFactor)];
}

function evaluate(AI, game, visiblePieces = null) {
    let board = game.state;
    // determine material + position
    let whiteValue = 0, blackValue = 0, goldValue = 0;
    let whiteReveal = 0, blackReveal = 0, goldReveal = 0;
    let boardHeight = board.length;
    let boardWidth = board[0].length;
    let boardHeightFactor = 5 / boardHeight;
    let boardWidthFactor = 5 / boardWidth;
    let defTable = boardWidthFactor == 1 && boardHeightFactor == 1;
    for(let y = 0; y < boardHeight; y++) {
        for(let x = 0; x < boardWidth; x++) {
            let piece = board[y][x];
            // get piece value
            if(piece.team === 0) { // team white
                if(visiblePieces != 0 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    whiteValue += evData.value + table(defTable, evData.table, x, boardHeight-1 - y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);
                }
                whiteReveal += piece.enemyVisibleStatus / 7;
            } else if(piece.team === 1) { // team black
                if(visiblePieces != 1 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    blackValue += evData.value + table(defTable, evData.table, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);  
                }
                blackReveal += piece.enemyVisibleStatus / 7;
            } else if(piece.team === 2) { // team gold
                if(visiblePieces != 2 && (piece.enemyVisibleStatus < 6 || (piece.enemyVisibleStatus == 6 && piece.disguise))) { // hidden piece
                    if(piece.enemyVisibleStatus < 6) {
                        let evData = getEvaluationData(piece.enemyVisible);
                        goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + 4;
                    } else if(piece.enemyVisibleStatus == 6) {
                        let evData = getEvaluationData(getChessName(piece.disguise));
                        goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.disguise);
                    }
                } else { // revealed piece
                    let evData = getEvaluationData(piece.chess);
                    goldValue += evData.value + table(defTable, SoloTable, x, y, boardWidthFactor, boardHeightFactor) + getWWRevalValue(piece.name);  
                }
                goldReveal += (piece.enemyVisibleStatus / 7) * 10;
            }
            
            // solo extra evaluation
            if(game.solo && (AI == 2 || (AI != 2 && game.soloRevealed)) && !game.goldEliminated) {
                switch(game.soloTeam) {
                    case "Flute":
                        if(piece.enchanted) {
                            goldValue += 5;
                        }
                    break;
                    default:
                    break;
                }
            }
            // solo extra eval end
        }
    }
    // calculate value
    switch(AI) {
        case 0: // white ai
            return (whiteValue + blackReveal + goldReveal) - (blackValue + goldValue + whiteReveal);
        case 1: // black ai
            return (blackValue + whiteReveal + goldReveal) - (whiteValue + goldValue + blackReveal);
        case 2: // gold ai
            return (goldValue + whiteReveal + blackReveal) - (whiteValue + blackValue + goldReveal);
    }
}

// serializes the board
function serialize(turn, board) {
    let serialized = "";
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            let piece = board[y][x];
            if(piece.team >= 0) serialized += piece.chess.substr(0, 2) + piece.team + piece.name.substr(0, 2) + piece.enemyVisibleStatus;
            else serialized += "-";
        }
    }
    return turn + "." + serialized;
}

// takes a game, a piece name, an argument for the ability + log value
function executeActiveAbility(game, abilityPiece, abilityPieceLocation, position, log = true) {
    let gameHistory = gamesHistory[game.id];
    switch(abilityPiece) {
        case null: default:
            return false;
        break;
        case "Recall":
        case "Alpha Wolf":
            let recallSubject = { x: position[0], y: position[1] };
            let recallSubjectObject = game.state[recallSubject.y][recallSubject.x];
            game.state[0][recallSubject.x] = deepCopy(recallSubjectObject);
            game.state[recallSubject.y][recallSubject.x] = getPiece(null);
            if(log) gameHistory.lastMoves.push([game.turn, recallSubjectObject.name, recallSubjectObject.disguise, recallSubjectObject.enemyVisible, xyToName(position[0], position[1]), xyToName(position[0], 0), recallSubjectObject.enemyVisibleStatus, "⤴️"]);
            return true;
        break;
        case "Tan": // Tanner - Player
            let tanDisSubject = position[0];
            game.state[tanDisSubject.y][tanDisSubject.x].disguise = position[1];
            return false;
        break;
        case "Tanner": // Tanner - AI
            let tanSubject = { x: position[0], y: position[1] };
            let tanSubjectObject = game.state[tanSubject.y][tanSubject.x];
            let disguise;
            switch(tanSubjectObject.enemyVisibleStatus < 6 ? tanSubjectObject.enemyVisible : tanSubjectObject.chess) {
                case "LikelyPawn": case "Pawn":
                default:
                    disguise = "Wolf";
                break;
                case "LikelyKing": case "King":
                    disguise = "Psychic Wolf";
                break;
                case "LikelyKnight": case "Knight":
                    disguise = "Fox";
                break;
                case "LikelyRook": case "Rook":
                case "LikelyQueen": case "Queen":
                    disguise = "Scared Wolf";
                break;
            }
            game.state[tanSubject.y][tanSubject.x].disguise = disguise;
            return false;
        break;
        case "Hide":
        case "Hooker":
            let hideSubject = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let hideTarget = xyToName(position[0], position[1]);
            game.state[hideSubject.y][hideSubject.x].hidden = hideTarget;
            return false;
        break;
        case "Sabotage":
        case "Saboteur Wolf":
            let sabotageTarget = { x: position[0], y: position[1] };
            let sabotageTargetObject = game.state[sabotageTarget.y][sabotageTarget.x];
            game.state[sabotageTarget.y][sabotageTarget.x].sabotaged = true;
            let sabotageTargetName = xyToName(sabotageTarget.x, sabotageTarget.y);
            if(log) gameHistory.lastMoves.push([game.turn, sabotageTargetObject.name, sabotageTargetObject.disguise, sabotageTargetObject.enemyVisible, sabotageTargetName, sabotageTargetName, sabotageTargetObject.enemyVisibleStatus, "⛔🟦🟦"]);
            return false;
        break;
        case "Protect":
        case "Witch":
        case "Royal Knight":
            let protectTarget = { x: position[0], y: position[1] };
            game.state[protectTarget.y][protectTarget.x].protected = true;
            game.state[protectTarget.y][protectTarget.x].protectedBy = 0;
            return false;
        break;
        case "Enchant":
        case "Flute Player":
            let enchantTarget = { x: position[0], y: position[1] };
            let enchantSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let enchantSourceObject = game.state[enchantSource.y][enchantSource.x];
            game.state[enchantTarget.y][enchantTarget.x].enchanted = true;
            game.state[enchantTarget.y][enchantTarget.x].soloEffect = true;
            game.state[abilityPieceLocation[1]][abilityPieceLocation[0]].stay = true;
            game.state[abilityPieceLocation[1]][abilityPieceLocation[0]].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, enchantSourceObject.name, enchantSourceObject.disguise, enchantSourceObject.enemyVisible, xyToName(enchantSource.x, enchantSource.y), xyToName(enchantTarget.x, enchantTarget.y), enchantSourceObject.enemyVisibleStatus, "🎶"]);
            return false;
        break;
        case "Infect":
        case "Infecting Wolf":
            let iwSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let iwTarget = { x: position[0], y: position[1] };
            let iwTargetName = xyToName(iwTarget.x, iwTarget.y);
            if(log) gameHistory.lastMoves.push([game.turn, game.state[iwTarget.y][iwTarget.x].name, false, "", iwTargetName, iwTargetName, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
            game.state[iwSource.y][iwSource.x] = getPiece("Wolf");
            game.state[iwTarget.y][iwTarget.x] = getPiece("Wolf");
            game.state[iwSource.y][iwSource.x].enemyVisibleStatus = 7;
            game.state[iwTarget.y][iwTarget.x].enemyVisibleStatus = 7;
            return true;
        break;
        case "Transform":
        case "Dog":
            let transformer = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            game.state[transformer.y][transformer.x] = convertPiece(game.state[transformer.y][transformer.x], position);
            return false;
        break;
        case "Invest":
        case "Fortune Teller":
        case "Warlock":
        case "Clairvoyant Fox":
        case "Crowd Seeker":
        case "Psychic Wolf":
        case "Archivist Fox":
        case "Aura Teller":
            let investigatorC = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let investigator = game.state[investigatorC.y][investigatorC.x];
            let investTarget = { x: position[0], y: position[1] };
            let investTargetObject = game.state[investTarget.y][investTarget.x];
            let investSuccess = false;
            switch(investigator.name) {
                // reveal role
                case "Fortune Teller":
                case "Warlock":
                case "Clairvoyant Fox":
                    if(investTargetObject.disguise) {
                        if(investTargetObject.enemyVisibleStatus < 6) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 6;
                    } else {
                        if(investTargetObject.enemyVisibleStatus < 7) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 7;
                    }
                break;
                // reveal movement type
                case "Crowd Seeker":
                case "Psychic Wolf":
                case "Archivist Fox":
                    if(investTargetObject.enemyVisibleStatus < 4) investSuccess = true;
                    investTargetObject.enemyVisibleStatus = 4;
                    if(investTargetObject.disguise) {
                        let dChess = getChessName(investTargetObject.disguise);
                        if(investTargetObject.enemyVisible != dChess) investSuccess = true;
                        investTargetObject.enemyVisible = dChess;
                    } else {
                        if(investTargetObject.enemyVisible != investTargetObject.chess) investSuccess = true;
                        investTargetObject.enemyVisible = investTargetObject.chess;
                    }
                break;
                // reveal movement type if active
                case "Aura Teller":
                    if(investTargetObject.active) {
                        if(investTargetObject.enemyVisibleStatus < 5) investSuccess = true;
                        investTargetObject.enemyVisibleStatus = 5;
                        investTargetObject.atChecked = 5;
                        if(investTargetObject.disguise) {
                            let dChess = getChessName(investTargetObject.disguise);
                            if(investTargetObject.enemyVisible != "Active"+dChess) investSuccess = true;
                            investTargetObject.enemyVisible = "Active" + dChess;
                        } else {
                            if(investTargetObject.enemyVisible != "Active" + investTargetObject.chess) investSuccess = true;
                            investTargetObject.enemyVisible = "Active" + investTargetObject.chess;
                        }
                    }
                break;
            }
            if(investTargetObject.name == "Recluse") { // recluse reveal
                investSuccess = true;
                if(log) gameHistory.lastMoves.push([game.turn, investigator.name, false, "", xyToName(investigatorC.x, investigatorC.y), xyToName(investTarget.x, investTarget.y), 7, "👁️"]);
                investigator.enemyVisibleStatus = 7;
                investTargetObject.enemyVisibleStatus = 7;
            } else {
                if(log && investSuccess) {
                    gameHistory.lastMoves.push([game.turn, investTargetObject.name, investTargetObject.disguise, investTargetObject.enemyVisible, xyToName(investTarget.x, investTarget.y), xyToName(investTarget.x, investTarget.y), investTargetObject.enemyVisibleStatus, "👁️🟦🟦"]);
                }
            }
            return false;
        break;
    }
    return false;
}

function getChildren(game, maxDepth = 0, depth = 0, maximizingPlayer = true) {
    let board = game.state;
    // get all available pieces
    let pieces = [];
    let abilityPieces = [];
    let enemyPieces = [];
    let skipPointless = false; // some abilities are unlimited, so always better than nothing
    // some roles have abilities that arent position based, so if they exist twice its just the same thing twice
    let csFound = false;
    let afFound = false;
    let pwFound = false;
    let atFound = false;
    let tFound = false;
    let cfFound = false;
    let awFound = false;
    // iterate through pieces, to find ability pieces
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(board[y][x].team == game.turn) {
                pieces.push(xyToName(x, y));
                if(board[y][x].active && !board[y][x].sabotaged && !board[y][x].enchanted && (maximizingPlayer || board[y][x].enemyVisibleStatus >= 6)) {
			        let abilityPieceName = (!maximizingPlayer && board[y][x].disguise && board[y][x].enemyVisibleStatus == 6) ? board[y][x].disguise : board[y][x].name;
                    // active ability priorities
                    switch(abilityPieceName) {
                        // done by self this turn
                        case "Crowd Seeker":
                            if(depth >= maxDepth && !csFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            csFound = true;
                        break;
                        case "Archivist Fox":
                            if(depth >= maxDepth && !afFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            afFound = true;
                        break;
                        case "Psychic Wolf":
                            if(depth >= maxDepth && !pwFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            pwFound = true;
                        break;
                        case "Aura Teller":
                            if(depth >= maxDepth && !atFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            atFound = true;
                        break;
                        case "Tanner":
                            if(depth >= maxDepth && !tFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                skipPointless = true;
                            }
                            tFound = true;
                        break;
                        case "Fortune Teller": case "Warlock":
                            if(depth >= maxDepth) {
                                abilityPieces.push([board[y][x].name, x, y]);
                                let positionsCheck = generatePositions(game.state, xyToName(x, y), true).filter(el => el[2]); // only select moves with targets;
                                if(positionsCheck.length >= 1) skipPointless = true;
                            }
                        break;
                        case "Clairvoyant Fox": 
                            if(depth >= maxDepth && !cfFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                            }
                            cfFound = true;
                        break;
                        // done by enemy next turn 
                        case "Hooker":
                            if(depth >= (maxDepth-1)) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // done by self in next turn
                        case "Saboteur Wolf": 
                            if(depth >= (maxDepth-2)) abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // whenever
                        case "Infecting Wolf": case "Dog": case "Flute Player":
                            abilityPieces.push([board[y][x].name, x, y]);
                        break;
                        // whenever
                        case "Alpha Wolf":
                            if(!awFound) {
                                abilityPieces.push([board[y][x].name, x, y]);
                            }
                            awFound = true;
                        break;
                    }
                    // end priorities
                }
            } else if(enemyTeam(game.turn, board[y][x].team)) {
                enemyPieces.push([x, y, board[y][x].enemyVisibleStatus]);
            }
        }
    }
    
    // find all possible ability/move combinations
    let children = [];
    // option to not use an ability
    if(!skipPointless) abilityPieces.unshift([null,0,0]);
    // iterate ability pieces
    for(let abilityPiece of abilityPieces) {
        // find valid options for ability
        let abilityPositions = [];
        switch(abilityPiece[0]) {
            case null: default:
                abilityPositions = [[null]];
            break;
            // targetable enemy
            case "Fortune Teller": case "Warlock": case "Infecting Wolf": case "Saboteur Wolf":
                abilityPositions = generatePositions(game.state, xyToName(abilityPiece[1], abilityPiece[2]), true).filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
            break;
            // all enemy
            case "Clairvoyant Fox": case "Crowd Seeker": case "Archivist Fox": case "Psychic Wolf": case "Aura Teller":
                let status = 0;
                // only select the investigation that reveals most
                while(status < 7) {
                    abilityPositions = enemyPieces.filter(el => el[2] == status).map(el => [el[0], el[1]]);
                    if(abilityPositions.length > 0) break;
                    status++;
                }
                // there is no real priority otherwise
                if(abilityPositions.length > 1) { 
                    abilityPositions = abilityPositions.slice(0, 1);
                }
                // if no target could be found, provide no ability as an option instead
                if(abilityPositions.length == 0) { 
                    abilityPiece = [null, 0, 0];
                    abilityPositions = [[null]]; 
                }
            break;
            // all enemy pieces
            case "Flute Player":
                abilityPositions = enemyPieces.filter(el => !game.state[el[1]][el[0]].enchanted).map(el => [el[0], el[1]]);
                abilityPositions = randomize(abilityPositions).splice(0, 4); // reduce amount of targets to maximum of 4
            break;
            // all ally
            case "Tanner":
                abilityPositions = pieces.map(el => {
                    let tanXY = nameToXY(el);
                    return [tanXY.x, tanXY.y];
                });
            break;
            // dog
            case "Dog":
                abilityPositions = ["Wolf Cub","Fox"];
            break;
            // adjacent ally
            case "Hooker":
                let ax = abilityPiece[1], ay = abilityPiece[2];
                if(inBounds(game.width, game.height, ax, ay-1) && game.state[ay-1][ax].team == 0) abilityPositions.push([ax, ay-1]);
                if(inBounds(game.width, game.height, ax, ay+1) && game.state[ay+1][ax].team == 0) abilityPositions.push([ax, ay+1]);
                if(inBounds(game.width, game.height, ax-1, ay-1) && game.state[ay-1][ax-1].team == 0) abilityPositions.push([ax-1, ay-1]);
                if(inBounds(game.width, game.height, ax-1, ay) && game.state[ay][ax-1].team == 0) abilityPositions.push([ax-1, ay]);
                if(inBounds(game.width, game.height, ax-1, ay+1) && game.state[ay+1][ax-1].team == 0) abilityPositions.push([ax-1, ay+1]);
                if(inBounds(game.width, game.height, ax+1, ay-1) && game.state[ay-1][ax+1].team == 0) abilityPositions.push([ax+1, ay-1]);
                if(inBounds(game.width, game.height, ax+1, ay) && game.state[ay][ax+1].team == 0) abilityPositions.push([ax+1, ay]);
                if(inBounds(game.width, game.height, ax+1, ay+1) && game.state[ay+1][ax+1].team == 0) abilityPositions.push([ax+1, ay+1]);
            break;
            // alpha wolf
            case "Alpha Wolf":
                for(let i = 0; i < pieces.length; i++) {
                        let coords = nameToXY(pieces[i]);
                        if(game.state[0][coords.x].name == null) abilityPositions.push([coords.x, coords.y]);
                }
            break;
        }
        
        for(const abilityPosition of abilityPositions) {
            // make a copy
            let gameCopy = deepCopy(game); // create a copy of the game to simulate the move on
            gameCopy.ai = true; // mark as AI game
            gameCopy.id = null;
            // execute ability
            let piecesChanged = false
            if(abilityPiece[0] != null) {
                piecesChanged = executeActiveAbility(gameCopy, abilityPiece[0], [abilityPiece[1], abilityPiece[2]], abilityPosition, false);
            }
            
            // redetermine pieces if positions have changed
            if(piecesChanged) {
                pieces = [];
                for(let y = 0; y < gameCopy.height; y++) {
                    for(let x = 0; x < gameCopy.width; x++) {
                        if(gameCopy.state[y][x].team == gameCopy.turn) {
                            pieces.push(xyToName(x, y));
                        }
                    }
                }
            }
            
            // START continue with normal move
            // iterate through all pieces
            for(let i = 0; i < pieces.length; i++) {
                let selectedPiece = pieces[i];
                let positions;
                if(maximizingPlayer) { // own piece
                    positions = generatePositions(gameCopy.state, selectedPiece, true);
                } else { // enemy piece
                    let selectedPieceCoords = nameToXY(selectedPiece);
                    let selectedPieceObject = gameCopy.state[selectedPieceCoords.y][selectedPieceCoords.x];
                    switch(selectedPieceObject.enemyVisibleStatus) {
                        default: case 7: // type known
                            positions = generatePositions(gameCopy.state, selectedPiece, true);
                        break;
                        case 4: case 5: case 6: // type could be disguise
                            if(selectedPieceObject.disguise) {
                                positions = generatePositions(gameCopy.state, selectedPiece, true, getChessName(selectedPieceObject.disguise));
                            } else {
                                positions = generatePositions(gameCopy.state, selectedPiece, true);
                            }
                        break;
                        case 0: case 1: case 2: case 3: // type unknown
                            switch(selectedPieceObject.enemyVisible) {
                                default:
                                    positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                                break;
                                case "LikelyRook":
                                    positions = generatePositions(gameCopy.state, selectedPiece, true, "Rook");
                                break;
                                case "LikelyKing":
                                    positions = generatePositions(gameCopy.state, selectedPiece, true, "King");
                                break;
                                case "LikelyPawn":
                                    positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                                break;
                                case "LikelyKnight":
                                    positions = generatePositions(gameCopy.state, selectedPiece, true, "Knight");
                                    if(depth >= (maxDepth-1)) {  // on first move consider it could be a amnesiac->pawn
                                        positions.push(...generatePositions(gameCopy.state, selectedPiece, true, "Pawn"));
                                    }
                                break;
                                case "Unknown":
                                    if(depth >= (maxDepth-1)) { // on the first move, consider king and knight
                                        positions = generatePositions(gameCopy.state, selectedPiece, true, "King");
                                        positions.push(...generatePositions(gameCopy.state, selectedPiece, true, "Knight"));
                                    } else { // otherwise just pawn
                                        positions = generatePositions(gameCopy.state, selectedPiece, true, "Pawn");
                                    }
                                break;
                            }
                        break;
                    }
                }
                // iterate through that piece's moves
                for(let j = 0; j < positions.length; j++) {
                    let gameInnerCopy = deepCopy(gameCopy); // create a copy of the game to simulate the move on
                    let selectedMove = positions[j];
                    // simulate move
                    movePiece(null, gameInnerCopy, selectedPiece, xyToName(selectedMove[0], selectedMove[1]));
                    //if(depth==4) console.log(abilityPiece, "~", abilityPosition, "|", selectedPiece, ">", selectedMove);
                    children.push([abilityPiece, abilityPosition, selectedPiece, selectedMove, gameInnerCopy]);
                }
            }
            // END normal move section
        }
    }
    // END ability section
    
	return children; // 0 -> ability piece, 1 -> ability usage, 2 -> piece, 3 -> move, 4 -> state
}

// on the first iteration save and return the move
function minimaxStart(AI, game, maxDepth, depth, alpha = -Infinity, beta = Infinity) {
    let board = game.state;
    if ((game.players.length == 2 && !canMove(board, (AI+1)%2)) || (game.players.length == 3 && !canMove(board, (AI+1)%3) && !canMove(board, (AI+2)%3)) || (AI == 2 && soloWin(board, game.soloTeam)) || (AI == 2 && uaWin(board, game.soloTeam))) {
        return { value: 1000 - (maxDepth - depth), move: null }; // game winning move
    }
    if (!canMove(board, AI) || (AI != 2 && game.solo && game.soloRevealed && soloWin(board, game.soloTeam))) {
        return { value: -1000 + (maxDepth - depth), move: null }; // game losing move
    }
    
    // maximizing player (minimizing does not exist)
    let value = -Infinity;
    let bestMove = null;
    let children = getChildren(game, maxDepth, depth, true);
    console.log("POSSIBLE MOVES", children.length, "RUNNING " + depth + " ITERATIONS"/**, children.map(el => (el[0]==null?"":(el[0] + "~" + (el[1].length==2?xyToName(el[1][0], el[1][1]):el[1]) + " & "))  + el[2] + ">" + xyToName(el[3][0], el[3][1]))**/);
    for (const child of children) {
        debugIterationCounter++;
        var result = minimax(AI, child[4], maxDepth, depth - 1, alpha, beta);
        
        //if(AI == 2) console.log("MOVE", result, (child[0]==null?"":(child[0] + "~" + (child[1].length==2?xyToName(child[1][0], child[1][1]):child[1]) + " & "))  + child[2] + ">" + xyToName(child[3][0], child[3][1]));
        
        // check for triplicate
        let gameHistoryCopy = deepCopy(gamesHistory[game.parentId].history);
        // check if the move ends up as a triplicate
        if(!child[4].doNotSerialize) {
            gameHistoryCopy.push(serialize(game.turn, child[4].state));
        }
        
        // check for draw by triplicate/30move
        let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
        let triplicates = findDuplicates(findDuplicates(gameHistoryCopy));
        if(triplicates.length > 0) {
            console.log("POSSIBLE TRIPLICATE MOVE");
            result = -7; // a draw is better than any guaranteed losing position, but worse than positions with a decent chance of winning
        } else if(child[4].sinceCapture >= 30) {
            console.log("POSSIBLE 30MOVE MOVE");
            result = -7; // a draw is better than any guaranteed losing position, but worse than positions with a decent chance of winning
        }
        
        // continue with minimax
        if (result > value) {
            value = result;
            bestMove = child.slice(0, 4);
        }
        alpha = Math.max(alpha, value);
        if (beta <= alpha) {
            break;  // Beta cut-off
        }
    }
    return { value, move: bestMove };
}

function minimax(AI, game, maxDepth, depth, alpha = -Infinity, beta = Infinity) {
    let board = game.state;
    // Base case: if we have reached the maximum search depth or the game is over, return the heuristic value of the state
    if (depth === 0) {
        return evaluate(AI, game, AI);
    }
    if ((game.players.length == 2 && !canMove(board, (AI+1)%2)) || (game.players.length == 3 && !canMove(board, (AI+1)%3)&& !canMove(board, (AI+2)%3)) || (AI == 2 && soloWin(board, game.soloTeam)) || (AI == 2 && uaWin(board, game.soloTeam))) {
        return 1000 - (maxDepth - depth) + evaluate(AI, game, AI); // game winning move
    }
    if (!canMove(board, AI) || (AI != 2 && game.solo && game.soloRevealed && soloWin(board, game.soloTeam))) {
        return -1000 + (maxDepth - depth) + evaluate(AI, game, AI); // game losing move
    }
   
    if (AI == game.turn) {
        let value = -Infinity;
        let children = getChildren(game, maxDepth, depth, true);
        for (const child of children) {
            debugIterationCounter++;
            value = Math.max(value, minimax(AI, child[4], maxDepth, depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, value);
            if (beta <= alpha) {
                break;  // Beta cut-off
            }
        }
        return value;
    } else {
        let value = Infinity;
        let children = getChildren(game, maxDepth, depth, false);
        for (const child of children) {
            debugIterationCounter++;
            value = Math.min(value, minimax(AI, child[4], maxDepth, depth - 1, alpha, beta, true));
            beta = Math.min(beta, value);
            if (beta <= alpha) {
                break;  // Alpha cut-off
            }
        }
        return value;
    }
}

var debugIterationCounter = 0;
async function AImove(AI, game) {
    removeEffects(game, game.turn); // remove effects
    let gameCopy = deepCopy(game); // create a copy of the game to simulate the move on
    gameCopy.ai = true; // mark as AI game
    gameCopy.id = null;
    gameCopy.parentId = game.id;
    
    // count pieces
    let pieceCount = 0;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            if(game.state[y][x].team >= 0) pieceCount++;
        }
    }
    
    // start minimax to find the best move
    let minmax;
    debugIterationCounter = 0;
    if(pieceCount >= 27) minmax = minimaxStart(AI, gameCopy, 1, 1);
    if(pieceCount >= 17) minmax = minimaxStart(AI, gameCopy, 2, 2);
    else if(pieceCount >= 12) minmax = minimaxStart(AI, gameCopy, 3, 3);
    else if(pieceCount >= 5) minmax = minimaxStart(AI, gameCopy, 4, 4);
    else if(pieceCount == 4) minmax = minimaxStart(AI, gameCopy, 5, 5);
    else if(pieceCount == 3) minmax = minimaxStart(AI, gameCopy, 6, 6);
    else minmax = minimaxStart(AI, gameCopy, 7, 7);
    try {
        // minmax cant find a move, do any move
        let children = getChildren(game, 0, 0, true);
        if(minmax.move == null) minmax = { value: null, move: getChildren(game, 0, 0, true)[0].slice(0, 4) };
    } catch (err) {
        // absolutely no moves can be found. this is a bug. why?
        console.log("ERROR AI MOVE", AI, err, "\n", getChildren(game, 0, 0, true), "\n", JSON.stringify(game));
        minmax = { value: null, move: [null, null, "A1", [0, 0]] };
    }
    let bestMove = minmax.move;
	//console.log("AI BEST MOVE DEBUG", bestMove);
    

    console.log("CONSIDERED STATES", debugIterationCounter);
    if(bestMove[0] == null || bestMove[0][0] == null) {
        console.log("AI ABILITY -");
    } else {
        console.log("AI ABILITY", bestMove[0][0], xyToName(bestMove[0][1], bestMove[0][2]) + "~" + (bestMove[1].length == 2 ? xyToName(bestMove[1][0], bestMove[1][1]) : bestMove[1]));
        executeActiveAbility(game, bestMove[0][0], [bestMove[0][1], bestMove[0][2]], bestMove[1]);
    }
    console.log("AI MOVE   ", game.state[nameToXY(bestMove[2]).y][nameToXY(bestMove[2]).x].name + " " + bestMove[2] + ">" + xyToName(bestMove[3][0], bestMove[3][1]), round2dec(minmax.value));
    
    let guild = client.guilds.cache.get(gamesDiscord[game.id].guild);
    let channel = guild.channels.cache.get(gamesDiscord[game.id].channel);
    //channel.send("**AI:** Considered " + debugIterationCounter + " possibilities. Selected: " + ((bestMove[0] == null || bestMove[0][0] == null) ? "" : (bestMove[0][0] + " " + (bestMove[0][0], xyToName(bestMove[0][1], bestMove[0][2]) + "~" + (bestMove[1].length == 2 ? xyToName(bestMove[1][0], bestMove[1][1]) : bestMove[1])) +  " & ") + game.state[nameToXY(bestMove[2]).y][nameToXY(bestMove[2]).x].name + " " + bestMove[2] + ">" + xyToName(bestMove[3][0], bestMove[3][1]) + " - Expected Value: " + round2dec(minmax.value));
    
    movePiece(null, game, bestMove[2], xyToName(bestMove[3][0], bestMove[3][1]));
}



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
var gamesHistory = [];
var gamesDiscord = [];
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
    return structuredClone(el);
}

function turnStart(interaction, gameid, turn, mode = "editreply") {
    let availableAbilities = showMoves(gameid, turn, true, "Select a Piece (ABILITY)");
    // show buttons?
    if(availableAbilities.components[0].components.length == 1) turnMove(interaction, gameid, turn, mode); // no
    else response(interaction, availableAbilities, mode); // yes
}

function turnStartNot(interaction, gameid, turn, mode = "editreply") {
    let board = renderBoard(games[gameid], "Waiting on Opponent");
    let noButtons = { content: board, ephemeral: true, fetchReply: true, components: [{ type: 1, components: [{ type: 2, label: "Start Game", style: 4, custom_id: "start" }] }] };
    response(interaction, noButtons, mode); // show Start Game Button
}

function turnMove(interaction, gameid, turn, mode = "editreply") {
    // update spec board
    let msgSpec = displayBoard(games[gameid], "Spectator Board", [], -1);
    msgSpec.ephemeral = false;
    gamesDiscord[gameid].msg.edit(msgSpec);
    // show movable pieces
    let availableMoves = showMoves(gameid, turn, false, "Select a Piece (MOVE)");
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

function getDefensivePosition(moveFrom, moveTo, movedX, movedY) {
    let defensive = {};
    defensive.x = moveTo.x;
    defensive.y = moveTo.y;
    if(moveTo.x != moveFrom.x) defensive.x -= Math.sign(moveTo.x - moveFrom.x)
    if(moveTo.y != moveFrom.y) defensive.y -= Math.sign(moveTo.y - moveFrom.y)
    if((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) { // knight has no intermediate steps and stays if blocked
        defensive.x = moveFrom.x;
        defensive.y = moveFrom.y;
    }
    return defensive;
}

// moves a piece from one place to another (and/or replaces the piece with another piece)
function movePiece(interaction, moveCurGame, from, to, repl = null) {
    // a move has been done
    moveCurGame.firstMove = true;
    // is ai fake turn
    const notAiTurn = !moveCurGame.ai;
    // get history
    let moveCurGameHistory = null;
    if(notAiTurn) moveCurGameHistory = gamesHistory[moveCurGame.id];
    // get coords
    let moveFrom = nameToXY(from);
    let moveTo = nameToXY(to);
            
    // move piece
    let movedPieceCopy = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let movedPiece = deepCopy(moveCurGame.state[moveFrom.y][moveFrom.x]);
    let beatenPiece = deepCopy(moveCurGame.state[moveTo.y][moveTo.x]);
    if(repl) movedPiece = repl; // replace piece for promotion
    moveCurGame.state[moveFrom.y][moveFrom.x] = getPiece(null);
    moveCurGame.state[moveTo.y][moveTo.x] = movedPiece;
    
    if(notAiTurn) moveCurGame.prevMove = movedPiece.team; // store who did the last move
    
    // 0 -> unknown / likely knight
    // 1 -> likely pawn
    // 2 -> likely king
    // 3 -> likely rook / king
    // 4 -> piece known
    // 5 -> active ability known
    // 6 -> role known (disguise affected)
    // 7 -> role known (disguise unaffected)
    let movedXorig = moveFrom.x - moveTo.x;
    let movedYorig = moveFrom.y - moveTo.y;
    let movedX = Math.abs(movedXorig);
    let movedY = Math.abs(movedYorig);
    //if(notAiTurn) console.log("MOVED", movedPiece.name, movedXorig, movedYorig, beatenPiece.name?beatenPiece.name:"");
    //console.log("status", movedPiece.enemyVisibleStatus);
    const mEVS = movedPiece.enemyVisibleStatus;
    const mDis = movedPiece.disguise;
    const mDisChess = getChessName(mDis);
    const p1Turn = moveCurGame.turn === 0;
    const p2Turn = moveCurGame.turn === 1;
    const p3Turn = moveCurGame.turn === 2;
    const beaten = beatenPiece.name != null;
    
    if(notAiTurn) {
        if(beaten) moveCurGameHistory.sinceCapture = 0;
        else moveCurGameHistory.sinceCapture++;
    }
    
    if(mEVS < 7) { 
        // an impossible move was done
        if(mEVS <= 5 && (movedPiece.enemyVisible == "Knight" || movedPiece.enemyVisible == "ActiveKnight") && ((movedY != 1 && movedX != 2) && (movedY != 2 && movedX != 1))) { // was disguised
            movedPiece.enemyVisibleStatus = 0;
            movedPiece.enemyVisible = "Unknown";
        } else if(mEVS <= 5 && (movedPiece.enemyVisible == "Rook" || movedPiece.enemyVisible == "ActiveRook") && movedY >= 1 && movedX >= 1) { // was disguised
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Queen";
        }
    
        // definitely a knight
        if(mEVS < 3 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1))) {
            if(movedPiece.team == 0 && !movedPiece.hasMoved) { // white knights may be amnesiacs
                movedPiece.enemyVisibleStatus = 0;
                movedPiece.enemyVisible = "LikelyKnight";  
            } else {
                movedPiece.enemyVisibleStatus = 4;
                movedPiece.enemyVisible = "Knight";
            }
        } else if((mEVS == 4 || mEVS == 5) && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1))) { // turned into knight
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Knight";
        }
        
        if(mEVS <= 6 && ((movedY == 1 && movedX == 2) || (movedY == 2 && movedX == 1)) && mDis && mDisChess != "Knight") { // was disguised
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Knight";
        }
        // pawn condition
        else if(mEVS < 1 && p1Turn && movedYorig == 1 && movedX == 0 && beatenPiece.name == null) { // white pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p1Turn && movedYorig == 1 && movedX == 1 && beaten) { // white pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(mEVS < 1 && p2Turn && movedYorig == -1 && movedX == 0 && beatenPiece.name == null) { // black pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p2Turn && movedYorig == -1 && movedX == 1 && beaten) { // black pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if(mEVS < 1 && p3Turn && movedY == 1 && movedX == 0 && beatenPiece.name == null) { // gold pawn move
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        } else if((mEVS < 1 || (mEVS <= 6 && mDis && mDisChess == "Rook")) && p3Turn && movedY == 1 && movedX == 1 && beaten) { // gold pawn beat
            movedPiece.enemyVisibleStatus = 1;
            movedPiece.enemyVisible = "LikelyPawn";
        }
        // king condition
        else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && movedY == 0 && movedX == 1) { // rook like move (left/right)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == -1) || (p2Turn && movedYorig == 1))  && (movedX == 0 || movedX == 1)) { // rook like move (down, side down)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (p2Turn && movedYorig == -1))  && movedX == 0 && beaten) { // rook like move (up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Queen" || mDisChess != "King"))) && ((p1Turn && movedYorig == 1) || (p2Turn && movedYorig == -1))  && movedX == 1 && beatenPiece.name == null) { // king like move (side up)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        } else if((mEVS < 2 || (mEVS <= 6 && mDis && (mDisChess != "Queen" || mDisChess != "King"))) && p3Turn  && movedX == 1 && movedY == 1 && beatenPiece.name == null) { // king like move (diagonal)
            movedPiece.enemyVisibleStatus = 2;
            movedPiece.enemyVisible = "LikelyKing";
        }
        // rook condition
        else if((mEVS < 3 || (mEVS <= 6 && mDis && (mDisChess != "Rook" || mDisChess != "Queen"))) && ((movedY > 1 && movedX == 0) || (movedY == 0 && movedX > 1))) {
            movedPiece.enemyVisibleStatus = 3;
            movedPiece.enemyVisible = "LikelyRook";
        }
        // queen condition
        else if((mEVS < 4 || (mEVS <= 6 && mDis && mDisChess != "Queen")) && (movedY > 1 || movedX > 1) && movedY > 1 && movedX > 1) {
            movedPiece.enemyVisibleStatus = 4;
            movedPiece.enemyVisible = "Queen";
        }
    }
    
    // store that piece has moved
    movedPiece.hasMoved = true;
    
    
    if(from == to) beatenPiece = getPiece(null); // promotion is not taking
    
    let defensive = moveTo;
    if(beaten && (movedPiece.name == "Zombie" || movedPiece.name == "Zombie2" || movedPiece.name == "Zombie3" || movedPiece.name == "Zombie4" || movedPiece.name == "Zombie5")) { // zombie overwrites death effects
    	defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
        moveCurGame.state[defensive.y][defensive.x] = movedPiece;
        movedPiece.zombieChildCount++;
        // turn piece
        let nextZombie = "Zombie";
        switch(movedPiece.name) {
            case "Zombie": nextZombie = "Zombie2"; break;
            case "Zombie2": nextZombie = "Zombie3"; break;
            case "Zombie3": nextZombie = "Zombie4"; break;
            default: case "Zombie4": nextZombie = "Zombie5"; break;
        }
        
        moveCurGame.state[moveTo.y][moveTo.x] = getPiece(nextZombie);
        moveCurGame.state[moveTo.y][moveTo.x].zombieID = movedPiece.zombieID + "" + movedPiece.zombieChildCount;
        moveCurGame.state[moveTo.y][moveTo.x].zombieParent = movedPiece.zombieID;
        moveCurGame.state[moveTo.y][moveTo.x].protected = false;
        if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, false, "", to, to, 7, "🔀" + findEmoji(nextZombie) + "🟦"]);
        // reveal zombie
        movedPiece.enemyVisibleStatus = 7;
        moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
    }
    // death effects
    else if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || beatenPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && moveCurGame.players[moveCurGame.turn] != null && beatenPiece.enemyVisibleStatus == 6 && beatenPiece.disguise) beatenPiece.name = beatenPiece.disguise; // see role with disguise if applicable
        
        if(beatenPiece.protected) { // protected (Witch)
            defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
            if(notAiTurn) {
                moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                moveCurGameHistory.lastMoves.push([beatenPiece.protectedBy, beatenPiece.name, beatenPiece.disguise, beatenPiece.enemyVisible, to, to, beatenPiece.enemyVisibleStatus, "🛡️🟦🟦"]);
            }
            moveCurGame.state[defensive.y][defensive.x] = movedPiece;
            moveCurGame.state[moveTo.y][moveTo.x] = deepCopy(beatenPiece);
            beatenPiece.name = "protected";
        } 
        
        switch(beatenPiece.name) {
            case "protected":
                // nothing
            break;
            case null:
                if(from == to) { // pawn promotion
                    if(notAiTurn && movedPiece.team != 2) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPieceCopy.name, movedPiece.disguise, movedPiece.enemyVisibleStatus<4?"Pawn":movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus<4?4:movedPiece.enemyVisibleStatus, "⏫🟦🟦"]); // black/white -> promotion
                    if(notAiTurn && movedPiece.team == 2) moveCurGame.doNotSerialize = true; // gold -> piece chose not to move
                } else if(notAiTurn) { 
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                }
            break;
            default:
                // store move
                if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
            break; // Hooker defense
            case "Hooker":
                if(beatenPiece.hidden) {
                    defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGameHistory.lastMoves.push([0, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                }
            break;
            case "Ranger":
                if(movedPiece.disguise) {
                    movedPiece.enemyVisibleStatus = 6;
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                        moveCurGameHistory.lastMoves.push([0, "Ranger", false, "", to, to, 6, "👁️" + findEmoji(movedPiece.disguise) + "🟦"]);
                    }
                } else {
                    movedPiece.enemyVisibleStatus = 7;
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                        moveCurGameHistory.lastMoves.push([0, "Ranger", false, "", to, to, 7, "👁️" + findEmoji(movedPiece.name) + "🟦"]);
                    }
                }
            break;
            case "Angel":
                if(notAiTurn && !moveCurGame.goldEliminated) {
                    let angelGuild = client.guilds.cache.get(gamesDiscord[moveCurGame.id].guild);
                    let angelChannel = angelGuild.channels.cache.get(gamesDiscord[moveCurGame.id].channel);
                    if(moveCurGame.players[2]) angelChannel.send("<@" + moveCurGame.players[2] + "> ascends and wins!");
                    else angelChannel.send("**Ascension:** " + moveCurGame.playerNames[2] + " ascends and wins! The game continues.");
                    console.log("ASCEND GOLD");
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([2, "Angel", false, "", to, from, 7, "⬆️🏅🟦"]);
                }
                moveCurGame.goldEliminated = true;
                if(!moveCurGame.goldEliminated) moveCurGame.goldAscended = true; //cannot win while eliminated
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
            break;
            case "Zombie":
            case "Zombie2":
            case "Zombie3":
            case "Zombie4":
            case "Zombie5":
                // if a zombie dies, so do its children
                let zombieParents = [beatenPiece.zombieID];
                let zCount = 0;
                while(zCount < zombieParents.length) {
                    if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                    for(let y = 0; y < moveCurGame.height; y++) {
                        for(let x = 0; x < moveCurGame.width; x++) {
                            let xyPiece = moveCurGame.state[y][x];
                            //console.log("ZOMBIE DEATH", notAiTurn, xyPiece.name, xyPiece.zombieParent, beatenPiece.zombieID);
                            if((xyPiece.name == "Zombie" || xyPiece.name == "Zombie2" || xyPiece.name == "Zombie3" || xyPiece.name == "Zombie4" || xyPiece.name == "Zombie5") && xyPiece.zombieParent == zombieParents[zCount]) {
                                zombieParents.push(xyPiece.zombieID);
                                moveCurGame.state[y][x] = getPiece(null);
                                if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, xyToName(x, y), 7, "🇽​"]);
                            }
                        }
                    }
                    zCount++;
                }
            break;
            case "Huntress":
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([0, "Huntress", false, "", to, from, 7, "🇽​"]);
                    moveCurGame.state[moveTo.y][moveTo.x] = getPiece(null);
                }
            break;
            // Extra Move Pieces
            case "Child":
                if(notAiTurn && !moveCurGame.whiteEliminated) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🟦" + "2️⃣" + "🇽"]);
                }
                if(moveCurGame.turn == 1) moveCurGame.doubleMove0 = true;
                else if(moveCurGame.turn == 0) moveCurGame.doubleMove1 = true;
            break;
            case "Wolf Cub":
                if(notAiTurn && !moveCurGame.blackEliminated) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🟦" + "2️⃣" + "🇽"]);
                }
                if(moveCurGame.turn == 1) moveCurGame.doubleMove0 = true;
                else if(moveCurGame.turn == 0) moveCurGame.doubleMove1 = true;
            break;
            // Fortune Apprentice
            case "Fortune Teller":
            case "Aura Teller":
            case "Crowd Seeker":
                if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽​"]);
                for(let y = 0; y < moveCurGame.height; y++) {
                    for(let x = 0; x < moveCurGame.width; x++) {
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
                defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Attacked " + beatenPiece.name);
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
            break;
            case "Cursed Civilian":
                defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                if(notAiTurn) {
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                    moveCurGameHistory.lastMoves.push([moveCurGame.turn, beatenPiece.name, false, "", to, to, 7, "🔀" + findEmoji("Wolf") + "🟦"]);
                }
                moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                moveCurGame.state[moveTo.y][moveTo.x] = getPiece("Wolf");
                moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
            break;
            case "Alcoholic":
                let bartenderAlive = false;
                for(let y = 0; y < moveCurGame.height; y++) {
                    for(let x = 0; x < moveCurGame.width; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.name == "Bartender") {
                            bartenderAlive = true;
                        }
                    }
                }
                if(bartenderAlive) {
                    defensive = getDefensivePosition(moveFrom, moveTo, movedX, movedY);
                    if(notAiTurn) {
                        moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, xyToName(defensive.x, defensive.y), movedPiece.enemyVisibleStatus]);
                        moveCurGameHistory.lastMoves.push([beatenPiece.team, beatenPiece.name, false, "", to, to, 7, "🛡️🟦🟦"]);
                    }
                    moveCurGame.state[defensive.y][defensive.x] = movedPiece;
                    moveCurGame.state[moveTo.y][moveTo.x] = beatenPiece;
                    moveCurGame.state[moveTo.y][moveTo.x].enemyVisibleStatus = 7;
                } else {
                    if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus]);
                }
            break;
        }
    }
    
    // Hooker death check
    if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y, moveTo.x-1) && moveCurGame.state[moveTo.y][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y][moveTo.x-1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y, moveTo.x+1) && moveCurGame.state[moveTo.y][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y][moveTo.x+1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y+1, moveTo.x-1) && moveCurGame.state[moveTo.y+1][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x-1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y+1, moveTo.x) && moveCurGame.state[moveTo.y+1][moveTo.x].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y+1, moveTo.x+1) && moveCurGame.state[moveTo.y+1][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y+1][moveTo.x+1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y-1, moveTo.x-1) && moveCurGame.state[moveTo.y-1][moveTo.x-1].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x-1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y-1, moveTo.x) && moveCurGame.state[moveTo.y-1][moveTo.x].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
        if(inBoundsInv(moveCurGame.height, moveCurGame.width, moveTo.y-1, moveTo.x+1) && moveCurGame.state[moveTo.y-1][moveTo.x+1].hidden == to) {
            moveCurGame.state[moveTo.y-1][moveTo.x+1] = getPiece(null);
            if(notAiTurn) moveCurGameHistory.lastMoves.push([moveCurGame.turn, movedPiece.name, movedPiece.disguise, movedPiece.enemyVisible, from, to, movedPiece.enemyVisibleStatus, "🇽" + findEmoji("Hooker") + "🟦"]);
        }
    }
    
    // move effects
    if(notAiTurn || moveCurGame.players[moveCurGame.turn] == null || movedPiece.enemyVisibleStatus >= 6) { // only run in normal turns, ai's own turns or when effect is visible
        if(!notAiTurn && moveCurGame.players[moveCurGame.turn] != null && movedPiece.enemyVisibleStatus == 6 && movedPiece.disguise) movedPiece.name = movedPiece.disguise; // see role with disguise if applicable
        switch(movedPiece.name) {
            case "Amnesiac": // Amnesiac -> Change role after onhe move
            if(from != to) { // dont convert on promotion
                 if(!moveCurGame.ai) console.log("AMNESIAC CHANGE", movedPiece.convertTo);
                 moveCurGame.state[defensive.y][defensive.x] = convertPiece(movedPiece, movedPiece.convertTo);
            }
            break;
            case "Direwolf": // Direwolf -> Double move if last piece
                let wolfCount = 0;
                for(let y = 0; y < moveCurGame.height; y++) {
                    for(let x = 0; x < moveCurGame.width; x++) {
                        let xyPiece = moveCurGame.state[y][x];
                        if(xyPiece.team == 1) {
                            wolfCount++;
                        }
                    }
                }
                if(wolfCount == 1 && !moveCurGame.inDoubleMove) {
                moveCurGame.doubleMove1 = true;
                movedPiece.enemyVisibleStatus = 7;
            }
            break;
        }
        moveCurGame.inDoubleMove = false;
    }
    
    // mark solo as revealed if applicable
    if(p3Turn && movedPiece.enemyVisibleStatus >= 6) {
        moveCurGame.soloRevealed = true;
    }
    
    // promote?
    if(movedPiece.chess == "Pawn" && p1Turn && (defensive&&defensive.y?defensive.y==0:moveTo.y == 0)) {
        if(interaction) {
            let kings = ["Hooker","Idiot","Crowd Seeker","Aura Teller"];
            let knights = ["Royal Knight","Amnesiac"];
            let rooks = ["Fortune Teller","Runner","Witch"];
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 0), style: 1, custom_id: "promote-"+to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 0), style: 1, custom_id: "promote-"+to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 0), style: 1, custom_id: "promote-"+to+"-" + promoteRook });
            interaction.editReply(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: components }] ));
        } else {
            let randomOptions = ["Hooker","Royal Knight","Fortune Teller","Runner","Witch"];
            let promoteTo = getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]);
            if(!moveCurGame.ai) console.log("PROMOTE TO", promoteTo.name);
            movePiece(interaction, moveCurGame, to, to, promoteTo);
        }
    } else if(movedPiece.chess == "Pawn" && p2Turn && (defensive&&defensive.y?defensive.y==moveCurGame.height-1:moveTo.y == moveCurGame.height-1)) {
        if(interaction) {
            let kings = ["Alpha Wolf","Psychic Wolf","Sneaking Wolf"];
            let knights = ["Direwolf","Clairvoyant Fox","Fox"];
            let rooks = ["Warlock","Scared Wolf","Saboteur Wolf"];
            let promoteKing = kings[Math.floor(Math.random() * kings.length)];
            let promoteKnight = knights[Math.floor(Math.random() * knights.length)];
            let promoteRook = rooks[Math.floor(Math.random() * rooks.length)];
            let components = [];
            components.push({ type: 2, label: promoteKing + " " + getUnicode(getChessName(promoteKing), 1), style: 1, custom_id: "promote-"+to+"-"+promoteKing });
            components.push({ type: 2, label: promoteKnight + " " + getUnicode(getChessName(promoteKnight), 1), style: 1, custom_id: "promote-"+to+"-" + promoteKnight });
            components.push({ type: 2, label: promoteRook + " " + getUnicode(getChessName(promoteRook), 1), style: 1, custom_id: "promote-"+to+"-" + promoteRook });
            interaction.editReply(displayBoard(moveCurGame, "Promote " + to, [{ type: 1, components: components }] ));
        } else {
            let randomOptions = ["Alpha Wolf","Direwolf","Warlock","Scared Wolf","Saboteur Wolf"];
            let promoteTo = getPiece(randomOptions[Math.floor(Math.random() * randomOptions.length)]);
            if(!moveCurGame.ai) console.log("PROMOTE TO", promoteTo.name);
            movePiece(interaction, moveCurGame, to, to, promoteTo);
        }
    } else {
        // turn complete
        turnDone(interaction, moveCurGame, "Waiting on Opponent");
    }
}

function isTriplicate(id) {
    
}

const turnMinDuration = 5000;
async function turnDone(interaction, game, message) {
    // turn complete
    if(!game.ai) {
        // buffer if move too fast
        let thisMove = Date.now();
        let moveDiff = thisMove - gamesDiscord[game.id].lastMove;
        gamesDiscord[game.id].lastMove = thisMove;
        if(moveDiff < turnMinDuration) {
            await sleep(turnMinDuration - moveDiff);
        }
        // update spectator message
        let msgSpec = displayBoard(game, "Spectator Board", [], -1);
        msgSpec.ephemeral = false;
        gamesDiscord[game.id].msg.edit(msgSpec);
        // update prev player board
        if(game.solo && gamesDiscord[game.id].lastInteraction && !game.blackEliminated && !game.whiteEliminated && !game.goldEliminated) {
            await gamesDiscord[game.id].lastInteraction.editReply(displayBoard(game, "Waiting on Opponent", [], gamesDiscord[game.id].lastInteractionTurn));
        }
        // update player message
        if(interaction) {
            await interaction.editReply(displayBoard(game, message));
            busyWaiting(interaction, game.id, game.turn);
        }
        
        // serialize and store state
        if(!game.doNotSerialize) {
            gamesHistory[game.id].history.push(serialize(game.turn, game.state));
        } else {
            game.doNotSerialize = false;
        }
        // check for draw by triplicate (threefold repetition)
        let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)
        let triplicates = findDuplicates(findDuplicates(gamesHistory[game.id].history));
        let triplicateDraw = triplicates.length > 0;
        
        // check for draw by no captures x30 (50 move rule)
        let captureDraw = gamesHistory[game.id].sinceCapture >= 30;
        
        if(triplicateDraw || captureDraw) {
            let guild = client.guilds.cache.get(gamesDiscord[game.id].guild);
            let channel = guild.channels.cache.get(gamesDiscord[game.id].channel);
            
            // only still living players draw
            let drawPlayers = [];
            if(!game.solo || (game.solo && !game.whiteEliminated)) {
                if(game.players[0]) drawPlayers.push("<@" + game.players[0] + ">");
                else drawPlayers.push(game.playerNames[0]);
            }
            if(!game.solo || (game.solo && !game.blackEliminated)) {
                if(game.players[1]) drawPlayers.push("<@" + game.players[1] + ">");
                else drawPlayers.push(game.playerNames[1]);
            }
            if(game.solo && !game.goldEliminated && !game.goldAscended) {
                if(game.players[2]) drawPlayers.push("<@" + game.players[2] + ">");
                else drawPlayers.push(game.playerNames[2]);
            }
            
            // message
            let drawMessage = [];
            if(triplicateDraw) drawMessage.push("Triplicated Position");
            if(captureDraw) drawMessage.push("30-Moves & No Captures");
            if(drawPlayers.length == 2) channel.send("**" + drawMessage.join(", ") + ":** The game ends in a draw between " + drawPlayers[0] + " and " + drawPlayers[1] + "!");
            else channel.send("**" + drawMessage.join(", ") + ":** The game ends in a draw between " + drawPlayers[0] + ", " + drawPlayers[1] + " and " + drawPlayers[2] + "!");
            
            // destroy game
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("DRAW");
            return;
        }
        
    }
    nextTurn(game);
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
            await sleep(100);
            if(games[gameid].players[player] == null) {
                console.log("INCORRECT BUSY WAITING");
                return;
            }
            // if edit fails retry;
            try {
                if(interaction && interaction.replied) {
                    turnStart(interaction, gameid, player, "editreply");  
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

function canMove(board, player) {
    // check if a piece is available
    for(let y = 0; y < board.length; y++) {
        for(let x = 0; x < board[0].length; x++) {
            if(board[y][x].team == player) {
                if(hasAvailableMove(board, xyToName(x, y), true)) return true;
            }
        }
    }
    // if no move is found, return false
    return false;
}

function soloWin(board, soloTeam) {
    switch(soloTeam) {
        case "Flute":
            // check if a piece is unenchanted
            for(let y = 0; y < board.length; y++) {
                for(let x = 0; x < board[0].length; x++) {
                    if(board[y][x].team >= 0 && board[y][x].team != 2 && !board[y][x].enchanted) return false;
                }
            }
            // if no piece is found, return true
            return true;
        break;
    }
    // default -> not win
    return false;
}

function uaWin(board, uaTeam) {
    switch(uaTeam) {
        case "Angel":
            if(!canMove(board, 2)) return true;
        break;
    }
    // default -> not win
    return false;
}

function enemyTeam(turn, pieceTeam) {
    return pieceTeam != -1 && turn != pieceTeam;
}

function findWWW(game) {
    // look for www
    let wwwAlive = false;
    let wolfCount = 0;
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            let xyPiece = game.state[y][x];
            if(xyPiece.name == "White Werewolf") {
                wwwAlive = true;
            }
            if(xyPiece.team == 1) {
                wolfCount++;
            }
        }
    }
    return wwwAlive && wolfCount > 1;
}

function removeSoloEffect(game) {
    for(let y = 0; y < game.height; y++) {
        for(let x = 0; x < game.width; x++) {
            game.state[y][x].enchanted = false;
        }
    }
}

function nextTurn(game, forceTurn = null) {
    if(game.concluded) return; // dont do a turn on a concluded game
    // increment turn
    let oldTurn = game.turn;
    // determine next turn
    if(!game.firstMove) { // when here before the first move, force a P1 turn (this happens via "Start Game" buton)
        game.turn = 0;
        game.normalTurn = 0;
    } else if(!game.solo) { // normal game, switch between P1 & P2
        game.turn = (game.turn + 1) % 2;
        if(forceTurn != null) game.turn = forceTurn; // force turn
    } else { // solo game, do P1 then P3, then P2, then P3 again
        // determine next turn
        if(game.soloDoubleTurns) { // solo double turns
            if(game.turn != 2) {
                game.turn = 2;
            } else {
                if(game.normalTurn == 0) {
                    game.turn = 1;
                    game.normalTurn = 1;
                } else {
                    game.turn = 0;
                    game.normalTurn = 0;
                }
            }
        } else { // solo normal turns
            game.turn = (game.turn + 1) % 3;
        }
        
        if(forceTurn != null) { // force turn
            game.turn = forceTurn;
            if(forceTurn < 2) game.normalTurn = forceTurn;
        }
        
        let guild = game.ai ? null : client.guilds.cache.get(gamesDiscord[game.id].guild);
        let channel = game.ai ? null : guild.channels.cache.get(gamesDiscord[game.id].channel);
        
        // eliminated players if applicable
        switch(game.turn) {
            case 0:
                if(!canMove(game.state, 0) && !game.whiteEliminated) {
                    if(!game.ai) {
                        if(game.players[0]) channel.send("**Elimination:** <@" + game.players[0] + "> was eliminated!");
                        else channel.send("**Elimination:** " + game.playerNames[0] + " was eliminated!");
                        console.log("ELIMINATE WHITE");
                    }
                    game.whiteEliminated = true;
                }
            break;
            case 1:
                if(!canMove(game.state, 1) && !game.blackEliminated) {
                    if(!game.ai) {
                        if(game.players[1]) channel.send("**Elimination:** <@" + game.players[1] + "> was eliminated!");
                        else channel.send("**Elimination:** " + game.playerNames[1] + " was eliminated!");
                        console.log("ELIMINATE BLACK");
                    }
                    game.blackEliminated = true;
                }
            break;
            case 2:
                if(!canMove(game.state, 2) && !game.goldEliminated) {
                    removeSoloEffect(game);
                    if(!game.ai) {
                        if(game.players[2]) channel.send("**Elimination:** <@" + game.players[2] + "> was eliminated!");
                        else channel.send("**Elimination:** " + game.playerNames[2] + " was eliminated!");
                        console.log("ELIMINATE GOLD");
                    }
                    game.goldEliminated = true;
                }
            break;
        }
        
         // if new turn player eliminated, skip turn
        if(game.turn == 0 && game.whiteEliminated && !game.blackEliminated && !game.goldEliminated) {
            nextTurn(game, 1);
            return;
        } else if(game.turn == 1 && game.blackEliminated && !game.whiteEliminated && !game.goldEliminated) {
            if(game.soloDoubleTurns) {
                nextTurn(game, 0);
            } else {
                nextTurn(game, 2);
            }            
            return;
        } else if(game.turn == 2 && game.goldEliminated && !game.whiteEliminated && !game.blackEliminated) {
            if(game.soloDoubleTurns) {
                if(game.normalTurn == 0) {
                    nextTurn(game, 1);
                } else {
                    nextTurn(game, 0);
                }
            } else {
                nextTurn(game, 0);
            }
            return;
        }
        
        // check if at least two players cant move
        let soloHasWon = !game.ai ? soloWin(game.state, game.soloTeam) : false;
        if(!game.ai && (soloHasWon || (game.whiteEliminated ? (game.blackEliminated || game.goldEliminated) : (game.blackEliminated && game.goldEliminated)))) { // game over
            // get channel
            // determine winner
            if(!game.blackEliminated && !soloHasWon && findWWW(game)) { // P2 loses by WWW
                channel.send("**Game End:** White Werewolf causes a loss!");
                let enemies = "";
                if(game.players[1]) enemies += "<@" + game.players[1] + ">";
                else enemies += game.playerNames[1];
                enemies += " & ";
                if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                else enemies += game.playerNames[2];
                if(game.players[0]) channel.send("**Victory:** " + enemies + " have won against " + game.player[0] + "!");
                else channel.send("**Victory:** " + enemies + " have won against " + game.playerNames[0] + "!"); 
            } else if(!game.goldEliminated || soloHasWon) { // P3 wins
                if(soloHasWon) channel.send("**Game End:** Solo Power causes a loss!");
                let enemies = "";
                if(game.players[0]) enemies += "<@" + game.players[0] + ">";
                else enemies += game.playerNames[0];
                enemies += " & ";
                if(game.players[1]) enemies += "<@" + game.players[1] + ">";
                else enemies += game.playerNames[1];
                if(game.players[2]) channel.send("**Victory:** <@" + game.players[2] + "> has won against " + enemies + "!");
                else channel.send("**Victory:** " + game.playerNames[2] + " has won against " + enemies + "!");
            } else if(!game.whiteEliminated) { // P1 wins
                let enemies = "";
                if(game.players[1]) enemies += "<@" + game.players[1] + ">";
                else enemies += game.playerNames[1];
                if(!game.goldAscended) {// dont win against ascended
                    enemies += " & ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                } else {
                    enemies += ", and ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                    enemies += " won by ascension";
                }
                if(game.players[0]) channel.send("**Victory:** <@" + game.players[0] + "> has won against " + enemies + "!");
                else channel.send("**Victory:** " + game.playerNames[0] + " has won against " + enemies + "!");
            }else if(!game.blackEliminated) { // P2 wins
                let enemies = "";
                if(game.players[0]) enemies += "<@" + game.players[0] + ">";
                else enemies += game.playerNames[0];
                if(!game.goldAscended) { // dont win against ascended
                    enemies += " & ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                } else {
                    enemies += ", and ";
                    if(game.players[2]) enemies += "<@" + game.players[2] + ">";
                    else enemies += game.playerNames[2];
                    enemies += " won by ascension";
                }
                if(game.players[1]) channel.send("**Victory:** <@" + game.players[1] + "> has won against " + enemies + "!");
                else channel.send("**Victory:** " + game.playerNames[1] + " has won against " + enemies + "!");
            } else {
                channel.send("**Game End:** The game ends in a stalemate!");
            }
            
            // destroy game
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("WIN");
            return;
        }
        
       
    }
    if(!game.ai) console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\nNEXT TURN", game.turn);
    
    if(!game.ai) {
        // find a valid move
        let board = game.state;
      
        // Update Spectator Board
        let msgSpec = displayBoard(game, "Spectator Board", [], -1);
        msgSpec.ephemeral = false;
        gamesDiscord[game.id].msg.edit(msgSpec);

        // WIN Message
        if(!game.solo && !canMove(board, game.turn)) {
            let guild = client.guilds.cache.get(gamesDiscord[game.id].guild);
            let channel = guild.channels.cache.get(gamesDiscord[game.id].channel);

            // www lose
            if(findWWW(game) && oldTurn == 1) {
                oldTurn = 0;
                game.turn = 1;
                channel.send("**Game End:** White Werewolf causes a loss!");
            }
            
            if(game.players[0] && game.players[1]) channel.send("**Victory:** <@" + game.players[oldTurn] + "> has won against <@" + game.players[game.turn] + ">!"); // no AI
            else if(oldTurn == 0 && !game.players[0] && game.players[1]) channel.send("**Victory:** " + game.playerNames[0] + " has won against <@" + game.players[1] + ">!"); // town AI
            else if(oldTurn == 1 && !game.players[0] && game.players[1]) channel.send("**Victory:** <@" + game.players[1] + "> has won against " + game.playerNames[0] + "!"); // town AI
            else if(oldTurn == 0 && !game.players[1] && game.players[0]) channel.send("**Victory:** <@" + game.players[0] + "> has won against " + game.playerNames[1] + "!"); // wolf AI
            else if(oldTurn == 1 && !game.players[1] && game.players[0]) channel.send("**Victory:** " + game.playerNames[1] + " has won against <@" + game.players[0] + ">!"); // wolf AI
            else if(oldTurn == 0 && !game.players[1] && !game.players[0]) channel.send("**Victory:** " + game.playerNames[0] + " has won against " + game.playerNames[1] + "!"); // both AI
            else if(oldTurn == 1 && !game.players[1] && !game.players[0]) channel.send("**Victory:** " + game.playerNames[1] + " has won against " + game.playerNames[0] + "!"); // both AI
            concludeGame(game.id);
            delayedDestroy(game.id);
            console.log("WIN");
            return;
        }
    }
    
    // DOUBLE MOVE (CHILD/CUB)
    if(game.prevMove == 0 && game.doubleMove0 == true) { // double move town (Child)
        game.doubleMove0 = false;
    	game.inDoubleMove = true;
        nextTurn(game, 0);
        return;
    } else if(game.prevMove == 1 && game.doubleMove1 == true) { // double move wolf (Cub)
        game.doubleMove1 = false;
    	game.inDoubleMove = true;
        nextTurn(game, 1);
        return;
    }
    
    // Do AI Turn if AI in play
    if(!game.ai && game.turn == 1 && game.players[1] == null) {
        AImove(1, game)
    } else if(!game.ai && game.turn == 0 && game.players[0] == null) {
        AImove(0, game)
    } else if(!game.ai && game.turn == 2 && game.players[2] == null) {
        AImove(2, game)
    }
}

function removeEffects(curGame, team) {
    // unprotect, unhide, undisguise, unsabotage
    for(let y = 0; y < curGame.height; y++) {
        for(let x = 0; x < curGame.width; x++) {
            let xyPiece = curGame.state[y][x];
            if(xyPiece.name != null && xyPiece.team == team) {
                curGame.state[y][x].protected = false; 
                curGame.state[y][x].protectedBy = null; 
                curGame.state[y][x].hidden = false; 
                curGame.state[y][x].disguise = false;
                if(curGame.state[y][x].name == "Sneaking Wolf") curGame.state[y][x].disguise = "Wolf"; // keep SnW disguise
            } else if(xyPiece.name != null && xyPiece.team != team) {
                curGame.state[y][x].sabotaged = false;
                curGame.state[y][x].stay = false;
            }
        }
    }
}

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
            aPositions = generatePositions(curGame.state, arg1);
            aPositions = aPositions.filter(el => el[2]).map(el => [el[0], el[1]]); // only select moves with targets
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", abilityPiece.name == "Infecting Wolf" ? "infect" : "sabotage", 3);
        break;
        // Target targetable ally
        case "Witch":
        case "Royal Knight":
            let modGame = deepCopy(curGame.state);
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
        // Target all ally
        case "Tanner":
            aPositions = [];
            for(let y = 0; y < curGame.height; y++) {
                for(let x = 0; x < curGame.width; x++) {
                    let xyPiece = curGame.state[y][x];
                    if(xyPiece.name != null && xyPiece.team == abilityPiece.team) {
                        aPositions.push([x, y]);
                    }
                }
            }
            aComponents = interactionsFromPositions(aPositions, arg1, "turnstart", "disguise", 3);
        break;
        // Dog
        case "Dog":
            aInteractions = [{ type: 2, label: "Back", style: 4, custom_id: "turnstart" }];
            aInteractions.push({ type: 2, label: "Wolf Cub " + getUnicode("Pawn", 1), style: 3, custom_id: "transform-" + arg1 + "-Wolf Cub" });
            aInteractions.push({ type: 2, label: "Fox " + getUnicode("Knight", 1), style: 3, custom_id: "transform-" + arg1 + "-Fox" });
            aComponents = [{ type: 1, components: aInteractions }];
        break;
        // Hooker - Surrounding fields
        case "Hooker":
            aInteractions = [];
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x].team == 0) aInteractions.push([abilitySelection.x, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x-1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x-1].team == 0) aInteractions.push([abilitySelection.x-1, abilitySelection.y+1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y-1) && curGame.state[abilitySelection.y-1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y-1]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y) && curGame.state[abilitySelection.y][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y]);
            if(inBounds(curGame.width, curGame.height, abilitySelection.x+1, abilitySelection.y+1) && curGame.state[abilitySelection.y+1][abilitySelection.x+1].team == 0) aInteractions.push([abilitySelection.x+1, abilitySelection.y+1]);
            aInteractions = aInteractions.map(el => {
                return new Object({ type: 2, label: xyToName(el[0], el[1]), style: 3, custom_id: "hide-" + arg1 + "-" + xyToName(el[0], el[1]) });
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
    }
    return aComponents;
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
        gamesDiscord[gameID].lastInteraction = interaction;
        gamesDiscord[gameID].lastInteractionTurn = curGame.turn;
        switch(type) {
            case "start":
                await interaction.update(displayBoard(curGame, "Starting Game", []));
                turnDone(interaction, curGame, "Waiting on Opponent");
            break;
            // select a piece; show available moves
            case "select":    
                let selection = nameToXY(arg1);
                let currentGame = deepCopy(curGame);
                
                // generate list of possible moves
                //console.log("BOARD AT SELECT", currentGame.state.map(el => el.map(el2 => el2.name).join(",")).join("\n"));
                let positions = generatePositions(currentGame.state, arg1);
                console.log("AVAILABLE POSITIONS", positions.map(el => xyToName(el[0], el[1])).join(","));
                let components = interactionsFromPositions(positions, arg1, "turnmove", "move");
                //console.log(components);
                
                currentGame.selectedPiece = deepCopy(currentGame.state[selection.y][selection.x]);
                currentGame.state[selection.y][selection.x] = getPiece("Selected");
                
                interaction.update(displayBoard(currentGame, "Pick a Move", components));
            break;
            // move a piece to another location; update board
            case "move":
                await interaction.update(displayBoard(curGame, "Executing Move", []));
                movePiece(interaction, games[gameID], arg1, arg2);
            break;
            // promote a piece; update board
            case "promote":
                await interaction.update(displayBoard(curGame, "Executing Move", []));
                movePiece(interaction, games[gameID], arg1, arg1, getPiece(arg2));
            break;
            // back to turn start menu
            case "turnstart":
                turnStart(interaction, gameID, curGame.turn, "update");
            break;
            // back to turn move menu
            case "turnmove":
                // unprotect, unhide, undisguise, unsabotage
                removeEffects(curGame, curGame.turn);
                // continue
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
             // select an ability piece; show available actions
            case "ability":    
                let abilitySelection = nameToXY(arg1);
                let abilityPiece = curGame.state[abilitySelection.y][abilitySelection.x];
                
                // unprotect, unhide, undisguise, unsabotage
                removeEffects(curGame, abilityPiece.team);
                
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
                let enchantTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Enchant", null, [enchantTarget.x, enchantTarget.y]);
                turnMove(interaction, gameID, curGame.turn, "update");
            break;
            // hooker hide
            case "hide":
                let hideSubject = nameToXY(arg1);
                let hideTarget = nameToXY(arg2);
			    executeActiveAbility(curGame, "Hide", [hideSubject.x, hideSubject.y], [hideTarget.x, hideTarget.y]);
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
        }
    }
    
    if(!interaction.isCommand()) return; // ignore non-slash commands
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
            switch(team) {
                case "townsfolk":
                    pieces = ["Citizen","Ranger","Huntress","Bartender","Fortune Apprentice","Child","Hooker","Idiot","Crowd Seeker","Aura Teller","Royal Knight","Alcoholic","Amnesiac","Fortune Teller","Runner","Witch","Cursed Civilian"];
                    teamColor = "White";
                    teamName = "Townsfolk (White)";
                break;
                case "werewolf":
                    pieces = ["Wolf","Wolf Cub","Tanner","Archivist Fox","Recluse","Dog","Infecting Wolf","Alpha Wolf","Psychic Wolf","Sneaking Wolf","Direwolf","Clairvoyant Fox","Fox","Warlock","Scared Wolf","Saboteur Wolf","White Werewolf"];
                    teamColor = "Black";
                    teamName = "Werewolves (Black)";
                break;
                case "solo":
                    pieces = ["Flute Player","Devil","Zombie","Angel"];
                    teamColor = "Gold";
                    teamName = "Solo (Gold)";
                break;
            }
            let pieceMsg = findEmoji("WWRess") + " **" + teamName + " Piece List:** " + findEmoji("WWRess") + "\n";
            
            for(let i = 0; i < pieces.length; i++) {
                pieceMsg += findEmoji(teamColor + getChessName(pieces[i])) + " " + findEmoji(pieces[i]) + " **" + pieces[i] + ":** " + getAbilityText(pieces[i]) + "\n";
            }
            // Send pinging message
            interaction.reply({ content: pieceMsg });
        break;
        case "play":
            if(isPlaying(interaction.member.id)) {
                interaction.reply({ content: "**Error:** You're already in a game!", ephemeral: true });
            } else {
                let players;
                let rand = Math.floor(Math.random() * 100);
                //rand = 0; // seo: debug solo
                // determine teams
                if(rand < 4) { // player town + solo
                    players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, "*AI #2*"]];
                } else if(rand < 48) { // player town
                    players = [[interaction.member.id, interaction.member.user.username], [null, "*AI*"], [null, null]];
                } else if(rand < 52) { // player wolf + ai
                    players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, "*AI #2*"]];
                }  else if(rand < 96) { // player wolf
                    players = [[null, "*AI*"], [interaction.member.id, interaction.member.user.username], [null, null]];
                } else { // player ai
                    players = [[null, "*AI*"], [null, "*AI #2*"], interaction.member.id, interaction.member.user.username];
                }
                // create game
                createGame(players[0][0], players[1][0], players[2][0], games.length, players[0][1], players[1][1], players[2][1], interaction.channel.id, interaction.guild.id);
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                // spectator board
                let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
                msgSpec.ephemeral = false;
                
                if(games[id].players[0]) { // player is P1
                    interaction.reply(msgSpec).then(m => {
                        gamesDiscord[id].msg = m;
                        // player board
                        turnStart(interaction, id, 0, "followup"); 
                    });
                } else if(games[id].players[1]) { // player is P2
                    interaction.reply(msgSpec).then(m => {
                        gamesDiscord[id].msg = m;
                        games[id].turn = 1;
                        // player board
                        turnStartNot(interaction, id, 1, "followup"); 
                    });
                } else if(games[id].players[2]) { // player is P3
                    interaction.reply(msgSpec).then(m => {
                        gamesDiscord[id].msg = m;
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
            createGame(players[0][0], players[1][0], players[2][0], games.length, players[0][1], players[1][1], players[2][1], interaction.channel.id, interaction.guild.id);
            let id = games.length - 1;
                
            // spectator board
            let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
            msgSpec.ephemeral = false;
            interaction.reply(msgSpec).then(m => {
                gamesDiscord[id].msg = m;
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
        case "deny":
            if(!isOutstanding(interaction.member.id)) {
                interaction.reply({ content: "**Error:** You have no outstanding challenges!", ephemeral: true });
            } else {
                let id = getPlayerGameId(interaction.member.id);
                concludeGame(id);
                destroyGame(id);
                interaction.reply("**Challenge:** " + interaction.member.user.username + " denied the challenge!");
                console.log("DENY");
            }
        break;
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
                
                let gameID = games.length;
                if(Math.floor(Math.random() * 100) < 15) { // with AI
                    createGame(interaction.member.id, opponent.id, null, gameID, interaction.member.user.username, opponent.user.username, "*AI*", interaction.channel.id, interaction.guild.id);
                } else { // without AI
                    createGame(interaction.member.id, opponent.id, null, gameID, interaction.member.user.username, opponent.user.username, null, interaction.channel.id, interaction.guild.id);
                }
                
                interaction.channel.send("**Challenge**: <@" + opponent.id + "> You have been challenged by <@" + interaction.member.id + ">! Run `/accept` to accept the challenge.");
                
                outstandingChallenge.push([opponent.id, interaction.member.id, gameID])
                
                // display board
                let id = getPlayerGameId(interaction.member.id);
                
                let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
                msgSpec.ephemeral = false;
                interaction.reply(msgSpec).then(m => {
                    gamesDiscord[id].msg = m;
                    // player board
                    turnStart(interaction, id, 0, "followup"); 
                });
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
        case "White Pawn": case "White King": case "White Knight": case "White Rook": case "White Queen":
            return 0;
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
        case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
        case "Direwolf": case "Clairvoyant Fox": case "Fox":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "White Werewolf":
        case "Attacked Scared Wolf":
        case "Black Pawn": case "Black King": case "Black Knight": case "Black Rook": case "Black Queen":
            return 1;
        case "Selected":
        case null:
            return -1;
        case "Flute Player":
        case "Devil":
        case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": 
        case "Angel":
            return 2;
    }
}

function isActive(piece) {
    switch(piece) {
        default:
            return false;
        case "Hooker": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Fortune Teller": case "Witch":
        case "Tanner": case "Archivist Fox": case "Dog": case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Clairvoyant Fox": case "Warlock": case "Saboteur Wolf":
        case "Flute Player": case "Devil": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": 
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
            return "Survives one attack.";
        case "Attacked Runner":
            return "Survived an attack. No ability.";
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
            return "Survives one attack.";
        case "Attacked Scared Wolf":
            return "Survived an attack. No ability.";
        case "Saboteur Wolf":
            return "Block a piece's movement/active ability.";
         case "White Werewolf":
            return "Must either be dead or the only remaining piece. Loses the game otherwise.";
            
        case "Flute Player":
            return "Solo | Cannot take pieces. Gets two turns per round. May move or enchant pieces, making them unable to use an ability. Wins when everyone is enchanted.";
        case "Devil":
            return "WIP!! DEVIL";
        case "Zombie":
            return "Solo | Cannot take pieces, instead turns them into Zombies. When a Zombie is taken, all Zombies it created disappear.";
            
        case "Angel":
            return "UA | Takes killer, when taken.";
    }
}

function getChessName(piece) {
    switch(piece) {
        default:
            return null;
        case "Citizen": case "Ranger": case "Huntress": case "Bartender": case "Fortune Apprentice": case "Child":
        case "Wolf": case "Wolf Cub": case "Tanner": case "Archivist Fox": case "Recluse": case "Dog":
        case "Angel": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": 
        case "White Pawn": case "Black Pawn": 
            return "Pawn";
         case "Hooker": case "Idiot": case "Crowd Seeker": case "Aura Teller":
         case "Infecting Wolf": case "Alpha Wolf": case "Psychic Wolf": case "Sneaking Wolf":
         case "White King": case "Black King": 
            return "King";
         case "Royal Knight": case "Alcoholic": case "Amnesiac":
         case "Direwolf": case "Clairvoyant Fox": case "Fox":
         case "White Knight": case "Black Knight": 
            return "Knight";
        case "Runner": case "Fortune Teller": case "Witch":
        case "Warlock": case "Scared Wolf": case "Saboteur Wolf":
        case "Attacked Runner": case "Attacked Scared Wolf":
         case "Flute Player": 
        case "White Rook": case "Black Rook": 
            return "Rook";
         case "Cursed Civilian":
         case "White Werewolf":
         case "Devil":
         case "White Queen": case "Black Queen":
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
    
    // solos cant be taken until their first turn
    if(piece.team == 2) {
        piece.protected = true;
        piece.protectedBy = 2;
    }
    
    // special data
    switch(name) {
        case "Amnesiac":
            piece.convertTo = metadata.amnesiac;
            if(!metadata.amnesiac) piece.convertTo = ["Citizen","Ranger","Aura Teller"][Math.floor(Math.random() * 3)]; // for Amnesiac by promotion
        break;
    	case "Sneaking Wolf":
		    piece.disguise = "Wolf";
    	break;    
        case "White Pawn": case "White King": case "White Knight": case "White Rook": case "White Queen":
        case "Black Pawn": case "Black King": case "Black Knight": case "Black Rook": case "Black Queen":
            piece.enemyVisibleStatus = 7;
        break;
        case "Zombie":
        case "Zombie2":
        case "Zombie3":
        case "Zombie4":
        case "Zombie5":
            piece.zombieID = 1;
            piece.zombieParent = 1;
            piece.zombieChildCount = 0;
        break;
    }
    
    // return piece
    return piece;
}

// a testing setup where two pieces are one rank away from promoting
function loadPromoteTestSetup(board) {
    board[1][0] = getPiece("Aura Teller");
    board[board.length-2][4] = getPiece("Alpha Wolf");
}

function loadTestingSetup(board) {
    let testTown = "Runner";
    let testWolf = "Runner";
    board[board.length-1][0] = getPiece(testTown);
    board[board.length-1][1] = getPiece(testTown);
    board[board.length-1][2] = getPiece(testTown);
    board[board.length-1][3] = getPiece(testTown);
    board[board.length-1][4] = getPiece(testTown);
    board[0][0] = getPiece(testWolf);
    board[0][1] = getPiece(testWolf);
    board[0][2] = getPiece(testWolf);
    board[0][3] = getPiece(testWolf);
    board[0][4] = getPiece(testWolf);
}

function getWWRevalValue(piece) {
        switch(piece) {
            case "Citizen": case "Cursed Civilian": case "Ranger": case "Child": case "Huntress":
            case "Wolf": case "Sneaking Wolf": case "Fox": case "White Werewolf": case "Recluse":
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
                
            case "Flute Player": case "Devil": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5": case "Angel":
                return 0;
            
            default:
                return 0;
    }
}

function getWWRValue(piece) { // UNUSED
        switch(piece) {
            case "Cursed Civilian":
                return -3;
            case "Citizen":
            case "Wolf": case "Sneaking Wolf": case "Fox": case "White Werewolf":
            case "Attacked Runner": case "Attacked Idiot":
            case "Attacked Scared Wolf": 
                return 0;
            case "Ranger": case "Amnesiac": case "Idiot": 
            case "Recluse": case "Tanner": 
                return 1;
            case "Child": case "Crowd Seeker": case "Aura Teller": case "Royal Knight": case "Witch": case "Bartender":
            case "Wolf Cub": case "Archivist Fox": case "Dog": case "Psychic Wolf":
                return 2;
            case "Fortune Apprentice": case "Fortune Teller": case "Runner":
            case "Alpha Wolf": case "Clairvoyant Fox": case "Scared Wolf": case "Saboteur Wolf": case "Warlock": case "Direwolf":
                return 3;
            case "Hooker": case "Alcoholic":
                return 4;
            case "Huntress":
            case "Infecting Wolf":
                return 5;
                
            case "Flute Player": case "Devil": case "Angel": case "Zombie": case "Zombie2": case "Zombie3": case "Zombie4": case "Zombie5":
                return 5;
                
            default:
                return 0;
    }
}

function generateRoleList(board) {
    // name, chess value, wwr value, incompatible with, requires
    // all town pieces
	 /// !!!!!!! USE getWWRValue for town[2]/wolf[2]
    let town = [
        ["Citizen", 1, 0, [], ""],
        ["Ranger", 1, 1, [], ""],
        ["Huntress", 1, 5, [], ""],
        ["Fortune Apprentice", 1, 3, [], ""],
        ["Fortune Apprentice", 1, 3, [], ""], // double chance
        ["Child", 1, 2, [], ""],
        ["Hooker", 3, 4, [], ""],
        ["Idiot", 3, 1, [], ""],
        ["Crowd Seeker", 3, 2, ["Fortune Teller","Aura Teller"], ""],
        ["Aura Teller", 3, 2, ["Fortune Teller","Crowd Seeker"], ""],
        ["Royal Knight", 3, 2, [], ""],
        ["Alcoholic", 3, 4, [], "Bartender"],
        ["Amnesiac", 3, 1, [], []],
        ["Amnesiac", 3, 1, [], []],
        ["Fortune Teller", 5, 3, ["Crowd Seeker","Aura Teller"], ""],
        ["Runner", 5, 3, [], ""],
        ["Witch", 5, 2, [], ""],
        ["Cursed Civilian", 9, -3, [], ""],
        ["Bartender", 1, 2, [], "Alcoholic"], // cant be rolled normally
    ];
    // all wolf pieces
    let wolf = [
        ["Wolf", 1, 0, [], ""],
        ["Wolf Cub", 1, 2, [], ""],
        ["Tanner", 1, 1, ["Sneaking Wolf"], ""],
        ["Archivist Fox", 1, 2, [], ""],
        ["Recluse", 1, 1, [], ""],
        ["Dog", 1, 2, ["Fox"], ""],
        ["Infecting Wolf", 3, 5, ["Saboteur Wolf"], ""],
        ["Alpha Wolf", 3, 3, [], ""],
        ["Psychic Wolf", 3, 2, ["Clairvoyant Fox","Warlock"], ""],
        ["Sneaking Wolf", 3, 0, ["Tanner"], ""],
        ["Direwolf", 3, 3, [], ""],
        ["Clairvoyant Fox", 3, 3, ["Warlock","Psychic Wolf"], ""],
        ["Fox", 3, 0, ["Dog"], ""],
        ["Scared Wolf", 5, 3, [], ""],
        ["Saboteur Wolf", 5, 3, ["Infecting Wolf"], ""],
        ["Warlock", 5, 3, ["Psychic Wolf","Clairvoyant Fox"], ""],
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
        for(let i = 0; i < board[0].length; i++) {
            townSelected.push(town[Math.floor(Math.random() * (town.length-1))]);
            // add previous requirement if exists
            let prevReq = townSelected[townSelected.length - 1][4];
            if(prevReq && prevReq.length) {
                townSelected.push(town.filter(el => el[0] == prevReq)[0]);
                i++;
            }
        }
        // select pieces WOLF
        wolfSelected = [];
        for(let i = 0; i < board[0].length; i++) {
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
        let totalValueWolf = totalChessValueWolf + totalWWRValueWolf;
        let combinedIncompWolf = [].concat.apply([], wolfSelected.map(el => el[3]));
        
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
            if(amnesiacRole[0] == "Amnesiac" || amnesiacRole[0] == "Bartender" || (amnesiacRole[0] == "Alcoholic" && townNames.indexOf("Alcoholic") == -1)) {
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
        
        // condition
        if(totalChessValueTown <= (board[0].length*3) && totalWWRValueTown <= (board[0].length*2.4) && totalValueTown <= (board[0].length*4.6) && totalChessValueWolf <= (board[0].length*3) && totalWWRValueWolf <= (board[0].length*2.4) && totalValueWolf <= (board[0].length*4.6) && townSelected.length == board[0].length && wolfSelected.length == board[0].length && combinedIncompTown.indexOf(townSelected[0]) == -1 && (totalValueTown >= totalValueWolf - 2 || totalValueTown <= totalValueWolf) &&combinedIncompTown.indexOf(townSelected[1]) == -1 && combinedIncompTown.indexOf(townSelected[2]) == -1 && combinedIncompTown.indexOf(townSelected[3]) == -1 && combinedIncompTown.indexOf(townSelected[4]) == -1 && combinedIncompWolf.indexOf(wolfSelected[0]) == -1 && combinedIncompWolf.indexOf(wolfSelected[1]) == -1 && combinedIncompWolf.indexOf(wolfSelected[2]) == -1 && combinedIncompWolf.indexOf(wolfSelected[3]) == -1 && combinedIncompWolf.indexOf(wolfSelected[4]) == -1) {
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
}

// randomizes an array
function randomize(arr) {
    return arr .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
}

// setups a new game
const emptyBoard = [[getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)], [getPiece(null), getPiece(null), getPiece(null), getPiece(null), getPiece(null)]];
function createGame(playerID, playerID2, playerID3, gameID, name1, name2, name3, channel, guild, height = 5, width = 5, mode = "wwress") {
    
    // store players as playing players
    if(playerID) players.push([playerID, gameID]);
    if(playerID2) players.push([playerID2, gameID]);
    if(playerID3) players.push([playerID3, gameID]);
    
    // create a blank new board
    let emptyRow = [];
    for(let i = 0; i < width; i++) {
        emptyRow.push(getPiece(null));
    }
    let newBoard = [];
    for(let i = 0; i < height; i++) {
        newBoard.push(deepCopy(emptyRow));
    }
    
    let newGame = {id: gameID, players: [ playerID, playerID2 ], playerNames: [ name1, name2 ], state: newBoard, turn: 0, normalTurn: 0, concluded: false, selectedPiece: null, doubleMove0: false, doubleMove1: false, inDoubleMove: false, ai: false, firstMove: false, aiOnly: false, height: height, width: width, doNotSerialize: false, prevMove: -1 };
 
    switch(mode) {
        case "wwress":
            // put pieces on board
            generateRoleList(newBoard);
            
            //loadPromoteTestSetup(newBoard);
            //loadTestingSetup(newBoard);
            
            // push game to list of games
            
            // add a solo
            if(name3 != null && height%2 == 1 && height >= 3) { // seo: debug solo
                let solos = [["Angel","Angel", false],["Flute Player","Flute", true],["Zombie","Graveyard", true]];
                //let selectedSolo = solos[Math.floor(Math.random() * solos.length)];
                let selectedSolo = solos[2];
                newBoard[Math.floor(height/2)][Math.floor(width/2)] = getPiece(selectedSolo[0]);
                newGame.soloTeam = selectedSolo[1];
                newGame.soloDoubleTurns = selectedSolo[2];
                
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
        case "hexapawn":
            newBoard[0][0] = getPiece("Black Pawn");
            newBoard[0][1] = getPiece("Black Pawn");
            newBoard[0][2] = getPiece("Black Pawn");
            newBoard[2][0] = getPiece("White Pawn");
            newBoard[2][1] = getPiece("White Pawn");
            newBoard[2][2] = getPiece("White Pawn");
        break;
    }
    
    games.push(newGame);
    // store some data separately because we dont need to always deep copy it
    gamesHistory.push({ id: gameID, history: [], lastMoves: [], sinceCapture: 0 }); // history data
    gamesDiscord.push({ id: gameID, channel: channel, guild: guild, msg: null, lastInteraction: null, lastInteractionTurn: null, lastMove: Date.now() }); // discord related data
}

// destroys a game
function destroyGame(id) {
    console.log("DESTROY", id);
    players = players.filter(el => el[1] != id); // delete players from playing players
    games = games.filter(el => el.id != id);
    gamesHistory = gamesHistory.filter(el => el.id != id);
    gamesDiscord = gamesDiscord.filter(el => el.id != id);
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
    let msgSpec = displayBoard(games[id], "Spectator Board", [], -1);
    msgSpec.ephemeral = false;
    gamesDiscord[id].msg.edit(msgSpec);
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
        case "Flute Player": case "Angel":
            return false;
    }
}

function generatePositions(board, position, hideLog = false, pieceTypeOverride = null) {
    let positions = [];
    position = nameToXY(position);
    let x = position.x, y = position.y;
    let piece = board[y][x];
    if(!hideLog) console.log("Finding moves for ", piece.name, " @ ", x, "|", numToRank(x), " ", y);
    const pieceTeam = piece.team;
    const pieceType = pieceTypeOverride ? pieceTypeOverride : piece.chess;
    const boardSize = Math.max(board.length, board[0].length);
    const canTake = canTakePieces(piece.name);
    // Movement Logic
    // cannot move
    if(piece.sabotaged) {
        positions = [];
    } else if(piece.stay) {
        positions = [[x, y]];
    }
    /* PAWN */
    else if(pieceType == "Pawn" && pieceTeam == 0) {
        if(y>0) {
            if(board[y-1][x].name == null) positions.push([x, y-1]);
            if(canTake && x>0 && board[y-1][x-1].name != null && enemyTeam(pieceTeam, board[y-1][x-1].team)) positions.push([x-1, y-1, true]);
            if(canTake && x<(board[0].length-1) && board[y-1][x+1].name != null && enemyTeam(pieceTeam, board[y-1][x+1].team)) positions.push([x+1, y-1, true]);
        }            
    } else if(pieceType == "Pawn" && pieceTeam == 1) {
        if(y<(board.length-1)) {
            if(board[y+1][x].name == null) positions.push([x, y+1]);
            if(canTake && x>0 && board[y+1][x-1].name != null && enemyTeam(pieceTeam, board[y+1][x-1].team)) positions.push([x-1, y+1, true]);
            if(canTake && x<(board[0].length-1) && board[y+1][x+1].name != null && enemyTeam(pieceTeam, board[y+1][x+1].team)) positions.push([x+1, y+1, true]);
        }            
    }  else if(pieceType == "Pawn" && pieceTeam == 2) { // golden pawns can move in both directions
        if(y>0) {
            if(board[y-1][x].name == null) positions.push([x, y-1]);
            if(canTake && x>0 && board[y-1][x-1].name != null && enemyTeam(pieceTeam, board[y-1][x-1].team)) positions.push([x-1, y-1, true]);
            if(canTake && x<(board[0].length-1) && board[y-1][x+1].name != null && enemyTeam(pieceTeam, board[y-1][x+1].team)) positions.push([x+1, y-1, true]);
        }         
        if(y<(board.length-1)) {
            if(board[y+1][x].name == null) positions.push([x, y+1]);
            if(canTake && x>0 && board[y+1][x-1].name != null && enemyTeam(pieceTeam, board[y+1][x-1].team)) positions.push([x-1, y+1, true]);
            if(canTake && x<(board[0].length-1) && board[y+1][x+1].name != null && enemyTeam(pieceTeam, board[y+1][x+1].team)) positions.push([x+1, y+1, true]);
        }            
    } 
    /* ROOK */
    else if(pieceType == "Rook") {
        for(let xt1 = x+1; xt1 < board[0].length; xt1++) {
            if(inBoundsX(board[0].length, xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(canTake && inBoundsX(board[0].length, xt1) && enemyTeam(pieceTeam, board[y][xt1].team)) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBoundsX(board[0].length, xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(canTake && inBoundsX(board[0].length, xt2) && enemyTeam(pieceTeam, board[y][xt2].team)) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < board.length; yt1++) {
            if(inBoundsY(board.length, yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(canTake && inBoundsY(board.length, yt1) && enemyTeam(pieceTeam, board[yt1][x].team)) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBoundsY(board.length, yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(canTake && inBoundsY(board.length, yt2) && enemyTeam(pieceTeam, board[yt2][x].team)) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
    } /* QUEEN */
    else if(pieceType == "Queen") {
        for(let xt1 = x+1; xt1 < board[0].length; xt1++) {
            if(inBoundsX(board[0].length, xt1) && board[y][xt1].name == null) {
                positions.push([xt1, y]);
            } else if(canTake && inBoundsX(board[0].length, xt1) && enemyTeam(pieceTeam, board[y][xt1].team)) {
                positions.push([xt1, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let xt2 = x-1; xt2 >= 0; xt2--) {
            if(inBoundsX(board[0].length, xt2) && board[y][xt2].name == null) {
                positions.push([xt2, y]);
            } else if(canTake && inBoundsX(board[0].length, xt2) && enemyTeam(pieceTeam, board[y][xt2].team)) {
                positions.push([xt2, y, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt1 = y+1; yt1 < board.length; yt1++) {
            if(inBoundsY(board.length, yt1) && board[yt1][x].name == null) {
                positions.push([x, yt1]);
            } else if(canTake && inBoundsY(board.length, yt1) && enemyTeam(pieceTeam, board[yt1][x].team)) {
                positions.push([x, yt1, true]);
                break;
            } else {
                break;
            }
        }
        for(let yt2 = y-1; yt2 >= 0; yt2--) {
            if(inBoundsY(board.length, yt2) && board[yt2][x].name == null) {
                positions.push([x, yt2]);
            } else if(canTake && inBoundsY(board.length, yt2) && enemyTeam(pieceTeam, board[yt2][x].team)) {
                positions.push([x, yt2, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y+offset) && board[y+offset][x+offset].name == null) {
                positions.push([x+offset, y+offset]);
            } else if(canTake && inBounds(board[0].length, board.length, x+offset, y+offset) && enemyTeam(pieceTeam, board[y+offset][x+offset].team)) {
                positions.push([x+offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y+offset) && board[y+offset][x-offset].name == null) {
                positions.push([x-offset, y+offset]);
            } else if(canTake && inBounds(board[0].length, board.length, x-offset, y+offset) && enemyTeam(pieceTeam, board[y+offset][x-offset].team)) {
                positions.push([x-offset, y+offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x+offset, y-offset) && board[y-offset][x+offset].name == null) {
                positions.push([x+offset, y-offset]);
            } else if(canTake && inBounds(board[0].length, board.length, x+offset, y-offset) && enemyTeam(pieceTeam, board[y-offset][x+offset].team)) {
                positions.push([x+offset, y-offset, true]);
                break;
            } else {
                break;
            }
        }
        for(let offset = 1; offset < boardSize; offset++) {
            if(inBounds(board[0].length, board.length, x-offset, y-offset) && board[y-offset][x-offset].name == null) {
                positions.push([x-offset, y-offset]);
            } else if(canTake && inBounds(board[0].length, board.length, x-offset, y-offset) && enemyTeam(pieceTeam, board[y-offset][x-offset].team)) {
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
            if(inBounds(board[0].length, board.length, px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(canTake && inBounds(board[0].length, board.length, px, py) && enemyTeam(pieceTeam, board[py][px].team)) positions.push([px, py, true]);
        }
    }
    /* KNIGHT */
    else if(pieceType == "Knight") {
        let possibleMoves = [[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]];
        for(let i = 0; i < possibleMoves.length; i++) {
            let px = x + possibleMoves[i][0];
            let py = y + possibleMoves[i][1];
            if(inBounds(board[0].length, board.length, px, py) && board[py][px].name == null) positions.push([px, py]);
            else if(canTake && inBounds(board[0].length, board.length, px, py) && enemyTeam(pieceTeam, board[py][px].team)) positions.push([px, py, true]);
        }
    }
    positions.sort((a,b) => (xyToName(a[0], a[1]) > xyToName(b[0], b[1])) ? 1 : ((xyToName(b[0], b[1]) > xyToName(a[0], a[1])) ? -1 : 0));
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
                interactions.push({ type: 2, label: xyToName(x, y) + " " + board[y][x].name + " " + getUnicode(board[y][x].chess, team), style: isPawn(board[y][x]) ? 2 : 1, custom_id: "select-" + xyToName(x, y) });
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
    let boardMsg = "**⬜ " + game.playerNames[0] + " vs. ⬛ " + game.playerNames[1] + (game.playerNames.length == 3 ? " vs. 🟧 " + game.playerNames[2] : "")  + "**\n" + "**" + message + "**" + debugValues + "\n";
    let boardRows = ["🟦"];
    let visiblePieces = [];
    const letterRanks = ["🇦","🇧","🇨","🇩","​🇪","🇫","🇬","🇭","🇮","🇯","🇰","🇱","🇲","🇳","🇴","🇵"];
    const numberRow = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟",findEmoji("eleven"),findEmoji("twelve"),findEmoji("thirteen"),findEmoji("fourteen"),findEmoji("fifteen"),findEmoji("sixteen")];
    const curTurn = turnOverride != null ? turnOverride : game.turn;
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
    if(boardSize <= 8) {
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
                    if(lm[6] == 6 && lm[2]) lmMsg += findEmoji(lm[2]);
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
    } else { // too big, no last moves
        for(let i = 0; i < boardRows.length; i++) {
            boardRows[i] += "🟦";
        }
        boardRows.push("🟦".repeat(game.width) + "🟦🟦");
    }
    if(game.solo && !game.goldEliminated) {
        switch(game.soloTeam) {
            case "Flute":
                if(game.soloRevealed) boardRows.push("🎶​ **Enchanted:** " + (soloAffectedRoles.length>0?soloAffectedRoles.join(", "):"*None*"));
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
        if(visiblePieces[i] == "Zombie2" || visiblePieces[i] == "Zombie3" || visiblePieces[i] == "Zombie4" || visiblePieces[i] == "Zombie5") continue; // unlisted roles
        boardRows.push(findEmoji((getTeam(visiblePieces[i])==1?"Black":(getTeam(visiblePieces[i])==0?"White":"Gold")) + getChessName(visiblePieces[i])) + " " + findEmoji(visiblePieces[i]) + " **" + visiblePieces[i] + ":** " + getAbilityText(visiblePieces[i]));
    }
    if(invulSolo) boardRows.push(findEmoji("GoldUnknown") + " " + " **Solo/Unaligned:** This piece cannot be taken until its first move.");
    return (boardMsg + boardRows.join("\n")).substr(0, 1950);
}

// find an emoji by name
function findEmoji(name) {
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
    switch(field.name) {
        default: 
            // get name
            let fieldName;
            if(field.team == turn || field.enemyVisibleStatus == 7) fieldName = field.name;
            else if(field.enemyVisibleStatus == 6 && !field.disguise) fieldName = field.name;
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
    client.application?.commands.create({
        name: 'play',
        description: 'Starts a game.'
    });
    client.application?.commands.create({
        name: 'aigame',
        description: 'Starts a game with just AIs.'
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
        name: 'pieces',
        description: 'Lists the pieces of a team.',
        options: [
            {
                type: "STRING",
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
