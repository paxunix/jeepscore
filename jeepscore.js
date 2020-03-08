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
        this.gameList = [];
    }


    getCurrentGame()
    {
        return this.game;
    }


    resetGame()
    {
        this.game = null;
    }


    startGame(players)
    {
        this.game = new Game(players);
        this.game.startGame();
    }


    endGame()
    {
        this.game.endGame();
        this.gameList.push(this.game);

        this.resetGame();
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
    constructor(name, bid)
    {
        this.name = name;
        this.bid = bid;
        this.id = Math.round(Math.random() * 10000000) + "";

        return this;
    }


    getName()
    {
        return this.name;
    }


    getId()
    {
        return this.id;
    }


    getBid()
    {
        return this.bid;
    }
}


const SCORE_ALGORITHM_MIN_MAX_SPLIT_SPREAD_ALL = 0;
const SCORE_ALGORITHM_PRICE_IS_RIGHT = 1;

class Game
{
    constructor(players)
    {
        this.players = players;
        this.startTime = null;
        this.endTime = null;
        this.count = 0;
        this.scoreAlgorithm = SCORE_ALGORITHM_MIN_MAX_SPLIT_SPREAD_ALL;

        return this;
    }


    startGame()
    {
        if (this.startTime !== null)
            throw new Error("Can't start a game that is already running");

        if (this.endTime !== null)
            throw new Error("Can't start a game that has ended");

        this.startTime = new Date();
    }


    endGame()
    {
        if (this.startTime === null)
            throw new Error("Can't end a game that hasn't started");

        if (this.endTime !== null)
            throw new Error("Can't end a game that has already ended");

        this.endTime = new Date();
    }


    incCount()
    {
        if (this.startTime === null)
            throw new Error("Can't increment count if game hasn't started");

        ++this.count;
    }


    decCount()
    {
        if (this.startTime === null)
            throw new Error("Can't decrement count if game hasn't started");

        --this.count;

        this.count = Math.max(0, this.count);
    }


    getCount()
    {
        return this.count;
    }


    getPlayers()
    {
        return this.players;
    }


    getPlayerById(id)
    {
        return this.getPlayers().filter(p => p.getId() === id)[0] ?? null;
    }


    getNumPlayers()
    {
        return this.players.length;
    }


    getStartTime()
    {
        return this.startTime;
    }


    getEndTime()
    {
        return this.endTime;
    }


    getScoreData()
    {
        switch (this.scoreAlgorithm)
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

            scoreData[p.getName()] = {
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


    toJson()
    {
        return JSON.stringify({
            players: this.players,
            startTime: this.startTime,
            endTime: this.endTime,
            count: this.count,
        });
    }

    fromJson(str)
    {
        let o = JSON.parse(str);
        this.players = o.players;
        this.startTime = o.startTime;
        this.endTime = o.endTime;
        this.count = o.count;
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

    return out.join(" ");
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

        let currentGame = window.gameManager.getCurrentGame();
        if (!currentGame)
            GameUI.setUiState_noGame();
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
            bidEl.value.trim() === "")
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


    static updateCounter(doc, game)
    {
        let counter = doc.querySelector(".counter");
        counter.textContent = game.getCount();

        let scoreData = game.getScoreData();
    }


    static renderScore(game, scoreData)
    {
    }


    static counter_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.incCount();
        GameUI.updateCounter(document, game);
    }


    static dec_click(evt)
    {
        let game = window.gameManager.getCurrentGame();
        game.decCount();
        GameUI.updateCounter(document, game);
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
        window.gameManager.endGame();
        GameUI.allowCounterActions(false,
            document.querySelector("#gameContainer"));
        GameUI.setUiState_allowEnd();
        // Don't reset UI here--let user click reset button so the UI state
        // is preserved as of end of game.
    }


    static reset_click(evt)
    {
        window.gameManager.resetGame();

        GameUI.setUiState_noGame();
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
            let playerDiv = document.querySelector("#playerInGameTmpl")
                .content.cloneNode(true);

            playerDiv.querySelector(".playerName").value = p.getName();
            playerDiv.querySelector(".playerBid").value = p.getBid();
            playerDiv.querySelector(".playerInGame").dataset.playerid =
                p.getId();

            playerContainer.appendChild(playerDiv);
        }

        GameUI.allowCounterActions(true, gameContainer);
        GameUI.updateCounter(gameContainer, game);

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

            if (name !== "" && bid > 0)
                players.push(new Player(name, bid));
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
        if (currentGame)
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
    }
}
