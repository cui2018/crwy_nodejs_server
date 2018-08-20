module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//Banner
	banner() {
		if ( !post(data => {
			this.redis.get("banner", banner => {
				return api_success(banner || []);
			} );
		} ) ) end("Param Error!");
	}
	//走马灯
	zouma() {
		if ( !post(data => {
			this.redis.get("indexZouMa", userZouMa => {
				return api_success(userZouMa || []);
			} );
		} ) ) end("Param Error!");
	}
	//最近在玩列表
	history() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5004");
			this.redis.hget("userhistorygame", data.openId, userhistorygame => {
				return api_success(userhistorygame || []);
			} );
		} ) ) end("Param Error!");
	}
	//游戏列表
	gamelist() {
		if ( !post(data => {
			this._findGameList(data);
		} ) ) end("Param Error!");
	}
	//实名认证状态
	identity() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5004");
			this.redis.hget("identity", data.openId, useridentity => {
				return api_success(useridentity ? 1 : 0);
			} );
		} ) ) end("Param Error!");
	}
	//新游列表
	newgamelist() {
		if ( !post(data => {
			this._findNewGame(data);
		} ) ) end("Param Error!");
	}
	//游戏分类
	gametype() {
		if ( !post(data => {
			this._findGameType();
		} ) ) end("Param Error!");
	}
	//游戏分类列表
	gametypelist() {
		if ( !post(data => {
			this._findGameTypeList(data);
		} ) ) end("Param Error!");
	}
	//用户最近在玩更多
	userhistorygame() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5004");
			this._userHistoryGame(data);
		} ) ) end("Param Error!");
	}
	//用户最近在玩更多
	_userHistoryGame(data) {
		//最近在玩列表
		this.redis.hget("userhistorygame", data.openId, userhistorygame => {
			let res = [];
			if ( userhistorygame ) res = userhistorygame;
			return api_success(res);
		} );
	}
	//游戏列表
	_findGameList(data) {
		if( !data.page ) return api_error("5001");
		let page = "page" + data.page;
		this.redis.hget("gamelist", page, gamelist => {
			if ( !gamelist ) return api_error("5003");
			return api_success(gamelist);
		} );
	}
	//新游列表
	_findNewGame() {
		this.redis.get("newgame", newgame => {
			if ( !newgame ) return api_error("5003");
			return api_success(newgame);
		} );
	}
	//游戏分类
	_findGameType() {
		this.redis.get("gametype", gametype => {
			if ( !gametype ) return api_error("5003");
			return api_success(gametype);
		} );
	}
	//游戏分类列表
	_findGameTypeList(data) {
		if ( !data.typeid ) return api_error("5001");
		this.redis.get("gametypelist" + data.typeid, gametypelist => {
			if ( !gametypelist ) return api_error("5003");
			return api_success(gametypelist);
		} );
	}
}();