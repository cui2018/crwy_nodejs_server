module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//礼包列表
	giftlist() {
		if ( !post(data => {
			this._fiandgift(data);
		} ) ) end("Param Error!");
	}
	//游戏更多礼包
	gamemoregift() {
		if ( !post(data => {
			this._findMoreGift(data);
		} ) ) end("Param Error!");
	}
	//查询礼包列表
	_fiandgift(data) {
		if ( !data.page ) data.page = 1;
		let page = (data.page - 1) * 10;
		let res = {
			game : [],
			totalpage : "",
			nowpage : data.page
		};
		this.redis.hlen("gamegiftlist", giftnum => {
			giftnum = giftnum || 0;
			res.totalpage = parseInt((giftnum + 9) / 10);
			this.redis.hgetallvalue("gamegiftlist", gamegiftlist => {
				res.game = gamegiftlist.slice(page,page + 10) || [];
				return api_success(res);
			} );
		} );
	}
	//更多礼包
	_findMoreGift(data) {
		if ( !data.gameid ) return api_error("5001");
		this.redis.get("gamemoregift" + data.gameid, gamemoregift => {
			if ( !gamemoregift ) return api_error("5003");
			return api_success(gamemoregift);
		} );
	}
}();