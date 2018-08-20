module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//用户搜索游戏首页
	index() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5004");
			this._findGame(data);
		} ) ) end("Param Error!");
	}
	//用户搜索游戏
	searchgame() {
		if ( !post(data => {
			this._likeSearchGame(data);
		} ) ) end("Param Error!");
	}
	//用户礼包搜索
	searchgift() {
		if ( !post(data => {
			this._likeSearchGift(data);
		} ) ) end("Param Error!");
	}
	//用户搜索礼包后点击更多礼包
	searchmoregift() {
		if ( !post(data => {
			if ( !data.gameid ) return api_error("5001"); 
			this._likeSearchMoreGift(data);
		} ) ) end("Param Error!");
	}
	//进入游戏搜索页
	_findGame(data) {
		let res = {
			historygame : [],
			dayrecommend : []
		};
		let redis = LOAD.redis();
		redis.get("dayrecommend", dayrecommend => {//近日热门详情
			if ( dayrecommend ) res.dayrecommend = dayrecommend;
			redis.hget("userhistorygame", data.openId, userhistorygame => {//用户近期玩过
				if ( userhistorygame ) res.historygame = userhistorygame;
				return api_success(res); 
			} );
		} );
	}
	//用户游戏模糊查询
	_likeSearchGame(data) {
		let mysql = LOAD.mysql();
		mysql.get("gameinfo", {
			state : 1,
			"gameName LIKE" : data.gameName
		}, "sort DESC", "", "id,gameName,gameid gamekey,ioc,descriptor", gameinfo => {
			mysql.close();
			return api_success(gameinfo);
		} );
	}
	//用户礼包模糊查询
	_likeSearchGift(data) {
		let mysql = LOAD.mysql();
		let redis = LOAD.redis();
		mysql.get("gameinfo", {
			state : 1,
			gift : 1,
			"gameName LIKE" : data.gameName
		}, "sort DESC", "", "id,gameName,gameid gamekey,ioc,descriptor", gameinfo => {
			mysql.close();
			gameinfo.recursion((i,item,next) => {
				redis.get("gameinformationgift" + item.id, gameinformationgift => {
					gameinfo[i].num = gameinformationgift == null ? 0 : gameinformationgift.length - 1;
					if ( gameinformationgift != null && gameinformationgift.length - 1 >= 0 ) gameinfo[i].gift = gameinformationgift[0];
					else gameinfo[i].gift = [];
					next();
				} );
			}, over => api_success(gameinfo) );
		} );
	}
	//用户搜索礼包后点击更多礼包
	_likeSearchMoreGift(data) {
		let redis = LOAD.redis();
		redis.get("gameinformationgift" + data.gameid, moregift => {
			if ( !moregift ) return api_error("5003");
			return api_success(moregift);
		} );
	}
}();