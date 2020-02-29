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


    isGameInProgress()
    {
        return this.game !== null;
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

        document.querySelector("#addPlayer").addEventListener("click", GameUI.addPlayer_click);
        document.querySelector("#startGame").addEventListener("click", GameUI.start_click);
    }


    static addPlayer_click(evt)
    {
        let playerEntryDiv = jQuery(`
<div class="playerEntry">
  <input class="playerName" type="text" size="20" placeholder="Player name" minlength="1" required></input>
  <input class="playerBid" type="number" size="3" placeholder="Bid" minlength="1" inputmode="numeric" required></input>
</div>
`);
        let delPlayer = jQuery("<span>").addClass("playerDelete").html("&#x24cd;").click(GameUI.del_click);
        let bidButton = jQuery("<button>").addClass("bidButton").text("Bid!").click(GameUI.bid_click);

        playerEntryDiv.prepend(delPlayer);
        playerEntryDiv.append(bidButton);

        jQuery("#playerEntryContainer").append(playerEntryDiv);
    }


    static del_click(evt)
    {
        let entryEl = evt.target.closest(".playerEntry");
        entryEl.remove();
    }


    static bid_click(evt)
    {
        let entryEl = evt.target.closest(".playerEntry");

        // Disable player changes now that name and bid have been entered
        entryEl.querySelector(".playerName").disabled = true;
        entryEl.querySelector(".bidButton").disabled = true;

        let bidEl = entryEl.querySelector(".playerBid");
        bidEl.disabled = true;

        // Pad and hide the player's bid
        bidEl.type = "password";
        bidEl.value = bidEl.value.padEnd(10, " ");
    }


    static start_click(evt)
    {
        debugger;
        let players = [];
        for (let entry of document.querySelectorAll(".playerEntry"))
        {
            let name = entry.querySelector(".playerName").value.trim();
            let bid = parseInt(entry.querySelector(".playerBid").value.trim(), 10);

            players.push(new Player(name, bid));
        }

        window.gameManager.startGame(players);
    }
}
