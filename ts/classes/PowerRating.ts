namespace bh {
	// Power Rating
	var CardMultiplier = 2.5;
	var AbilityBlock = 5000, CardBlock = 5000;
	var RarityEvolutions: { [rarity: string]: number; } = { Common: 1, Uncommon: 2, Rare: 3, SuperRare: 4, Legendary: 5 };
	var RarityLevels: { [rarity: string]: number; } = { Common: 10, Uncommon: 20, Rare: 35, SuperRare: 50, Legendary: 50 };
	var RarityMultipliers: { [rarity: string]: number; } = { Common: 10, Uncommon: 20, Rare: 35, SuperRare: 50, Legendary: 60 };

	var a1 = AbilityBlock * 0.40, a2 = AbilityBlock * 0.25, a3 = AbilityBlock * 0.20, a4 = AbilityBlock * 0.15;
	var b1 = a1 + a4 * 0.40, b2 = a2 + a4 * 0.25, b3 = a3 + a4 * 0.20, b4 = a4 * 0.15;
	var c1 = a1 + a4 * 0.45, c2 = a2 + a4 * 0.30, c3 = a3 + a4 * 0.25, c4 = 0;

	function calculateHeroAbilityScore(hero: Hero, ability: GamePowerRatingAbilityType): number {
		switch (hero.name) {
			case "Bree": return ability == "HP" ? b2 : ability == "Trait" ? b1 : ability == "Active" ? b4 : b3;
			case "Brom": return ability == "HP" ? b2 : ability == "Trait" ? b1 : ability == "Active" ? b4 : b3;
			case "Fergus": return ability == "HP" ? a2 : ability == "Trait" ? a3 : ability == "Active" ? a4 : a1;
			case "Gilda": return ability == "HP" ? a4 : ability == "Trait" ? a2 : ability == "Active" ? a1 : a3;
			case "Hawkeye": return ability == "HP" ? a4 : ability == "Trait" ? a1 : ability == "Active" ? a3 : a2;
			case "Jinx": return ability == "HP" ? c3 : ability == "Trait" ? c1 : ability == "Active" ? c2 : c4;
			case "Krell": return ability == "HP" ? a3 : ability == "Trait" ? a1 : ability == "Active" ? a2 : a4;
			case "Logan": return ability == "HP" ? b3 : ability == "Trait" ? b2 : ability == "Active" ? b4 : b1;
			case "Monty": return ability == "HP" ? a4 : ability == "Trait" ? a1 : ability == "Active" ? a2 : a3;
			case "Peg": return ability == "HP" ? a4 : ability == "Trait" ? a1 : ability == "Active" ? a2 : a3;
			case "Red": return ability == "HP" ? a4 : ability == "Trait" ? a1 : ability == "Active" ? a3 : a2;
			case "Thrudd": return ability == "HP" ? b2 : ability == "Trait" ? b1 : ability == "Active" ? b4 : b3;
			case "Trix": return ability == "HP" ? a4 : ability == "Trait" ? a3 : ability == "Active" ? a1 : a2;
			default: return 0;
		}
	}
	// function calculateCardScore(rarityType: RarityType, evoLevel: number, level: number, multiplier: number): number {
	// 	return CardMultiplier * (evoLevel * RarityMultipliers[RarityType[rarityType]] + level) * multiplier;
	// }

	export enum MinMaxType { Min, Max }
	export class PowerRating {
		public static rateHeroHP(hero: PlayerHero): number {
			var maxHP = <number>bh.data.HeroRepo.all.map(h=>[bh.Hero.getHitPoints(h,90),h]).sort().pop()[0],
				heroMultiplier = bh.Hero.getHitPoints(hero.hero, 90) / maxHP,
				levelMultiplier = hero.level / 90;
			return Math.round(1000 * heroMultiplier * levelMultiplier) / 100;
		}
		public static rateMaxedHero(hero: Hero) {
			var hp = calculateHeroAbilityScore(hero, "HP"),
				trait = calculateHeroAbilityScore(hero, "Trait"),
				active = calculateHeroAbilityScore(hero, "Active"),
				passive = calculateHeroAbilityScore(hero, "Passive"),
				deck = PowerRating.rateMaxedDeck(hero);
			return hp + trait + active + passive + deck;
		}
		public static rateMaxedDeck(hero: Hero) {
			var heroCards = Hero.filterCardsByHero(hero, data.BattleCardRepo.all),
				ratedCards = heroCards.map(card => { return { card:card, score:PowerRating.rateBattleCard(card, MinMaxType.Max) }; }),
				sortedCards = ratedCards.sort((a, b) => a.score == b.score ? 0 : a.score < b.score ? 1 : -1),
				topCards = sortedCards.slice(0, 4);
			return topCards.reduce((score, card) => score + card.score * 2, 0);
		}
		public static rateDeck(deck: PlayerBattleCard[]) {
			var rated = deck.reduce((out, card) => { out[card.playerCard.configId] = PowerRating.ratePlayerCard(card.playerCard); return out; }, <{[key:string]:number;}>{ }),
				cycleCards = deck.filter(card => BattleCardRepo.isCycleCard(card, card.evo)),
				cycleCount = cycleCards.length,
				cards = deck.filter(card => !cycleCards.includes(card))
			return deck.reduce((score, pbc) => score + PowerRating.ratePlayerCard(pbc.playerCard) * pbc.count, 0);
		}
		public static rateBattleCard(battleCard: IDataBattleCard, minMax: MinMaxType) {
			var key = RarityType[battleCard.rarityType],
				evo = minMax == MinMaxType.Max ? RarityEvolutions[key] : 0,
				level = minMax == MinMaxType.Max ? RarityLevels[key] : 0;
			return PowerRating.ratePlayerCard(<any>{ configId:battleCard.guid, evolutionLevel:evo, level:level-1 });
		}
		public static rateAndSort(cards: IDataBattleCard[], minMax = MinMaxType.Max): {card:IDataBattleCard,powerRating:number}[] {
			var rated = cards.map(card => { return { card:card, powerRating:PowerRating.rateBattleCard(card, minMax) }; });
			rated.sort((a, b) => { return b.powerRating - a.powerRating; });
			return rated;
		}
		public static ratePlayerCard(playerCard: IPlayer.PlayerCard) {
			return ratePlayerCard(playerCard);
			// var card = data.BattleCardRepo.find(playerCard.configId),
			// 	multiplier = PowerRating.tierToMultiplier(card && card.tier || ""),
			// 	score = calculateCardScore(card && card.rarityType || RarityType.Common, playerCard.evolutionLevel, playerCard.level + 1, multiplier);
			// return score;
		}
		public static ratePlayerHeroAbility(playerHeroAbility: PlayerHeroAbility) {return 0;
			// return calculateHeroAbilityScore(playerHeroAbility.hero, <any>AbilityType[playerHeroAbility.type]);
		}
		public static ratePlayerHeroHitPoints(playerHero: PlayerHero) {return 0;
			// return calculateHeroAbilityScore(playerHero.hero, "HP") * playerHero.level / HeroRepo.MaxLevel;
		}
		public static tierToMultiplier(tier: string) {return 0;
			// return tier == "OP" ? 1.2 : tier == "S" ? 1 : tier == "A" ? 0.8 : tier == "B" ? 0.6 : tier == "C" ? 0.4 : tier == "D" ? 0.2 : 0.5;
		}
	}

	function ratePlayerCard(playerCard: IPlayer.PlayerCard): number {
		var card = data.BattleCardRepo.find(playerCard.configId),
			evoLevel = playerCard.evolutionLevel,
			level = playerCard.level,
			perkMultiplier = bh.BattleCardRepo.getPerk(card, evoLevel) / 100,
			targets = card.typesTargets.map(typeTarget => bh.PlayerBattleCard.parseTarget(typeTarget)),
			gameEffects = GameEffect.parseAll(playerCard),
			rating = 0;
		targets.forEach((target, typeIndex) => {
			var turns = card.turns,
				regen = card.effects.concat(card.perks).find(s => s.startsWith("Regen")),
				regenEffect = regen ? bh.GameEffect.parse(regen) : null,
				regenDivisor = regen && regenEffect.turns || 1,
				shieldDivisor = target.type == "Shield" ? 2 : 1,
				healDivisor = target.type == "Heal" ? 3 * regenDivisor : 1,
				value = calcValue(card, typeIndex, evoLevel, level) / shieldDivisor / healDivisor / 888;
			rating += value / turns - turns;
		});
		gameEffects.forEach(gameEffect => rating += gameEffect.powerRating);
		return Math.round(100 * rating) / 100;
	}
	function calcValue(card: IDataBattleCard, typeIndex: number, evo: number, level: number) {
		var baseValue = bh.BattleCardRepo.calculateValue(<any>{configId:card.guid,evolutionLevel:evo,level:level}),
			perkMultiplier = bh.BattleCardRepo.getPerk(card, evo) / 100,
			critMultiplier = card.perks.includes("Critical") ? 1.5 * perkMultiplier : 1,
			target = bh.PlayerBattleCard.parseTarget(card.typesTargets[typeIndex]),
			value = Math.round(baseValue * critMultiplier * target.targetMultiplier);
		if (target.flurry) {
			value = value / target.flurryCount * target.flurryHitMultiplier * target.flurryCount;
		}
		if (!value) console.log(card.name, target);
		return value;
	}
}