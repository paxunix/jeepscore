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
        this.game = null;
    }


    getCurrentGame()
    {
        return this.game;
    }


    resetGame()
    {
        GameManager.deleteSavedGame(this.getCurrentGame().getStartTime().toISOString());

        this._init();
    }


    setGame(game)
    {
        this.game = game;
    }


    startGame(players)
    {
        this.setGame(new Game({players}));
        this.game.startGame();

        GameManager.saveGame(this.game);
    }


    endGame()
    {
        this.getCurrentGame().endGame();

        GameManager.saveGame(this.game);

        this._init();
    }


    static getLatestSavedGame()
    {
        let savedData = GameManager.loadCurrentGames();
        let gameDates = Object.keys(savedData);
        let newestDate = gameDates.sort().slice(-1)[0];

        if (newestDate)
        {
            return new Game(savedData[newestDate]);
        }


        return null;
    }


    static loadCurrentGames()
    {
        let jsonStr = localStorage.getItem(STORAGE_KEY_CURRENT) ?? "{}";
        let gameData = JSON.parse(jsonStr);

        return gameData;
    }


    static deleteSavedGame(time)
    {
        let data = GameManager.loadCurrentGames();

        delete data[time];

        GameManager.saveCurrentGameData(data);
    }


    static saveCurrentGameData(data)
    {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(data ?? {}));
    }


    static saveGame(game)
    {
        let data = GameManager.loadCurrentGames();
        data[game.getStartTime().toISOString()] = game.getRawData();

        // Keep the latest 10 current games
        let dropDates = Object.keys(data).sort().slice(0, -10);
        for (let d of dropDates)
            delete data[d];

        GameManager.saveCurrentGameData(data);
    }


    getHistoricalGames()
    {
    }


    exportHistoricalData()
    {
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


    startGame()
    {
        if (this.getStartTime() !== null)
            throw new Error("Can't start a game that is already running");

        if (this.getEndTime() !== null)
            throw new Error("Can't start a game that has ended");

        this.data.startTime = new Date();
    }


    endGame()
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

        document.querySelector("#addPlayer").addEventListener("click", GameUI.click_addPlayer);
        document.querySelector("#startGame").addEventListener("click", GameUI.start_click);
        document.querySelector("#endGame").addEventListener("click", GameUI.end_click);
        document.querySelector("#resetGame").addEventListener("click", GameUI.reset_click);

        let latestGame = GameManager.getLatestSavedGame();
        if (!latestGame)
            GameUI.setUiState_noGame();
        else
        {
            window.gameManager.setGame(latestGame);
            GameUI.renderGame(latestGame);
            GameUI.setUiState_startGame();
        }
    }


    static click_addPlayer(evt)
    {
        let playerEntryDiv = document.querySelector("#playerEntryTmpl")
            .content.cloneNode(true);

        playerEntryDiv.querySelector(".playerDelete")
            .addEventListener("click", GameUI.click_deletePlayer);

        playerEntryDiv.querySelector(".bidButton")
            .addEventListener("click", GameUI.click_bid);

        playerEntryDiv.querySelector(".playerEntryError")
            .style = "visibility: hidden;";

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
            entryEl.querySelector(".playerEntryError").style = "visibility: visible;";
            return false;
        }

        entryEl.querySelector(".playerEntryError").style = "visibility: hidden;";

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
            startTime.toLocaleString();

        let endTimeRow = container.querySelector(".endTime");
        let endTime = game.getEndTime();
        if (endTime)
        {
            container.querySelector(".endTimeValue").textContent =
                endTime.toLocaleString();

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

        for (let entryEl of document.querySelectorAll(".playerEntry"))
        {
            entryEl.remove();
        }

        window.gameManager.startGame(players);

        let currentGame = window.gameManager.getCurrentGame();

        GameUI.renderGame(currentGame);

        GameUI.setUiState_startGame();
    }


    static end_click(evt)
    {
        if (window.confirm("Are you sure you want to end this game?") !== true)
            return;

        let currentGame = window.gameManager.getCurrentGame();

        window.gameManager.endGame();

        GameUI.updateTimes(document.querySelector(".timeTable"), currentGame);

        GameUI.allowCounterActions(false,
            document.querySelector("#gameContainer"));
        GameUI.setUiState_allowEnd();

        // Don't reset UI here--let user click reset button so the UI state
        // is preserved as of end of game.
    }


    static reset_click(evt)
    {
        if (window.confirm("Are you sure you want to reset the game?") !== true)
            return;

        window.gameManager.resetGame();

        let curGameContainer = document.querySelector("#gameContainer");
        curGameContainer.innerHTML = "";

        GameUI.setUiState_noGame();
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


    static renderGame(game)
    {
        let gameContainer = document.querySelector("#gameContainerTmpl")
            .content.cloneNode(true);
        let playerContainer = gameContainer.querySelector(".playerContainer");

        for (let p of game.getPlayers())
        {
            let playerRow = document.querySelector("#playerInGameRowTmpl")
                .content.cloneNode(true);

            playerRow.querySelector(".playerName").textContent = p.getName();
            playerRow.querySelector(".playerBid").textContent = p.getBid();
            playerRow.querySelector(".playerInGame").dataset.playerid =
                p.getId();

            playerContainer.tBodies[0].appendChild(playerRow);
        }

        GameUI.allowCounterActions(!game.getEndTime(), gameContainer);
        GameUI.updateCounter(gameContainer, game);

        GameUI.updateTimes(gameContainer, game);

        let curGameContainer = document.querySelector("#gameContainer");
        curGameContainer.innerHTML = "";
        curGameContainer.appendChild(gameContainer);
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


    static setUiState_allowAddPlayer()
    {
        let allowAddPlayer = false;

        if (window.gameManager.getCurrentGame() === null)
        {
            allowAddPlayer = true;
        }

        document.querySelector("#addPlayer").disabled = !allowAddPlayer;
    }


    static setUiState_allowStart()
    {
        let allowStart = false;

        let currentGame = window.gameManager.getCurrentGame();
        if (currentGame)
        {
            allowStart = false;
        }
        else
        {
            if (GameUI.getEnteredPlayers().length > 0)
                allowStart = true;
            else
                allowStart = false;
        }

        document.querySelector("#startGame").disabled = !allowStart;
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

        document.querySelector("#endGame").disabled = !allowEnd;
    }


    static setUiState_allowReset()
    {
        let allowReset = false;

        let currentGame = window.gameManager.getCurrentGame();
        if (currentGame)
        {
            allowReset = true;
        }

        document.querySelector("#resetGame").disabled = !allowReset;
    }


    static setUiState_noGame()
    {
        GameUI.setUiState_allowAddPlayer();
        GameUI.setUiState_allowStart();
        GameUI.setUiState_allowEnd();
        GameUI.setUiState_allowReset();
        document.querySelector("#playerEntryPanel").hidden = false;
        document.querySelector("#gamePanel").hidden = true;
    }


    static setUiState_startGame()
    {
        GameUI.setUiState_allowAddPlayer();
        GameUI.setUiState_allowStart();
        GameUI.setUiState_allowEnd();
        GameUI.setUiState_allowReset();
        document.querySelector("#playerEntryPanel").hidden = true;
        document.querySelector("#gamePanel").hidden = false;

        GameUI.allowBodyClick(true);
    }
}
