const STORAGE_KEY_CURRENT = "jeepscore-CurrentGames";

class GameManager
{
    constructor()
    {
        this._init();

        return this;
    }

    _init()
    {
        this.setGame(null);
    }


    getCurrentGame()
    {
        return this.game;
    }


    setGame(game)
    {
        this.game = game;
    }


    startGame(game)
    {
        this.setGame(game);
        GameManager.saveGame(this.game);

        GameUI.renderGame(this.game,
            document.querySelector("#currentGameSlot"));

        GameUI.setUiState_allowStart();
        GameUI.setUiState_allowEnd();
        GameUI.allowBodyClick(true);
        GameUI.setupPastGamesUi();
        GameUI.updateUrl(this.getCurrentGame());
    }


    endGame()
    {
        let game = this.getCurrentGame();
        game.end();

        GameManager.saveGame(game);
    }


    static getPastGamesCount()
    {
        let savedData = GameManager._getRawSavedGamesData();
        return Object.keys(savedData).length;
    }


    static getLatestSavedGame()
    {
        let gameId = GameUI.getGameIdFromUrl(window.location.href);

        if (gameId)
        {
            let savedData = GameManager._getRawSavedGamesData();
            if (savedData[gameId])
                return new Game(savedData[gameId]);
        }

        return null;
    }


    static _getRawSavedGamesData()
    {
        let jsonStr = localStorage.getItem(STORAGE_KEY_CURRENT) ?? "{}";
        let gameData = JSON.parse(jsonStr);

        return gameData;
    }


    static getSavedGames()
    {
        return Object.values(GameManager._getRawSavedGamesData())
            .map(data => new Game(data));
    }


    static deleteSavedGame(gameId)
    {
        let data = GameManager._getRawSavedGamesData();

        delete data[gameId];

        GameManager.saveCurrentGameData(data);
    }


    static deleteAllGames()
    {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify({}));
    }


    static saveCurrentGameData(data)
    {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data ?? {}));
    }


    static saveGame(game)
    {
        let data = GameManager._getRawSavedGamesData();
        data[game.getId()] = game.getRawData();

        let keepHowMany = 20;
        let dropDates = Object.keys(data).sort().slice(0, -keepHowMany);
        for (let d of dropDates)
            delete data[d];

        GameManager.saveCurrentGameData(data);
    }


    static getSavedGameRawData(gameId)
    {
        let data = GameManager._getRawSavedGamesData();
        return data[gameId];
    }
}


class Player
{
    constructor(params)
    {
        let fromObj = params.data ?? params;

        this.data = {
            name: fromObj.name,
            bid: Math.round(fromObj.bid),
            id: (fromObj.id ?? Math.round(Math.random() * 10000000)) + "",
        }

        return this;
    }


    getName()
    {
        return this.data.name;
    }


    getId()
    {
        return this.data.id;
    }


    getBid()
    {
        return this.data.bid;
    }
}


const SCORE_ALGORITHMS = {
    SPREAD_SPLIT: "Spread Split",
    PRICE_IS_RIGHT: "Price Is Right",
};

class Game
{
    constructor(params)
    {
        let fromObj = params.data ?? params;

        // Since we may be constructing from raw data, turn it into objects
        // if necessary.
        let players = [];
        for (let p of fromObj.players)
        {
            if (p instanceof Player)
                players.push(p);
            else
            {
                players.push(new Player(p));
            }
        }

        let startTime = fromObj.startTime ? new Date(fromObj.startTime) : null;
        let endTime = fromObj.endTime ? new Date(fromObj.endTime) : null;

        this.data = {
            id: fromObj.id ?? (new Date()).toISOString(),
            name: fromObj.name ?? "",
            players: players,
            startTime: startTime,
            endTime: endTime,
            count: fromObj.count ?? 0,
            scoreAlgorithm: fromObj.scoreAlgorithm ?? "SPREAD_SPLIT"
        };

        return this;
    }


    start()
    {
        if (this.getStartTime() !== null)
            throw new Error("Can't start a game that is already running");

        if (this.getEndTime() !== null)
            throw new Error("Can't start a game that has ended");

        this.data.startTime = new Date();
    }


    end()
    {
        if (this.getStartTime() === null)
            throw new Error("Can't end a game that hasn't started");

        if (this.getEndTime() !== null)
            throw new Error("Can't end a game that has already ended");

        this.data.endTime = new Date();
    }


    incCount()
    {
        if (this.getStartTime() === null)
            throw new Error("Can't increment count if game hasn't started");

        ++this.data.count;
    }


    decCount()
    {
        if (this.getStartTime() === null)
            throw new Error("Can't decrement count if game hasn't started");

        this.data.count = Math.max(0, --this.data.count);
    }


    getCount()
    {
        return this.data.count;
    }


    getPlayers()
    {
        return this.data.players;
    }


    getPlayerById(id)
    {
        return this.getPlayers().filter(p => p.getId() === id)[0] ?? null;
    }


    getNumPlayers()
    {
        return this.getPlayers().length;
    }


    getStartTime()
    {
        return this.data.startTime;
    }


    getEndTime()
    {
        return this.data.endTime;
    }


    setScoreAlgorithm(algo)
    {
        this.data.scoreAlgorithm = algo;
    }


    getScoreAlgorithm()
    {
        return this.data.scoreAlgorithm;
    }


    getScoreData()
    {
        switch (this.data.scoreAlgorithm)
        {
            case "SPREAD_SPLIT":
                return this.getScore_spreadSplit();

            case "PRICE_IS_RIGHT":
                return this.getScore_priceIsRight();
        }

        return this.getScore_spreadSplit();
    }


    getScore_spreadSplit()
    {
        let scoreData = {};
        let bids = this.getPlayers().map(p => p.getBid());
        let min = Math.min(...bids);
        let max = Math.max(...bids);
        let splitSpread = Math.round((max - min) / this.getNumPlayers());

        for (let p of this.getPlayers())
        {
            let playerMin = Math.max(0, p.getBid() - splitSpread);
            let playerMax = p.getBid() + splitSpread;
            let isLow = this.getCount() < playerMin;
            let isHigh = this.getCount() > playerMax;
            let isWin = !isLow && !isHigh;

            scoreData[p.getId()] = {
                name: p.getName(),
                min: playerMin,
                max: playerMax,
                bid: p.getBid(),
                isLow: isLow,
                isHigh: isHigh,
                isWin: isWin,
                rowClassList: [ isWin ? "win" : isLow ? "yellow" : "lose" ]
            };
        }

        return {
            columns: [
                { name: "Name", prop: "name", classList: [ "name" ] },
                { name: "Low", prop: "min", classList: [ "score" ] },
                { name: "Bid", prop: "bid", classList: [ "score", "bid"] },
                { name: "High", prop: "max", classList: [ "score" ] },
            ],
            data: scoreData,
        }
    }


    getScore_priceIsRight()
    {
        let scoreData = {};

        for (let p of this.getPlayers())
        {
            let isLow = p.getBid() < this.getCount();
            let isHigh = p.getBid() > this.getCount();

            scoreData[p.getId()] = {
                name: p.getName(),
                bid: p.getBid(),
                isLow: isLow,
                isHigh: isHigh,
                diff: this.getCount() - p.getBid(),
            };
        }

        let smallestDiff = Math.min(...Object.values(scoreData)
            .filter(i => i.diff >= 0)
            .map(i => i.diff)
        );

        // Mark the current winners (who are closest to the count without
        // going over)
        for (let p of this.getPlayers())
        {
            let pid = p.getId();
            let diff = scoreData[pid].diff;
            scoreData[pid].isWin = diff >=0 && diff <= smallestDiff;
            scoreData[pid].rowClassList = [
                scoreData[pid].isWin ? "win" : "lose"
            ];
        }

        return {
            columns: [
                { name: "Name", prop: "name", classList: [ "name" ] },
                { name: "Bid", prop: "bid", classList: [ "score", "bid" ] },
            ],
            data: scoreData,
        }
    }


    getRawData()
    {
        return Object.assign({}, this.data);
    }


    getId()
    {
        return this.data.id;
    }


    getName()
    {
        return this.data.name;
    }


    setName(name)
    {
        this.data.name = name;
    }
}


function getPrettyElapsedTime(elapsedSeconds, ...units)
{
    // Supports units of "ywdhms" or "h","m","s"...
    units = units.map(s => s.split("")).flat();

    // If "0" is in units, also output the fields that have 0 value
    //   i.e.  "2h 0m 1s"  instead of "2h 1s"
    let keepZero = units.includes("0");
    units = units.filter(el => el !== "0");
    if (units.length === 0)
        units = [ "y", "w", "d", "h", "m", "s" ];

    let fields = {};

    if (units.includes("y"))
    {
        let secPerYear = 365 * 24 * 60 * 60;
        fields.y = Math.trunc(elapsedSeconds / secPerYear);
        elapsedSeconds -= fields.y * secPerYear;
    }

    if (units.includes("w"))
    {
        let secPerWeek = 7 * 24 * 60 * 60;
        fields.w = Math.trunc(elapsedSeconds / secPerWeek);
        elapsedSeconds -= fields.w * secPerWeek;
    }

    if (units.includes("d"))
    {
        let secPerDay = 24 * 60 * 60;
        fields.d = Math.trunc(elapsedSeconds / secPerDay);
        elapsedSeconds -= fields.d * secPerDay;
    }

    if (units.includes("h"))
    {
        let secPerHour = 60 * 60;
        fields.h = Math.trunc(elapsedSeconds / secPerHour);
        elapsedSeconds -= fields.h * secPerHour;
    }

    if (units.includes("m"))
    {
        let secPerMin = 60;
        fields.m = Math.trunc(elapsedSeconds / secPerMin);
        elapsedSeconds -= fields.m * secPerMin;
    }

    if (units.includes("s"))
    {
        fields.s = elapsedSeconds;
    }

    let out = [];
    for (let i of ["y", "w", "d", "h", "m", "s"])
    {
        if (i in fields)
        {
            // include fields of 0 if 0 was given in units
            if (!keepZero && fields[i] === 0)
                continue;

            out.push(`${fields[i]}${i}`);
        }
    }

    return out.length === 0 ? "0s" : out.join(" ");
}


class GameUI
{
    static start()
    {
        window.gameManager = new GameManager();

        window.addEventListener("popstate", evt => {
                let gameId = GameUI.getGameIdFromUrl(window.location.href);
                if (gameId)
                {
                    let rawGameData = GameManager.getSavedGameRawData(gameId);
                    if (rawGameData)
                    {
                        window.gameManager.startGame(new Game(rawGameData));
                        return;
                    }
                }

                GameUI.updateUrl(null);
            });

        GameUI.setupNewGameUi();
        GameUI.setupCurrentGameUi();
        GameUI.setupPastGamesUi();
    }


    static delaySetFocus(el)
    {
        window.setTimeout(() => { el.focus() }, 0);
    }


    static click_addPlayer(evt)
    {
        let playerEntryDiv = GameUI
            .cloneFromTemplate(document, "#playerEntryTmpl");

        playerEntryDiv.querySelector(".playerDelete")
            .addEventListener("click", GameUI.click_deletePlayer);

        playerEntryDiv.querySelector(".bidButton")
            .addEventListener("click", GameUI.click_bid);

        playerEntryDiv.querySelector(".playerName")
            .addEventListener("change", evt => {
                    let entryEl = evt.target.closest(".playerEntry");
                    GameUI.delaySetFocus(entryEl.querySelector(".playerBid"));
                });

        playerEntryDiv.querySelector(".playerBid")
            .addEventListener("change", GameUI.click_bid);

        let playerEntryContainer =
            document.querySelector("#playerEntryContainer");

        playerEntryContainer.appendChild(playerEntryDiv);

        GameUI.delaySetFocus(
            Array.from(playerEntryContainer.querySelectorAll(".playerName"))
                .slice(-1)[0]);
    }


    static click_deletePlayer(evt)
    {
        let entryEl = evt.target.closest(".playerEntry");
        entryEl.remove();

        GameUI.setUiState_allowStart();
    }


    static click_bid(evt)
    {
        let entryEl = evt.target.closest(".playerEntry");

        let bidEl = entryEl.querySelector(".playerBid");
        let nameEl = entryEl.querySelector(".playerName");

        if (nameEl.value.trim() === "" ||
            bidEl.value.trim() === "" ||
            parseInt(bidEl.value, 10) < 0)
        {
            GameUI.flashError();
            return false;
        }

        // Disable player changes now that name and bid have been entered
        nameEl.disabled = true;
        entryEl.querySelector(".bidButton").disabled = true;

        bidEl.disabled = true;

        // Pad and hide the player's bid
        bidEl.type = "password";
        bidEl.value = bidEl.value.padEnd(7, " ");

        evt.target.closest("#playerEntryPanel")
            .querySelector("#addPlayer").focus();

        GameUI.setUiState_allowStart();
    }


    static updateCounter(gameContainer, game)
    {
        let counter = gameContainer.querySelector(".counter");
        counter.innerText = game.getCount();
    }


    static renderScoreBoard(gameContainer, scoreData)
    {
        let $table = gameContainer.querySelector("table.scoreBoard");
        GameUI.replaceChildrenWithElement($table, null);

        GameUI.buildScoreBoardHeader($table.insertRow(),
            scoreData.columns);

        for (let v of Object.values(scoreData.data).sort((a,b) => a.name.localeCompare(b)))
        {
            GameUI.buildScoreBoardPlayerRow($table.insertRow(),
                scoreData.columns, v);
        }
    }


    static buildScoreBoardHeader($tr, columns)
    {
        for (let c of columns)
        {
            let $th = document.createElement("th");
            $th.setAttribute("scope", "col");
            $th.innerText = c.name;

            $tr.appendChild($th);
        }
    }


    static buildScoreBoardPlayerRow($tr, columns, data)
    {
        $tr.classList.add(...data.rowClassList);

        for (let c of columns)
        {
            let $td = document.createElement("td");
            $td.setAttribute("scope", "col");
            $td.innerText = data[c.prop];
            $td.classList.add(...c.classList);

            $tr.appendChild($td);
        }
    }


    static updateTimes(container, game)
    {
        let startTime = game.getStartTime();
        container.querySelector(".startTimeValue").innerText =
            GameUI.formatDateTime(startTime);

        let endTimeRow = container.querySelector(".endTime");
        let endTime = game.getEndTime();
        if (endTime)
        {
            container.querySelector(".endTimeValue").innerText =
                GameUI.formatDateTime(endTime);

            endTimeRow.hidden = false;
        }
        else
            endTimeRow.hidden = true;

        endTime = endTime ?? new Date();
        let elapsedPrettyTime = getPrettyElapsedTime(
            Math.ceil((endTime.getTime() - startTime.getTime()) / 1000));

        container.querySelector(".elapsedTimeValue")
            .innerText = elapsedPrettyTime;
    }


    static setupScoringSelector(container, scoreAlgorithms, game)
    {
        let $sel = container.querySelector("select.scoreAlgo");
        GameUI.replaceChildrenWithElement($sel, null);

        for (let ar of Object.entries(scoreAlgorithms))
        {
            let $opt = document.createElement("option");
            $opt.value = ar[0];
            $opt.innerText = ar[1];
            $opt.selected = game.getScoreAlgorithm() === ar[0];
            $sel.appendChild($opt)
        }
    }


    static counter_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.incCount();
        GameUI.updateCounter(document, game);
        GameUI.renderScoreBoard(gameContainer, game.getScoreData());

        GameManager.saveGame(game);
    }


    static dec_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.decCount();
        GameUI.updateCounter(document, game);
        GameUI.renderScoreBoard(gameContainer, game.getScoreData());

        GameManager.saveGame(game);
    }


    static start_click(evt)
    {
        let players = GameUI.getEnteredPlayers();

        GameUI.replaceChildrenWithElement(document.querySelector("#playerEntryContainer"), null);

        let newGame = new Game({players});
        newGame.start();
        window.gameManager.startGame(newGame);
    }


    static end_click(evt)
    {
        if (window.confirm("Are you sure you want to end this game?") !== true)
            return;

        let currentGame = window.gameManager.getCurrentGame();

        window.gameManager.endGame();

        GameUI.updateTimes(document.querySelector(".timeTable"), currentGame);

        let gameContainer = document.querySelector("#gameContainer");
        GameUI.allowCounterActions(false, gameContainer);
        gameContainer.classList.add("finishedGame");

        GameUI.setUiState_allowEnd();
        GameUI.setupPastGamesUi();
    }


    static change_score(evt)
    {
        let currentGame = window.gameManager.getCurrentGame();
        currentGame.setScoreAlgorithm(evt.target.selectedOptions[0].value);
        GameManager.saveGame(currentGame);

        GameUI.renderGame(currentGame,
            document.querySelector("#currentGameSlot"));
    }


    static body_click(evt)
    {
        let currentGame = window.gameManager.getCurrentGame();
        if (currentGame)
            GameUI.updateTimes(document.querySelector(".timeTable"), currentGame);
    }


    static allowBodyClick()
    {
        document.body.addEventListener("click", GameUI.body_click);
    }


    static click_load(evt)
    {
        let $checked = document.querySelectorAll(".pastGamesList input:checked");

        if ($checked.length !== 1)
        {
            GameUI.flashError();
            return;
        }

        let gameId = $checked[0].value;
        let rawGameData = GameManager.getSavedGameRawData(gameId);

        window.gameManager.startGame(new Game(rawGameData));
    }


    static click_delete(evt)
    {
        let $checked = document.querySelectorAll(".pastGamesList input:checked");

        if ($checked.length === 0)
        {
            GameUI.flashError();
            return;
        }

        if (window.confirm("Are you sure you want to delete?") !== true)
            return;

        for (let $el of $checked)
        {
            let gameId = $el.value;
            GameManager.deleteSavedGame(gameId);

            if (gameId === window.gameManager.getCurrentGame().getId())
                GameUI.updateUrl(null);
        }

        GameUI.setupCurrentGameUi();
        GameUI.setupPastGamesUi();
    }


    static click_deleteAll(evt)
    {
        if (window.confirm("Are you sure you want to delete all?") !== true)
            return;

        GameManager.deleteAllGames();

        GameUI.updateUrl(null);

        GameUI.setupCurrentGameUi();
        GameUI.setupPastGamesUi();
    }


    static allowCounterActions(enable, gameContainer)
    {
        gameContainer.querySelector(".counter")[
            enable ? "addEventListener" : "removeEventListener"]
                ("click", GameUI.counter_click);

        gameContainer.querySelector(".inccount")[
            enable ? "addEventListener" : "removeEventListener"]
                ("click", GameUI.counter_click);

        gameContainer.querySelector(".deccount")[
            enable ? "addEventListener" : "removeEventListener"]
                ("click", GameUI.dec_click);
    }


    static click_editGame(evt)
    {
        let gameId = evt.target.closest(".pastGameEntry")
            .querySelector("input").value;

        let newGame = new Game(GameManager.getSavedGameRawData(gameId));
        let currentGame = window.gameManager.getCurrentGame();

        // Since we're not changing game IDs, we can modify the games
        // as needed.  But, if the game entry being renamed is the current
        // game, make changes on the game manager's current game object
        // (otherwise, they'll be overwritten on next user action causing a
        // save).
        if (currentGame && currentGame.getId() === gameId)
        {
            newGame = currentGame;
        }

        let name = window.prompt("Name this game:", newGame.getName());
        if (name !== null)
        {
            name = name.trim();
            if (name === "")
                name = null;

            newGame.setName(name);
            GameManager.saveGame(newGame);
            GameUI.setupPastGamesUi();
        }
    }


    static renderGame(game, $target)
    {
        let gameContainer = GameUI
            .cloneFromTemplate(document, "#currentGameTmpl");

        GameUI.makeLegend("Game On!",
            gameContainer.querySelector("fieldset"));

        gameContainer.querySelector("#endGame")
            .addEventListener("click", GameUI.end_click);

        gameContainer.querySelector(".scoreAlgo")
            .addEventListener("change", GameUI.change_score);

        GameUI.allowCounterActions(!game.getEndTime(), gameContainer);
        GameUI.updateCounter(gameContainer, game);
        GameUI.renderScoreBoard(gameContainer, game.getScoreData());
        GameUI.updateTimes(gameContainer, game);
        GameUI.setupScoringSelector(gameContainer, SCORE_ALGORITHMS, game);

        gameContainer.querySelector("#scoreHelp")
            .addEventListener("click", GameUI.showHelpDialog);

        if (game.getEndTime())
            gameContainer.querySelector("#gameContainer")
                .classList.add("finishedGame");

        GameUI.replaceChildrenWithElement($target, gameContainer);

        GameUI.setUiState_allowEnd();
    }


    static getEnteredPlayers()
    {
        let players = [];
        for (let entry of document.querySelectorAll(".playerEntry"))
        {
            let name = entry.querySelector(".playerName").value.trim();
            let bid = parseInt(entry.querySelector(".playerBid").value.trim(), 10);

            if (name !== "" && bid >= 0)
                players.push(new Player({name, bid}));
        }

        return players;
    }


    static setUiState_allowStart()
    {
        let allowStart = false;

        if (GameUI.getEnteredPlayers().length > 0)
            allowStart = true;
        else
            allowStart = false;

        document.querySelector("#newGameSlot #startGameButton").disabled = !allowStart;
    }


    static setUiState_allowEnd()
    {
        let allowEnd = false;

        let currentGame = window.gameManager.getCurrentGame();
        if (currentGame && !currentGame.getEndTime())
        {
            allowEnd = true;
        }
        else
        {
            allowEnd = false;
        }

        let el = document.querySelector("#endGame")
        if (el)
            el.disabled = !allowEnd;
    }


    static setupPastGamesUi()
    {
        let slot = document.querySelector("#pastGamesSlot");
        GameUI.renderPastGames(document, slot);

        let hasSavedGames = GameManager.getPastGamesCount() > 0;
        slot.querySelector("#loadGameButton").disabled = !hasSavedGames;
        slot.querySelector("#deleteGameButton").disabled = !hasSavedGames;
        slot.querySelector("#deleteAllGamesButton").disabled = !hasSavedGames;

        slot.querySelector("#loadGameButton")
            .addEventListener("click", GameUI.click_load);

        slot.querySelector("#deleteGameButton")
            .addEventListener("click", GameUI.click_delete);

        slot.querySelector("#deleteAllGamesButton")
            .addEventListener("click", GameUI.click_deleteAll);
    }


    static setupNewGameUi()
    {
        let newGameTmpl = GameUI.cloneFromTemplate(document, "#newGameTmpl");

        GameUI.makeLegend("New Game",
            newGameTmpl.querySelector("fieldset"));

        newGameTmpl.querySelector("#addPlayer")
            .addEventListener("click", GameUI.click_addPlayer);
        newGameTmpl.querySelector("#startGameButton")
            .addEventListener("click", GameUI.start_click);

        GameUI.replaceChildrenWithElement(document.querySelector("#newGameSlot"), newGameTmpl);

        GameUI.setUiState_allowStart();
    }


    static setupCurrentGameUi()
    {
        let latestGame = GameManager.getLatestSavedGame();
        if (!latestGame)
        {
            GameUI.replaceChildrenWithElement(
                document.querySelector("#currentGameSlot", null));
            window.gameManager.setGame(null);
            GameUI.updateUrl(null);

            return;
        }

        window.gameManager.startGame(latestGame);
    }


    static getGameIdFromUrl(url)
    {
        url = new URL(url);
        if (url.hash.length > 1)
        {
            return url.hash.substr(1);
        }

        return null;
    }


    static updateUrl(game)
    {
        if (!game)
        {
            window.history.replaceState({}, '', window.location.pathname);
            document.title = `Jeep Score`;
            return;
        }

        if (window.location.hash.substr(1) !== game.getId())
        {
            let gameTitle = GameUI.getGameTitle(game);

            window.history.pushState(game.getId(),
                gameTitle,
                "#" + game.getId());

            document.title = `Jeep Score : ${gameTitle}`;
        }
    }


    static getGameTitle(game)
    {
        return game.getName() !== "" ?
            game.getName() :
            GameUI.formatDateTime(game.getStartTime());
    }


    static getGameDisplayString(game)
    {
        return `${GameUI.getGameTitle(game)} ${game.getNumPlayers()}P ${game.getCount()}#`;
    }


    static renderPastGames(templateDoc, destEl)
    {
        let pastGamesTmpl = GameUI.
            cloneFromTemplate(templateDoc, "#pastGamesContainerTmpl");

        let $list = pastGamesTmpl.querySelector(".pastGamesList");

        let numGames = GameManager.getPastGamesCount();

        GameUI.makeLegend(`Saved Games (${numGames})`,
            pastGamesTmpl.querySelector("fieldset"));

        if (numGames !== 0)
        {
            let games = GameManager.getSavedGames();
            let currentGame = window.gameManager.getCurrentGame();

            // Show games from newest to oldest
            for (let game of games.sort((a, b) =>
                b.getStartTime().getTime() - a.getStartTime().getTime()))
            {
                let pastGameTmpl = GameUI.
                    cloneFromTemplate(templateDoc, "#pastGameTmpl");
                let $input = pastGameTmpl.querySelector("input");
                let $label = pastGameTmpl.querySelector(".pastGameLabel");
                let $text = pastGameTmpl.querySelector(".labelText");
                $text.innerText = GameUI.getGameDisplayString(game);
                $input.value = game.getId();

                if (game.getEndTime() !== null)
                {
                    let $rowColor = pastGameTmpl.querySelector(".rowColor");
                    $rowColor.classList.add("ended");
                }

                let $isCurrent = pastGameTmpl.querySelector(".isCurrent");
                if (currentGame && currentGame.getId() === game.getId())
                    $isCurrent.classList.add("current");
                else
                    $isCurrent.classList.add("notcurrent");

                let $editIcon = pastGameTmpl.querySelector(".edit");
                $editIcon.addEventListener("click", GameUI.click_editGame);

                $list.appendChild(pastGameTmpl);
            }
        }

        GameUI.replaceChildrenWithElement(destEl, pastGamesTmpl);
    }


    static replaceChildrenWithElement(targetEl, newEl)
    {
        while (targetEl.firstChild)
            targetEl.firstChild.remove();

        if (newEl)
            targetEl.appendChild(newEl);
    }


    static click_toggleFieldsetContent(evt)
    {
        // Presumes all fieldsets wanting toggling have a div in them that
        // contains the toggleable content.
        let $fieldSetContent = evt.target.closest("fieldset").querySelector("div");
        if ($fieldSetContent)
        {
            $fieldSetContent.hidden = !$fieldSetContent.hidden;
        }
    }


    static makeLegend(text, $fieldset)
    {
        let $legend = document.createElement("legend");
        $legend.innerText = text;
        $legend.addEventListener("click", GameUI.click_toggleFieldsetContent);

        let $currentLegend = $fieldset.querySelector("legend");
        if ($currentLegend)
            $currentLegend.replaceWith($legend);
        else
            $fieldset.prepend($legend);
    }


    static cloneFromTemplate(doc, tmplSelector)
    {
        return doc.querySelector(tmplSelector).content.cloneNode(true);
    }


    static formatDateTime(dateObj)
    {
        return new Intl.DateTimeFormat(undefined, {
              year: "numeric", month: "short", day: "numeric",
              hour: "numeric", minute: "numeric"
            }).format(dateObj);
    }


    static flashError()
    {
        let $ohnoDiv = GameUI.cloneFromTemplate(document, "#ohNoTmpl");

        document.body.appendChild($ohnoDiv);

        window.setTimeout(() => document.querySelector("#ohno").remove(), 500);
    }


    static showHelpDialog()
    {
        let $dialog = document.createElement("dialog");
        let $helpDiv = GameUI.cloneFromTemplate(document, "#helpTmpl");

        GameUI.replaceChildrenWithElement($dialog, $helpDiv);

        $dialog.addEventListener("close", evt => {
            $dialog.remove();
        });

        $dialog.addEventListener("click", evt => {
            $dialog.remove();
        });

        document.body.appendChild($dialog);

        $dialog.showModal();
    }
}
