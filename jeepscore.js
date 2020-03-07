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

        this._init();
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

        return this;
    }


    getName()
    {
        return this.name;
    }


    getBid()
    {
        return this.bid;
    }
}


class Game
{
    constructor(players)
    {
        this.players = players;
        this.startTime = null;
        this.endTime = null;
        this.count = 0;

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
    }


    getCount()
    {
        return this.count;
    }


    getPlayers()
    {
        return this.players;
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


    static start_click(evt)
    {
        debugger;
        let players = GameUI.getEnteredPlayers();

        for (let entryEl of document.querySelectorAll(".playerEntry"))
        {
            entryEl.remove();
        }

        window.gameManager.startGame(players);

        let currentGame = window.gameManager.getCurrentGame();
        document.querySelector("#counter").textContent = currentGame.getCount();

        GameUI.setUiState_startGame();
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
        GameUI.setUiState_allowReset();
        document.querySelector("#playerEntryPanel").hidden = false;
        document.querySelector("#gamePanel").hidden = true;
    }


    static setUiState_startGame()
    {
        GameUI.setUiState_allowAddPlayer();
        GameUI.setUiState_allowStart();
        GameUI.setUiState_allowReset();
        document.querySelector("#playerEntryPanel").hidden = true;
        document.querySelector("#gamePanel").hidden = false;
    }
}
