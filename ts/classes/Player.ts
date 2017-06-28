namespace bh {

	function formatRow(imageGroup: string, imageName: string, name: string, badgeValue: number | string) {
		if (typeof(badgeValue) == "number") { badgeValue = utils.formatNumber(badgeValue); }
		return `<div data-hud="true">${getImg20(imageGroup, imageName)} ${name}<span class="badge pull-right">${badgeValue}</span></div>`;
	}

	export class Player {
		private _pp: IPlayer.Player;
		private _gp: IGuild.Player;

		private get archetypes(): IPlayer.Hero[] {
			if (this._pp) return this._pp.archetypes || [];
			return Object.keys(this._gp.archetypeLevels).map(guid => {
				return <any>{ playerId:this.guid, id:guid, level:this._gp.archetypeLevels[guid] };
			});
		}

		public constructor(json: IPlayer.Player | IGuild.Player, public isArena = false) {
			if (data.isPlayer(json)) { this._pp = <IPlayer.Player>json; }
			if (data.isGuildPlayer(json)) { this._gp = <IGuild.Player>json; }
		}

		public get fameLevel() { return (this._pp && this._pp.fameLevel || this._gp.fameLevel) + 1; }
		public get fragments() { return this._pp && this._pp.fragments || 0; }
		public get fragmentsRowHtml() { return this._pp ? formatRow("misc", "Fragments", "Fragments", this.fragments) : ""; }
		public get gems() { return this._pp && this._pp.gems || 0; }
		public get gemsRowHtml() { return this._pp ? formatRow("misc", "GemStone", "Gems", this.gems) : ""; }
		public get gold() { return this._pp && this._pp.gold || 0; }
		public get goldNeeded() {
			var needed = 0;
			this.activeBattleCards.forEach(battleCard => {
				if (!battleCard.maxMaxGoldNeeded) {
					if (0 < needed) needed *= -1;
				}else {
					var neg = needed < 0;
					needed = Math.abs(needed) + battleCard.maxMaxGoldNeeded;
					if (neg) needed *= -1;
				}
			});
			this.heroes.forEach(playerHero => {
				if (playerHero) {
					var neg = needed < 0;
					needed = Math.abs(needed) + playerHero.trait.maxGoldCost + playerHero.active.maxGoldCost + playerHero.passive.maxGoldCost;
					if (neg) needed *= -1;
				}
			});
			return needed;
		}
		public get goldRowHtml() {
			var needed = this.goldNeeded,
				// asterisk = needed < 0 ? "<sup>*</sup>" : "", // AT SOME POINT REMOVE THIS WHEN ALL MATH IS ACCOUNTED FOR
				asterisk = "<sup>*</sup>",
				badge = needed ? `${utils.formatNumber(this.gold)} / ${utils.formatNumber(Math.abs(needed))}${asterisk}` : utils.formatNumber(this.gold);
			return this._pp ? formatRow("misc", "Coin", "Gold", badge) : "";
		}
		public get guid() { return this._pp && this._pp.id || this._gp.playerId; }
		public get guild() { return data.guilds.findByGuid(this.guildGuid); }
		public get guildGuid() { return this._pp ? this._pp.playerGuild || null : this._gp && this._gp.guildId || null; }
		public get guildName() { return data.guilds.findNameByGuid(this.guildGuid); }
		public get guildParent() { var guildName = this.guildName; return guildName && guildName.parent || null; }
		public get guilds() { return data.guilds.filterNamesByParent(this.guildParent); }
		public get heroCount() { return this.archetypes.length; }
		public get heroes() { return this.archetypes.map(archetype => new PlayerHero(this, archetype)); }
		public get isAlly() { var me = Player.me; return !!me.guilds.find(g => g.guid == this.guildGuid); }
		public get canScout() { return !!this.guildParent || this.guid == "b0a8b57b-54f5-47d8-8b7a-f9dac8300ca0"; }
		public get isExtended() { return !!this._pp; }
		public get isFullMeat() { return this.heroCount == data.HeroRepo.length && !this.heroes.find(hero => !hero.isMeat); }
		public get isMe() { return [Messenger.ActivePlayerGuid, "b0a8b57b-54f5-47d8-8b7a-f9dac8300ca0"].includes(this.guid); }
		public get name() { return this._pp ? this._pp.name : this._gp && this._gp.name || null; }
		public get position() { return this._gp && this._gp.position || null; }
		public get averagePowerPercent() { var percents = this.heroes.map(ph => ph.powerPercent); return Math.floor(percents.reduce((out, p) => out + p, 0) / percents.length); }
		public get powerPercent() { var percentSum = this.heroes.map(ph => ph.powerPercent).reduce((score, pp) => score + pp, 0), max = data.HeroRepo.length * 100; return Math.floor(100 * percentSum / max); }
		public get powerRating() { return this.heroes.reduce((power, hero) => power + hero.powerRating, 0); }
		public get raidRowHtml() { return this._pp ? formatRow("keys", "RaidTicket", "Raid Tickets", this.raidTickets) : ""; }
		public get raidTickets() { return this._pp && this._pp.raidKeys || 0; }
		public get battleCards() { return !(this._pp && this._pp.playerCards && this._pp.playerCards.cards) ? [] : this.sortAndReduceBattleCards(Object.keys(this._pp.playerCards.cards)); }
		public get activeBattleCards() { return this.battleCards.filter(battleCard => battleCard.isActive); }
		public get boosterCards() { var map = this._pp && this._pp.feederCardsMap; return !map ? [] : Object.keys(map).map(guid => new PlayerBoosterCard(guid, map[guid])).sort(utils.sort.byElementThenRarityThenName); }
		public get boosterCount() { var count = 0, map = this._pp && this._pp.feederCardsMap; Object.keys(map || {}).map(guid => count += map[guid]); return count; }
		public get boosterRowHtml() { return this._pp ? PlayerBoosterCard.rowHtml(this.boosterCount) : ""; }
		public get inventory() { var mats = this._pp && this._pp.craftingMaterials, playerHeroes = this.heroes; return !mats ? [] : Object.keys(mats).map(guid => new PlayerInventoryItem(this, data.ItemRepo.find(guid), mats[guid])).sort(utils.sort.byRarityThenName); }
		public get wildCards() { return !this._pp ? [] : Object.keys(this._pp.wildcards).map(guid => new PlayerWildCard(this, guid)).sort(utils.sort.byRarity); }
		public get wildCardRowHtml() { return this._pp ? formatRow("cardtypes", "WildCard", "Wild Cards", this.wildCards.map(wc => wc.rarity[0] + ":" + wc.count).join(" / ")) : ""; }

		private battleCardToPlayerBattleInfo(guid: string) {
			var playerCard = this._pp.playerCards.cards[guid];
			return new PlayerBattleCard(playerCard);
		}
		public filterActiveBattleCards(...args: string[]) {
			var element: string, rarity: string, name: string, hero: Hero;
			args.forEach(arg => isElement(arg) ? element = arg : isRarity(arg) ? rarity = arg : name = arg);
			if (name) hero = data.HeroRepo.find(name);
			return this.activeBattleCards.filter(battleCard => (!element || battleCard.matchesElement(element)) && (!rarity || battleCard.rarity == rarity) && (!hero || (battleCard.elementType === hero.elementType && battleCard.klass == hero.klass)));
		}
		public filterHeroes(elementOrName: string) {
			var element = isElement(elementOrName) ? elementOrName : null;
			var name = !element ? elementOrName : null;
			return this.heroes.filter(playerHero => playerHero && ((element && ElementType[playerHero.elementType] == element) || (name && playerHero.name == name)));
		}

		public findPlayerCard(guid: string) {
			var cards = this._pp && this._pp.playerCards.cards,
				card = cards && cards[guid];
			if (!card && cards) {
				var guids = Object.keys(cards),
					match = guids.find(g => g == guid || cards[g].configId == guid);
				card = cards[match];
			}
			return card;
		}

		public merge(player: IPlayer.Player) {
			var mine = this._pp && this._pp.archetypes || [],
				theirs = player.archetypes || [];
			theirs.forEach(theirArch => {
				if (!mine.find(myArch => myArch.id == theirArch.id)) {
					mine.push(theirArch);
				}
			});
		}

		public sortAndReduceBattleCards(guids: string[]) {
			var cards = guids.map(guid => this.battleCardToPlayerBattleInfo(guid)),
				sorted = cards.sort(utils.sort.byRarityThenNameThenEvoLevel),
				reduced: PlayerBattleCard[] = [];
			sorted.forEach(card => {
				var existing = reduced.find(c => c.matches(card));
				if (existing) { existing.count++; } else { reduced.push(card); }
			});
			return reduced;
		}

		public static get me() { return data.PlayerRepo.find(Messenger.ActivePlayerGuid); }
	}
}