const MD5 = LOAD.library("md5");
module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//用户点击游戏开玩
	userplaygame() {
		if ( !post(data => {
			if( !data.openId || !data.gameid ) return api_error("5001");
			else this._playGame(data);
		} ) ) end("Param Error!");
	}
	//分享平台
	usershare() {
		if ( !post(data => {
			this._userShare(data);
		} ) ) end("Param Error!");
	}
	//用户点击开玩
	_playGame(data) {
		let res = {
			openId : data.openId,
			gameid : data.gameid,
			gamekey : "",
			appkey : "",
			time : new Date().getTime(),
			sign : "",
			httpgame : ""
		};
		let redis = LOAD.redis();
		redis.hget("user", data.openId, resuser => {
			if ( resuser.updateQD == 'WAW' ) res.title = "我爱网微游";
			redis.get("gameinfo" + data.gameid, game => {
				if ( !game ) return api_error("5003");
				res.httpgame = game.httpGameUrl;
				redis.hget("provider", data.gameid, provider => {
					if ( provider ) res.appkey = provider;
					res.gamekey = game.gamekey;
					if( data.gameid == 248 || data.gameid == 257 ) {
						if ( data.gameid == 257 ) {
							if( resuser.updateQD == "CRXL" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2407_38069";
							}
							else if ( resuser.updateQD == "JDCAP" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2410_38061";
							}
							else if ( resuser.updateQD == "XSLXC" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2408_38063";
							}
							else if ( resuser.updateQD == "XZCM" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2409_38062";
							}
							else if ( resuser.updateQD == "DZSTX" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2411_38060";
							}
							else if ( resuser.updateQD == "PT" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2413_38071";
							}
							else if ( resuser.updateQD == "xjyl" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2440_38815";
							}
							else if ( resuser.updateQD == "xbnxs" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2439_38816";
							}
							else if ( resuser.updateQD == "xbhrg" ) {
								res.httpgame = "http://h5.fante.com/?rel=31_2438_38817";
							}	
						}
						res.openId = "duokemeng";
						res.sign = MD5.en(res.openId + "duokemeng" + res.gamekey + res.appkey + res.time + "xiaoluo&xiaoluo");
					}
					else res.sign = MD5.en(res.openId + "xiaoluo" + res.gamekey + res.appkey + res.time + "xiaoluo&xiaoluo");
					res.gameshare = {
						title : "潮人微游之" + game.gameName,
						titleDescribe : game.smallDescriptor,
						imgUrl : game.ioc
					}			
					this._addUserHistoryGame(data);
					this._activePeople(data);
					return api_success(res);
				} );
			} );
		} );
	}
	//增加用户历史玩过游戏
	_addUserHistoryGame(data) {
		if ( !data.openId || !data.gameid ) return api_error("5001");
		let userplaygame = {
			gameName : "",
			gameid : data.gameid,
			ioc : "",
			logintime : time().timeFormat("%Y-%m-%d")
		};
		let redis = LOAD.redis();
		redis.get("gameinfo" + data.gameid, game => { 
			if ( game.ioc ) userplaygame.ioc = game.ioc;
			if ( game.gameName ) userplaygame.gameName = game.gameName;
			redis.hget("userhistorygame" , data.openId, historygame => {
				if (!historygame) historygame = [];
				let i = historygame.search({
					gameid : data.gameid
				});
				if (i!==false) {
					historygame.splice(i,1);
				}
				//增加用户最近在玩
				historygame.unshift(userplaygame);
				redis.hset("userhistorygame" , data.openId, historygame);
				redis.hget("userhonor", data.openId, honor => {
					//判断称号
					let gamenum = historygame.length;
					if ( honor ) {
						if(honor.userdriver == 0){
							if ( gamenum >= 3 ) {
								if(honor.userrecharge == 0){
									let mysql = LOAD.mysql();
									mysql.get("userorder", {
										orderUserId : data.openId,
										"orderDate >=" : "2018-04-20 21:00:00",
										orderState : 1
									}, "", "0,1", "id", order => {
										mysql.close();
										if ( order ) honor.userdriver = 1;
										redis.hset("userhonor",data.openId,honor);
									} );
								}
							}
						}
						
					}
					else {
						let userhonor = {
							userdriver : 0,
							userrecharge : 0,
							userrechargenum : 0
						};
						redis.hset("userhonor",data.openId,userhonor);
					}
					return api_success();							
				} );
			});
			redis.hget("user", data.openId, user => {
				let historygame = {
					gameId : data.gameid,
					userId : data.openId,
					qd : user.qd
				};
				//用户玩过游戏历史表
				rlog("userHistoryGame",historygame);
				return api_success();
			} );
		} );
	}
	//游戏活跃人数
	_activePeople(data) {
		if ( !data.openId || !data.gameid ) return api_error("5001");
		let redis = LOAD.redis();
		let d = new Date();
		let tim = d.getFullYear() + (d.getMonth() + 1) + d.getDate();
		redis.hget("user", data.openId, user => {
			let activepeopledata = {
					id : user.id,
					openid : data.openId,
					gameid : data.gameid,
					loginQD : user.updateQD
			};
			//增加用户玩过游戏
			rlog("addActivePeople", activepeopledata);
		} );
	}
	//用户分享
	_userShare(data) {
		let redis = LOAD.redis();
		redis.get("gameinfo" + data.gameid, game => {
			if ( !game ) return api_success( {
				title : "潮人微游——等你来玩",
				titleDescribe : "在潮人微游里，一起和我玩游戏",
				imgUrl : "http://p0oqd5s9w.bkt.clouddn.com/1521523786272@kaka-6kjXSHPJ.png"
			} );
			else return api_success( {
				title : "潮人微游之" + game.gameName,
				titleDescribe : game.smallDescriptor,
				imgUrl : game.ioc
			} );
		} );
	}
}();