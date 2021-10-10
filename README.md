Jeep Score
==========

My friends and I play a game:  how many Jeep Wranglers will we see today?

I got tired of keeping track of everyone's guesses and the count of how many
Wranglers we've seen.  So I made the computer do it for me.

You can view your [gameboard here](https://paxunix.github.io/jeepscore/jeepscore.html).


The Rules
=========

Whatever rules you want.  The way _we_ play is like this:

1. If you see a Jeep, call it out.  You're not trying to see more than the
   next person.  If anyone sees one, it counts +1 for everyone.

2. No double-counting.  If you see the same Jeep over and over again, it
   only counts once.  If more than one person sees the same Jeep, it only
   counts once.

3. No dealership Jeeps.  It has to be owned by a person, as best as you can
   tell.  It wouldn't be fair if you could count 50 more Jeeps because you
   happened to drive by a dealership.

4. Any other rules you want.  Only red Jeeps.  Only lifted Jeeps.  Only TJs.
   Only Jeeps when we're not in Moab during Easter Jeep Safari.  And so
   on...


How To Play
===========

Someone's in charge of the game--it doesn't matter who, they'll just need to
browse to the game link on their phone:

[Gameboard](https://paxunix.github.io/jeepscore/jeepscore.html)

Everyone agrees on the time-frame of the game:  the whole day, the next
hour, the entire vacation, whatever.  You can have multiple games going at
the same time if you want.

Everyone agrees who's playing.

The order of player entry doesn't matter.

Each person taps Add Player and enters their name and bid (how many Jeeps
they think the group will see).  Each person's bid is hidden until the last
person taps Start--otherwise you could change your bid based on what
others were bidding.

Once the game is started it's active until you tap End.  If you've ended a
game you cannot restart it.

The rows with each player name are highlighted:  yellow means the count has
not yet reached that player's minimum.  Green means the count is within that
player's bid range.  Red means the count has exceeded that player's maximum.
If you're in green when the game is ended, you win.

In the center is the current count.  Tapping the up arrow or the count will
+1 the value.  Tapping the down arrow will -1 the value (just in case you
have accidentally added more than one).

Over on the right of the count area is a menu that lets you select the
scoring algorithm.

Below the count area are some game-management options.  It's okay to start a
new game while a game is currently going on--you won't lose the existing
one.

The bottom-most section shows which games are saved on your phone.  There is
a maximum of 50, above which the oldest games will be deleted.

You can delete all games, check the boxes to delete specific games, or check
a single box to load that game (this makes it become the active game and the
Game count area will be updated).

By default, the game is named based on the date and time it was started.
The row prefixed with an arrow (➔) indicates the current (visible) game.
The pencil icon will let you rename the game.  Along with the game name, the
number of players in the game is shown, together with that game's current
count.

Clicking the End button will prompt you to end the current game.  Once
ended, that game count can no longer be updated and the background is
changed grey to distinguish finished games from ongoing games.  There is no
way to restart a game that has been ended.


Scoring Algorithms
==================

**Spread Split**

The difference between the highest and lowest bid (the spread) is divided
across each player (the split, rounded down) and their range is their bid
plus or minus the split.  For example, if player A bids 10, and player B
bids 20, and player C bids 22, the spread is 12 (highest bid 22 - lowest
bid 10) and the split is 4 (spread 12 / 3 players).  So:

Player A's range is 6 (bid 10 - split 4) to 14 (bid 10 + split 4)

Player B's range is 16 (bid 20 - split 4) to 24 (bid 20 + split 4)

Player C's range is 18 (bid 22 - split 4) to 26 (bid 22 + split 4)

If the count is within the player's range, that player is a winner.

**Price Is Right**

Like in the game show, the winner is the player whose bid is closest
to the count without going over.


A Few Other Details
============

You can download the page and save it to use locally if you want.

You can have more than one game in progress, but can only have one visible
at a time.

The game only runs on your device (phone, computer, etc.) and all the games
you play are saved there.

No identification.

No cloud.

No tracking.

No spying.

No ads.

No nagging.

No popups.

No micropayments.

There's a link at the bottom of the gameboard to Github, where this project
is based online.  You can tell me about problems there.  I make no promises
about fixing anything you don't like about it.
