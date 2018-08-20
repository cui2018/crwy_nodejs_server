module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//个人中心首页
	index() {
		if ( !post(data => {
			//如果传递了openid，执行获取用户信息
			if ( data.openId ) this._getUserInfo(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户查看好友
	usergetfriends() {
		if ( !post(data => {
			if ( data.openId ) this._userGetFriends(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户查看好友玩过的游戏
	userfindfriendsplaygame() {
		if ( !post(data => {
			if ( data.openId ) this._userFindFriendsPlayGame(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户查看个人中心礼包
	usergiftlist() {
		if ( !post(data => {
			if ( data.openId ) this._findUserInfoList(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//查看本期富豪榜
	plutefive() {
		if ( !post(data => {
			if ( data.openId ) this._getPluteFive(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//查看上期富豪榜
	plutefivebefore() {
		if ( !post(data => {
			if ( data.openId ) this._getPluteFiveBefore();
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//我要上榜
	loginplute() {
		if ( !post(data => {
			if ( data.openId ) this._loginPlute(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户查看实名认证
	findrealname() {
		if ( !post(data => {
			if ( data.openId ) this._findRealName(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户实名认证
	realname() {
		if ( !post(data => {
			if ( data.openId && data.name && data.identity ) this._realName(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//查看用户是否绑定身份证号
	getusertel(){
		if ( !post(data => {
			if (data.openId) this._getUserTel(data);
			else return api_error("5001");
		} ) ) end("Param Error!");
	}
	//用户个人信息
	_getUserInfo(data) {
		let redis = LOAD.redis();
		redis.hget("user", data.openId, user => {
			if ( !user ) return api_error("5003");
			redis.hget("userhonor", data.openId, honor => {
				let userhonor = {
					userdriver : 0,
					userrecharge : 0,
					userrechargenum : 0
				};
				if ( !honor ) redis.hset("userhonor", data.openId, userhonor, reshonor => {
					return api_success( {
						openId : user.openId,
						nickName : user.nickName,
						headImgUrl : user.headImgUrl,
						sex : user.sex,
						phone : user.phone,
						vipId : user.vipId,
						integral : user.integral,
						userHonor : userhonor
					} );
				} );
				else return api_success( {
					openId : user.openId,
					nickName : user.nickName,
					headImgUrl : user.headImgUrl,
					sex : user.sex,
					phone : user.phone,
					vipId : user.vipId,
					integral : user.integral,
					userHonor : honor
				} );
			} );
		} );
	}
	//我的好友
	_userGetFriends(data) {
		if ( !data.page ) data.page = 1;
		let page = (data.page - 1) * 10;
		let res = {
			totalpage : 0,
			nowpage : 1,
			friendslist : []
		};
		let redis = LOAD.redis();
		redis.hget("friendship", data.openId, friends => {
			friends = friends || [];
			if ( !friends ) return api_success(res);
			else friends.slice(page,page + 10).reverse().recursion((i,item,next) => {
				redis.hget("user", item, user => {
					if (!user) return api_error("5005"); 
					redis.hget("userhistorygame", item, userhistorygamelist => {
						user.gamelist = userhistorygamelist || [];
						delete user.integral;
						delete user.phone;
						delete user.sex;
						delete user.vipId;
						friends[i + page] = user;
						next();
					} );
				} );
			}, over => {
				res.friendslist = friends.slice(page,page + 10);
				res.totalpage = parseInt((friends.length + 9) / 10);
				res.nowpage = data.page;
				return api_success(res);
			} );
		} );
	}
	//用户查看好友玩过的游戏
	_userFindFriendsPlayGame(data) {
		if ( !data.page ) data.page = 1;
		let redis = LOAD.redis();
		let page = (data.page - 1) * 10;
		let res = {
			headImgUrl : "",
			nickName : "",
			gamelist : [],
			nowpage : data.page,
			totalpage : 0
		};
		redis.hget("user", data.friendOpenId, user => {
			if ( !user ) return api_error("5003");
			res.headImgUrl = user.headImgUrl;
			res.nickName = user.nickName;
			redis.hget("userhistorygame",data.friendOpenId, gamenum => {
				gamenum = gamenum.length;
				if ( gamenum > 0 ) {
					redis.hget("userhistorygame", data.friendOpenId, friendgame => {
						friendgame = friendgame.slice(page,page + 10);
						res.gamelist = friendgame;
						res.totalpage = parseInt((gamenum + 9) / 10);
						return api_success(res);
					} );
				}
				else return api_success(res);
			} );
		} );
	}
	//用户查看个人中心礼包
	_findUserInfoList(data) {
		if ( !data.openId ) return api_error("5001");
		if ( !data.page ) data.page = 1;
		let page = (data.page - 1) * 10;
		let res = {
			totalPage : 0,
			nowpage : 1,
			usergiftlist : []
		};
		let redis = LOAD.redis();
		redis.hget("usergiftlist", data.openId, usergiftlist => {
			if ( !usergiftlist ) return api_success(res);
			let num = usergiftlist.length;
			res.usergiftlist = usergiftlist.slice(page,page + 10)
			res.nowpage = data.page;
			res.totalPage = parseInt((num + 9) / 10);
			return api_success(res); 
		} );
	}
	//用户查看本期富豪
	_getPluteFive(data) {
		let now = new Date(); //当前日期  
		let nowDayOfWeek = now.getDay() - 1; //今天本周的第几天减一天 
		if ( nowDayOfWeek == -1 ) nowDayOfWeek = 6;
		let nowDay = now.getDate(); //当前日 
		let nowMonth = now.getMonth(); //当前月 
		let nowYear = now.getFullYear(); //当前年
		//获得本周开始日期
		let weekStartDate = formatDate(new Date(nowYear, nowMonth, nowDay - nowDayOfWeek));
		//获得本周的结束日期 
		let weekEndDate = formatDate(new Date(nowYear, nowMonth, nowDay + (6 - nowDayOfWeek))); 
		let redis = LOAD.redis();
		redis.hget("user", data.openId, mysel => {
			if ( !mysel ) return api_error("4102");
			let res = {
				existplute : 0,
				everyplute : [],
				startDate : weekStartDate,
				endDate : weekEndDate,
				usermysel : {}
			};
			delete mysel.integral;
			delete mysel.openId;
			delete mysel.phone;
			delete mysel.vipId;
			delete mysel.sex;
			res.usermysel = mysel;
			redis.hget("plutefive", weekEndDate, everyplute => {
				res.everyplute = everyplute || [];
				if ( res.everyplute ) res.everyplute.recursion((i,item,next) => {
					redis.hget("user", item.openId, user => {
						//判断自己是否上榜
						if ( data.openId == item.openId ) res.existplute = 1;
						item.nickName = user.nickName;
						item.headImgUrl = user.headImgUrl;
						//删除金额
						delete item.money;
						//删除用户openid
						delete item.openId;
						next();
					} );
				},over => {
					return api_success(res);
				} );
				else return api_success(res);
			} );
		} );
	}
	//用户查看上期富豪
	_getPluteFiveBefore() {
		let now = new Date(); //当前日期  
		let nowDayOfWeek = now.getDay() - 1; //今天本周的第几天减一天 
		if ( nowDayOfWeek == -1 ) nowDayOfWeek = 6;
		let nowDay = now.getDate(); //当前日 
		let nowMonth = now.getMonth(); //当前月 
		let nowYear = now.getFullYear(); //当前年
		//获得上期开始日期
		let weekStartDate = formatDate(new Date(nowYear, nowMonth, nowDay - nowDayOfWeek-7));
		//获得上期的结束日期 
		let weekEndDate = formatDate(new Date(nowYear, nowMonth, nowDay - nowDayOfWeek-1)); 
		let redis = LOAD.redis();
		let res = {
			everyplute : [],
			startDate : weekStartDate,
			endDate : weekEndDate
		};
		redis.hget("plutefive", weekEndDate, everyplute => {
			res.everyplute = everyplute || [];
			if ( res.everyplute ) res.everyplute.recursion((i,item,next) => {
				redis.hget("user", item.openId, user => {
					//判断自己是否上榜
					// if(data.openId == item.openId) res.existplute = 1;
					item.nickName = user.nickName;
					item.headImgUrl = user.headImgUrl;
					//删除金额
					delete item.money;
					//删除用户openid
					delete item.openId;
					next();
				} );
			}, over => {
				return api_success(res);
			} );
			else return api_success(res);
		} );
	}
	//用户登榜
	_loginPlute(data) {
		let now = new Date(); //当前日期  
		let nowDayOfWeek = now.getDay() - 1; //今天本周的第几天减一天 
		if ( nowDayOfWeek == -1 ) nowDayOfWeek = 6;
		let nowDay = now.getDate(); //当前日 
		let nowMonth = now.getMonth(); //当前月 
		let nowYear = now.getFullYear(); //当前年
		//获得本周开始日期
		let weekStartDate = formatDate(new Date(nowYear, nowMonth, nowDay - nowDayOfWeek));
		//获得本周的结束日期 
		let weekEndDate = formatDate(new Date(nowYear, nowMonth, nowDay + (6 - nowDayOfWeek)));
		let mysql = LOAD.mysql();
		mysql.one("userorder", {
			orderUserId : data.openId,
			orderState : 1,
			"orderDate >=" : weekStartDate,
			"orderDate <=" : weekEndDate
		}, "SUM(orderMoney) money", "", mymoney => {
			mysql.close();
			mymoney = mymoney || 0;
			let res = {
				loginmoney : 0,
				gamelist : []
			};
			let redis = LOAD.redis();
			redis.hget("plutefive", weekEndDate, plutefive => {
				if ( !plutefive ) return api_error("4401");
				res.loginmoney = plutefive[plutefive.length - 1].money - mymoney;
				redis.hget("userhistorygame", data.openId, usergamelist => {
					res.gamelist = usergamelist || [];
					return api_success(res);
				} );
			} );
		} );
	}
	//用户查看实名认证
	_findRealName(data) {
		let redis = LOAD.redis();
		redis.hget("identity", data.openId, useridentity => {
			if ( !useridentity ) return api_error("4301");
			useridentity.identity = "******************";
			useridentity.name = useridentity.name.substring(0,1) + "**";
			return api_success(useridentity);
		} );
	}
	//用户实名认证
	_realName(data) {
		let useridentity = {
			name : data.name,
			identity : data.identity
		}
		let redis = LOAD.redis();
		redis.hset("identity", data.openId, useridentity, identity => {
			if (!identity) return api_error("4301");
			redis.hget("onetask", data.openId, onetask => {
				if ( onetask ) {
					let onetaskuser = {
						identitytask : 1,
						phonetask : onetask.phonetask
					};
					redis.hset("onetask", data.openId, onetaskuser);
				}
			} );
			data.implDate = time().timeFormat();
			rlog("addIdentity", data);
			return api_success( {
				identitytask : 1
			} );
		} );
	}
	//查看用户手机号
	_getUserTel(data){
		let redis = LOAD.redis();
		redis.hget("user", data.openId, user => {
			if (user.phone) return api_success({
				trueName : user.trueName.substring(0,1)+"**",
				phone : user.phone
			});
				else{
					return api_error("4501");
				}
		});
	}
}();