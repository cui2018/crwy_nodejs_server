module.exports = new class extends Controller {
	constructor() {
		super();
	}
	index() {
		if ( !post(data => {
			if ( !data.openId || !data.gameid ) return api_error("5001");
			this._getGameSide(data);
		} ) ) end("Param Error!");
	}
	//用户点击游戏
	gamelist() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._findGameList(data);
		} ) ) end("Param Error!");
	}
	//用户点击游戏礼包
	gamegiftlist() {
		if ( !post(data => {
			if ( !data.openId || !data.gameid ) return api_error("5001");
			this._findGameGiftList(data);
		} ) ) end("Param Error!");
	}
	//用户进入游戏后侧边栏
	_getGameSide(data) {
		let res = {
			headImgUrl : "",
			nickName : "",
			dayrecommend : [],
			identity : 0
		};
		let redis = LOAD.redis();
		redis.hget("user", data.openId, user => {
			if ( !user ) return api_error("5004");
			redis.get("dayrecommend", dayrecommend => {
				redis.hget("identity", data.openId, residentity => {
					res.ID = user.id;
					res.headImgUrl = user.headImgUrl;
					res.nickName = user.nickName;
					if ( dayrecommend ) res.dayrecommend = dayrecommend;
					if ( residentity ) res.identity = 1;
					return api_success(res);
				} );
			} );
		} );
	}
	//用户点击游戏列表
	_findGameList(data) {
		let redis = LOAD.redis();
		redis.get("dayrecommend", dayrecommend => {
			let res = dayrecommend || [];
			return api_success(res);
		} );
	}
	//用户点击游戏礼包
	_findGameGiftList(data) {
		let res = [];
		let redis = LOAD.redis();
		redis.get("gameinformationgift" + data.gameid, gameinformationgift => {
			if ( gameinformationgift ) gameinformationgift.recursion((i,item,next) => {
				next();
			}, over => {
				 res = gameinformationgift;
				 return api_success(res);
			} );
			else return api_success(res);
		} );
	}
}();
