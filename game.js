
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
        case "Bat":
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
            game.state[enchantSource.y][enchantSource.x].stay = true;
            game.state[enchantSource.y][enchantSource.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, enchantSourceObject.name, enchantSourceObject.disguise, enchantSourceObject.enemyVisible, xyToName(enchantSource.x, enchantSource.y), xyToName(enchantTarget.x, enchantTarget.y), enchantSourceObject.enemyVisibleStatus, "🎶"]);
            game.soloRevealed = true;
            return false;
        break;
        case "Demonize":
        case "Vampire":
            let demonizeTarget = { x: position[0], y: position[1] };
            let demonizeSource = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let demonizeSourceObject = game.state[demonizeSource.y][demonizeSource.x];
            game.state[demonizeTarget.y][demonizeTarget.x].demonized = true;
            game.state[demonizeTarget.y][demonizeTarget.x].soloEffect = true;
            game.state[demonizeSource.y][demonizeSource.x].stay = true;
            game.state[demonizeSource.y][demonizeSource.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, demonizeSourceObject.name, demonizeSourceObject.disguise, demonizeSourceObject.enemyVisible, xyToName(demonizeSource.x, demonizeSource.y), xyToName(demonizeTarget.x, demonizeTarget.y), demonizeSourceObject.enemyVisibleStatus, "🧛"]);
            game.soloRevealed = true;
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
        case "TransformReveal":
        case "Bloody Butcher":
            let transformer2 = { x: abilityPieceLocation[0], y: abilityPieceLocation[1] };
            let transformer2Name = xyToName(abilityPieceLocation[0], abilityPieceLocation[1]);
            game.state[transformer2.y][transformer2.x] = convertPiece(game.state[transformer2.y][transformer2.x], position);
            game.state[transformer2.y][transformer2.x].enemyVisibleStatus = 7;
            if(log) gameHistory.lastMoves.push([game.turn, game.state[transformer2.y][transformer2.x].name, false, "", transformer2Name, transformer2Name, 7, "❕🟦🟦"]);
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
            if(investTargetObject.name == "Recluse" || investTargetObject.name == "Bard") { // recluse reveal
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