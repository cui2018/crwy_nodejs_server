module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//用户领取免费礼包
	getgiftcode() {
		if ( !post(data => {
			this._userGiftcode(data);
		} ) ) end("Param Error!");
	}
	//用户领取免费礼包  
	_userGiftcode(data) {
		//检查参数
		if ( !data.openId || !data.giftid || !data.gameid ) return api_error("5001");
		let d = new Date();
		let tim = d.getFullYear() + (d.getMonth() + 1) + d.getDate();
		let redis = LOAD.redis();
		redis.hget("usergift", data.openId + data.giftid + tim, gift => {
			if ( gift ) return api_success_gift(gift);
			//用户领取礼包
			redis.lpop("giftinfocode" + data.giftid, giftcode => {
				if ( !giftcode ) return api_error("4201");
				let usergift= {
					openid : data.openId,
					gameid : data.gameid,
					giftid : data.giftid,
					code : giftcode,
					giftTitle : "",
					giftDescriptor : "",
					ioc : ""
				};
				//查询礼包信息
				redis.get("giftlist" + data.giftid, gift => {
					if ( gift.giftTitle ) usergift.giftTitle = gift.giftTitle;
					if ( gift.giftDescriptor ) usergift.giftDescriptor = gift.giftDescriptor;
					//查询游戏ioc
					redis.get("gameinfo" + data.gameid, game => {
						if ( !game ) return api_error("4201");
						redis.hget("usergiftlist", data.openId, usergiftlist => {
							if (!usergiftlist) usergiftlist = [];
							usergift.ioc = game.ioc;
							//存入用户个人礼包内
							usergiftlist.unshift(usergift);
							redis.hset("usergiftlist", data.openId, usergiftlist);
						});
						let userZouMa = {
							nickName : "",
							giftTitle : gift.giftTitle,
							gameName : game.gameName
						};
						redis.hget("user", data.openId, user => {
							if ( !user ) userZouMa.nickName = "潮人用户";
							else userZouMa.nickName = user.nickName;
							//存入首页走马灯
							redis.lpush("userZouMa",userZouMa);
						} );
						let userlook = {
							openid : data.openId,
							giftid : data.giftid,
							code : giftcode,
							giftTitle : gift.giftTitle,
							giftDescriptor : gift.giftDescriptor,
							httpGameUrl : game.httpGameUrl
						};
						//存入用户查看礼包内
						redis.hset("usergift",data.openId + data.giftid + tim,userlook);
						userlook.gameid = data.gameid;
						userlook.giftNum = gift.giftNum;
						userlook.giftReceive = gift.giftReceive + 1;
						//删除礼包code
						rlog("delGiftCode",userlook);
						userlook.typeid = gift.typeId;
						//增加用户领取礼包
						rlog("addUserGiftCode",userlook);
						delete userlook.giftNum;
						delete userlook.giftReceive;
						delete userlook.httpGameUrl;
						return api_success( {
							openid : data.openId,
							giftid : data.giftid,
							code : giftcode,
							giftTitle : gift.giftTitle,
							giftDescriptor : gift.giftDescriptor
						} );
					} );
				} );
			} );
		} );
	}
}();