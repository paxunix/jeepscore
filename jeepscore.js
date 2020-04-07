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
    }


    endGame()
    {
        let game = this.getCurrentGame();
        game.end();

        GameManager.saveGame(game);
    }


    static getLatestSavedGame()
    {
        let savedData = GameManager.getRawSavedGamesData();
        let gameDates = Object.keys(savedData);
        let newestDate = gameDates.sort().slice(-1)[0];

        if (newestDate)
        {
            return new Game(savedData[newestDate]);
        }

        return null;
    }


    static getRawSavedGamesData()
    {
        let jsonStr = localStorage.getItem(STORAGE_KEY_CURRENT) ?? "{}";
        let gameData = JSON.parse(jsonStr);

        return gameData;
    }


    static deleteSavedGame(gameId)
    {
        let data = GameManager.getRawSavedGamesData();

        delete data[gameId];

        GameManager.saveCurrentGameData(data);
    }


    static saveCurrentGameData(data)
    {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data ?? {}));
    }


    static saveGame(game)
    {
        let data = GameManager.getRawSavedGamesData();
        data[game.getId()] = game.getRawData();

        // Keep the latest 10 current games
        let dropDates = Object.keys(data).sort().slice(0, -10);
        for (let d of dropDates)
            delete data[d];

        GameManager.saveCurrentGameData(data);
    }


    static getSavedGameRawData(gameId)
    {
        let data = GameManager.getRawSavedGamesData();
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


const SCORE_ALGORITHM_MIN_MAX_SPLIT_SPREAD_ALL = 0;
const SCORE_ALGORITHM_PRICE_IS_RIGHT = 1;

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
            players: players,
            startTime: startTime,
            endTime: endTime,
            count: fromObj.count ?? 0,
            scoreAlgorithm: fromObj.scoreAlgorithm ?? SCORE_ALGORITHM_MIN_MAX_SPLIT_SPREAD_ALL,
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


    getScoreData()
    {
        switch (this.data.scoreAlgorithm)
        {
            case SCORE_ALGORITHM_MIN_MAX_SPLIT_SPREAD_ALL:
                return this.getScore_minMaxSplitSpreadAll();

            case SCORE_ALGORITHM_PRICE_IS_RIGHT:
                return this.getScore_priceIsRight();
        }

        throw new Error("Unknown scoring algorithm");
    }


    getScore_minMaxSplitSpreadAll()
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

            scoreData[p.getId()] = {
                min: playerMin,
                max: playerMax,
                isLow: isLow,
                isHigh: isHigh,
                isWin: !isLow && !isHigh,
            };
        }

        return scoreData;
    }


    getScore_priceIsRight()
    {
    }


    getRawData()
    {
        return Object.assign({}, this.data);
    }


    getId()
    {
        return this.getStartTime().toISOString();
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

        GameUI.setupNewGameUi();
        GameUI.setupCurrentGameUi();
        GameUI.setupPastGamesUi();
    }


    static click_addPlayer(evt)
    {
        let playerEntryDiv = GameUI
            .cloneFromTemplate(document, "#playerEntryTmpl");

        playerEntryDiv.querySelector(".playerDelete")
            .addEventListener("click", GameUI.click_deletePlayer);

        playerEntryDiv.querySelector(".bidButton")
            .addEventListener("click", GameUI.click_bid);

        document.querySelector("#playerEntryContainer")
            .appendChild(playerEntryDiv);

        // Defer setting focus to latest player name input until UI has
        // updated or it won't be set.
        window.setTimeout(() => {
            Array.from(document.querySelectorAll(".playerName"))
                .slice(-1)[0].focus();
        }, 0);
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

        GameUI.setUiState_allowStart();
    }


    static updateCounter(gameContainer, game)
    {
        let counter = gameContainer.querySelector(".counter");
        counter.textContent = game.getCount();

        let scoreData = game.getScoreData();
        GameUI.updateScore(gameContainer, game, scoreData);
    }


    static updateScore(gameContainer, game, scoreData)
    {
        for (let p of game.getPlayers())
        {
            let playerEl = gameContainer
                .querySelector(`.playerInGame[data\-playerid="${p.getId()}"]`);

            if (scoreData[p.getId()].isLow)
                playerEl.style = "background-color: yellow;";

            if (scoreData[p.getId()].isWin)
                playerEl.style = "background-color: limegreen;";

            if (scoreData[p.getId()].isHigh)
                playerEl.style = "background-color: salmon;";

            playerEl.querySelector(".playerLow").textContent = scoreData[p.getId()].min;
            playerEl.querySelector(".playerHigh").textContent = scoreData[p.getId()].max;
        }
    }


    static updateTimes(container, game)
    {
        let startTime = game.getStartTime();
        container.querySelector(".startTimeValue").textContent =
            GameUI.formatDateTime(startTime);

        let endTimeRow = container.querySelector(".endTime");
        let endTime = game.getEndTime();
        if (endTime)
        {
            container.querySelector(".endTimeValue").textContent =
                GameUI.formatDateTime(endTime);

            endTimeRow.hidden = false;
        }
        else
            endTimeRow.hidden = true;

        endTime = endTime ?? new Date();
        let elapsedPrettyTime = getPrettyElapsedTime(
            Math.ceil((endTime.getTime() - startTime.getTime()) / 1000));

        container.querySelector(".elapsedTimeValue")
            .textContent = elapsedPrettyTime;
    }


    static counter_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.incCount();
        GameUI.updateCounter(document, game);

        GameManager.saveGame(game);
    }


    static dec_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.decCount();
        GameUI.updateCounter(document, game);

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

        GameUI.setupPastGamesUi();
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
        }

        GameUI.setupCurrentGameUi();
        GameUI.setupPastGamesUi();
    }


    static click_deleteAll(evt)
    {
        if (window.confirm("Are you sure you want to delete all?") !== true)
            return;

        let rawGamesData = GameManager.getRawSavedGamesData();
        for (let gameId of Object.keys(rawGamesData))
        {
            GameManager.deleteSavedGame(gameId);
        }

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


    static renderGame(game, $target)
    {
        let gameContainer = GameUI
            .cloneFromTemplate(document, "#currentGameTmpl");

        GameUI.makeLegend("Game On!",
            gameContainer.querySelector("fieldset"));

        gameContainer.querySelector("#endGame")
            .addEventListener("click", GameUI.end_click);

        let playerContainer = gameContainer.querySelector(".playerContainer");

        for (let p of game.getPlayers())
        {
            let playerRow = GameUI
                .cloneFromTemplate(document, "#playerInGameRowTmpl");

            playerRow.querySelector(".playerName").textContent = p.getName();
            playerRow.querySelector(".playerBid").textContent = p.getBid();
            playerRow.querySelector(".playerInGame").dataset.playerid =
                p.getId();

            playerContainer.tBodies[0].appendChild(playerRow);
        }

        GameUI.allowCounterActions(!game.getEndTime(), gameContainer);
        GameUI.updateCounter(gameContainer, game);
        GameUI.updateTimes(gameContainer, game);

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

        let hasSavedGames = !!GameManager.getLatestSavedGame();
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
        let slot = document.querySelector("#currentGameSlot");

        let latestGame = GameManager.getLatestSavedGame();
        if (!latestGame)
        {
            GameUI.replaceChildrenWithElement(slot, null);
            return;
        }

        window.gameManager.setGame(latestGame);

        GameUI.renderGame(latestGame,
            document.querySelector("#currentGameSlot"));
    }


    static renderPastGames(templateDoc, destEl)
    {
        let pastGamesTmpl = GameUI.
            cloneFromTemplate(templateDoc, "#pastGamesContainerTmpl");

        GameUI.makeLegend("Saved Games",
            pastGamesTmpl.querySelector("fieldset"));

        let $list = pastGamesTmpl.querySelector(".pastGamesList");

        let rawGamesData = GameManager.getRawSavedGamesData();

        if (Object.keys(rawGamesData).length === 0)
        {
            $list.innerText = "No games saved";
        }
        else
        {
            let currentGame = window.gameManager.getCurrentGame();

            for (let k of Object.keys(rawGamesData).sort((a, b) => b.localeCompare(a)))
            {
                let game = new Game(rawGamesData[k]);
                let isGameOver = game.getEndTime() !== null;

                let pastGameTmpl = GameUI.
                    cloneFromTemplate(templateDoc, "#pastGameTmpl");
                let $input = pastGameTmpl.querySelector("input");
                let $label = pastGameTmpl.querySelector("label");
                let $text = pastGameTmpl.querySelector("span");

                let finishFlag = '&#x1F3C1;';
                $text.innerHTML = `${GameUI.formatDateTime(game.getStartTime())} ${isGameOver ? `${finishFlag}` : ""} ${game.getNumPlayers()}P ${game.getCount()}#`;

                $input.value = game.getId();

                if (currentGame && currentGame.getId() === game.getId())
                {
                    $label.classList.add("pastGameLabelCurrent");
                }

                $list.appendChild($label);
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
        $legend.textContent = text;
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
                dateStyle: "medium",
                timeStyle: "long",
            }).format(dateObj);
    }


    static flashError()
    {
        let $ohnoDiv = GameUI.cloneFromTemplate(document, "#ohNoTmpl");

        document.body.appendChild($ohnoDiv);

        window.setTimeout(() => document.querySelector("#ohno").remove(), 500);
    }
}
