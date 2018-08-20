module.exports = new class extends Controller {
	constructor() {
		super();
	}
	index() {
		if( !post(data => {
			this._gameinformation(data);
		} ) ) end("Param Error!");
	}
	//游戏详情页
	_gameinformation(data) {
		if ( !data.openId || !data.gameid ) return api_error("5001");
		let res = {
			gameinfo : [],
			gameimg : [],
			gamegift : [],
			dayrecommend : [],
			friendslist : []
		};
		let redis = LOAD.redis();
		redis.get("gameinfo" + data.gameid, gameinfo => {//游戏详情
			if ( gameinfo ) res.gameinfo = gameinfo;
			redis.get("gameinformationgameimg" + data.gameid, gameinformationgameimg => {//游戏图片详情
				if ( gameinformationgameimg ) res.gameimg = gameinformationgameimg;
				redis.get("gameinformationgift" + data.gameid, gameinformationgift => {//游戏礼包详情
					if ( gameinformationgift ) res.gamegift = gameinformationgift;
					redis.get("dayrecommend", dayrecommend => {//近日热门详情
						if ( dayrecommend ) res.dayrecommend = dayrecommend;
						redis.hget("friendship", data.openId, friends => {
							if ( friends ) friends.recursion((i,item,next) => {
								redis.hget("user", item, user => {
									if ( user ) redis.hget("userhistorygame" + item, data.gameid, userhistorygame => {
										if ( userhistorygame ) {
											delete user.integral;
											delete user.phone;
											delete user.sex;
											delete user.vipId;
											delete user.openId;
											res.friendslist.push(user);
										}
										next();
									} );
									else next();
								} );
							}, over => api_success(res));
							else api_success(res);
						} );
					} );
				} );
			} );
		} );
	}
}();