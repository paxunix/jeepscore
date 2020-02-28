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


    prepGame()
    {
        if (this.isGameInProgress())
            throw new Error("Game already in progress");

        this.game = new Game();
    }


    addPlayer(name)
    {
        this.game.addPlayer(name);
    }


    removePlayer(name)
    {
        this.game.removePlayer(name);
    }


    resetGame()
    {
        this.game = null;
    }


    startGame()
    {
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
    constructor()
    {
        this.players = [];
        this.startTime = null;
        this.endTime = null;
        this.count = 0;

        return this;
    }


    addPlayer(name)
    {
        if (this.startTime === null)
            throw new Error("Can't add a player to a running game");

        this.players.push(new Player(name));
    }


    removePlayer(name)
    {
        this.players = this.players.filter(el => el.name() !== name);
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


}
