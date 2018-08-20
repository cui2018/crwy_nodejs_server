module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	index() {
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._getMall(data);
		} ) ) end("Param Error!");
	}
	//全部游戏商品
	gamegoods(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._gameGoods(data);
		} ) ) end("Param Error!");
	}
	//用户最近在玩游戏商品
	userplaygamegoods(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._userPlayGameGoods(data);
		} ) ) end("Param Error!");
	}
	//热门游戏礼包(游戏列表)
	hotgamegoods(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._hotGameGoods(data);
		} ) ) end("Param Error!");
	}
	//实物列表
	mattergoods(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._getMatterGoodsList(data);
		} ) ) end("Param Error!");
	}
	//查看游戏礼包商品详情
	gamegoodsinfo(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._gameGoodsInfo(data);
		} ) ) end("Param Error!");
	}
	//查看京东卡商品详情
	jdcardinfo(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._jdcardInfo(data);
		} ) ) end("Param Error!");
	}
	//查看实物商品详情
	mattergoodsinfo(){
		if ( !post(data => {
			if ( !data.openId || !data.goods || !data.mattergoods_id ) return api_error("5001");
			this._matterGoodsInfo(data);
		} ) ) end("Param Error!");
	}
	//用户兑换商品
	exchangegoods(){
		if ( !post(data => {
			if ( !data.openId || !data.id || !data.goods ) return api_error("5001");
			this._exchangeGoods(data);
		} ) ) end("Param Error!");
	}
	//商城首页
	_getMall(data){
		let res ={
			signstate : 1,
			gamegoods : []
		};
		let redis = LOAD.redis();
		redis.hget("user", data.openId, user => {
			if( !user ) return api_error("4102");
			redis.hgetallvalue("gamegoods", gamegoods => {
				if ( gamegoods ) res.gamegoods = gamegoods.slice(0,10);
				redis.hget("everydaysign", data.openId, everydaysign => {
					let beforetime = (time()-24*60*60).timeFormat("%Y-%m-%d");
					if( !everydaysign || everydaysign.signtime != time().timeFormat("%Y-%m-%d") ) res.signstate = 0;
					res.headImgUrl = user.headImgUrl || "";
					res.nickName = user.nickName || "潮人用户";
					res.integral = user.integral || 0;
					redis.lrange("mallzouma", 0, 20, mallzouma => {
						res.mallzouma = mallzouma || [];
						redis.hget("everydaysign", data.openId, everydaysign => {
							let beforetime = (time()-24*60*60).timeFormat("%Y-%m-%d");
							if( !everydaysign || (everydaysign.signtime != time().timeFormat("%Y-%m-%d") && everydaysign.signtime != beforetime) ) {
								res.signintegral = 20;
								res.signstate = 0;
								return api_success(res);
							}
							else{
								if( everydaysign.signtime == time().timeFormat("%Y-%m-%d") ){
									res.signstate = 1;
									return api_success(res);
								}
								else{
									if( everydaysign.signtime == beforetime ) this.redis.hget("signintask_score", everydaysign.signtimes+1, integral => {
										integral = integral || 20;
										res.signstate = 0;
										res.signintegral = integral;
										return api_success(res);
									} );
								}
							}
						} );
					} );
				} );
			} );
		} );
	}
	//全部游戏商品
	_gameGoods(data){
		if ( !data.page ) data.page = 1;
		this.redis.hgetallvalue("gamegoods", gamegoods => {
			let res ={
				nowpage : data.page
			};
			gamegoods = gamegoods || [];
			res.totalpage = parseInt((gamegoods.length+9)/10);
			res.gamegoods = gamegoods.slice((data.page - 1)*10, (data.page - 1)*10 + 10);
			return api_success(res);
		} );
	}
	//用户最近在玩游戏商品
	_userPlayGameGoods(data){
		if ( !data.page ) data.page = 1;
		this.redis.hget("userhistorygame", data.openId, userhistorygame => {
			let res = {
				gamegoods : [],
				nowpage : data.page,
				totalpage : 0
			};
			if ( !userhistorygame ) return api_success(res);
			this.redis.hgetallvalue("gamegoods", gamegoods => {
				gamegoods.recursion((i,item,next) => {
					i = userhistorygame.search({
						gameid : item.gameinfo_id
					} );
					if( i !== false ) {
						delete item.gameinfo_id
						res.gamegoods.push(item);
					}
					next();
				}, over => {
					res.totalpage = parseInt((res.gamegoods.length+9)/10);
					res.gamegoods = res.gamegoods.slice((data.page - 1)*10, (data.page - 1)*10 + 10);
					return api_success(res);
				} );
			} );
		} ); 
	}
	//热门游戏礼包(游戏列表)
	_hotGameGoods(data){
		if ( !data.page ) data.page = 1;
		this.redis.hgetallvalue("gamelist", gamelist => {
			let res = {
				gamegoods : [],
				nowpage : data.page,
				totalpage : 0
			};
			if ( !gamelist ) return api_success(res);
			let arr = [];
			gamelist.recursion((i,item,next) => {
				item.game.recursion((j,jtem,next) => {
					arr.push(jtem.id);
					next();
				}, over => {
					next();
				} );
			}, over => {
				this.redis.hgetallvalue("gamegoods", gamegoods => {
					gamegoods.recursion((i,item,next) => {
						let index = arr.indexOf(item.gameinfo_id);
						if( index >= 0 ) {
							delete item.gameinfo_id;
							res.gamegoods.push(item);
						}
						next();
					}, over => {
						res.totalpage = parseInt((res.gamegoods.length+9)/10);
						res.gamegoods = res.gamegoods.slice((data.page - 1)*10, (data.page - 1)*10 + 10);
						return api_success(res);
					} );
				} );
			} );
			
		} );
	}
	//实物商品
	_getMatterGoodsList(data){
		if ( !data.page ) data.page = 1;
		this.redis.hget("mattergoods", "allmattergoods", mattergoods => {
			let res ={
				nowpage : data.page
			};
			mattergoods = mattergoods || [];
			res.totalpage = parseInt((mattergoods.length+9)/10);
			res.mattergoods = mattergoods.slice((data.page - 1)*10, (data.page - 1)*10 + 10);
			return api_success(res);
		} );
	}
	//查看游戏礼包商品详情
	_gameGoodsInfo(data){
		let res ={
			goods : {},
			state : 0
		}
		this.redis.hget("user", data.openId, user => {
			if ( !user ) return api_error("4102");
			if( "gamegoods" == data.goods.toLowerCase() ){
				this.redis.hget("gamegoods", data.gamegoods_id, gamegoods => {
					if ( gamegoods )  {
						res.goods = gamegoods;
						res.state = user.integral >= gamegoods.goodsIntegral ? 1 : 0;
						res.userlike = [];
						this.redis.hgetallvalue("gamegoods", gamegoodsarr => {
							gamegoodsarr.recursion((i,item,next) => {
								if( item.id == data.gamegoods_id ) next();
								else {
									if( item.gameinfo_id == gamegoods.gameinfo_id ) {
										delete item.gameinfo_id;
										res.userlike.push(item);
									}
									next();
								}
							}, over => {
								delete res.goods.gameinfo_id;
								if ( res.userlike.length >=3 )  {
									res.userlike = res.userlike.slice(0,3);
									res.userlike = deleteitem.call(this, res.userlike);
									return api_success(res);
								}
								else this.redis.hget("userhistorygame", data.openId, userhistorygame => {
									//用户没有玩过游戏
									if ( !userhistorygame ) this.redis.hgetallvalue("gamelist", gamelist => {
										//没有热门游戏
										if ( !gamelist ) return api_success(res);
										else gamegoodsarr.recursion((i,item,next1) => {
											if( item.id == data.gamegoods_id ) next1();
											else{
												gamelist.recursion((n,ntem,next2) => {
													ntem.game.recursion((j,jtem,next3) => {
														if( jtem.id = item.gameinfo_id ) {
															delete item.gameinfo_id;
															res.userlike.push(item);
														}
														next3();
													}, over => {
														next2();
													} );
												}, ntemover => {
													next1();
												} );
											}
										}, over => {
											if ( res.userlike.length >= 3 )  res.userlike = res.userlike.slice(0,3);
											res.userlike = deleteitem.call(this, res.userlike);
											return api_success(res);
										} );
									} );
									else gamegoodsarr.recursion((i,item,next) => {
										if( item.id == data.gamegoods_id ) next();
										let j = userhistorygame.search({
											gameid : item.gameinfo_id
										} );
										if ( j !== false ) {
											delete item.gameinfo_id;
											res.userlike.push(item);
										}
										next();
									}, over => {
										if ( res.userlike.length >=3 )  {
											res.userlike = res.userlike.slice(0,3);
											res.userlike = deleteitem.call(this, res.userlike);
											return api_success(res);
										}
										else this.redis.hgetallvalue("gamelist", gamelist => {
											//没有热门游戏
											if ( !gamelist ) return api_success(res);
											else gamegoodsarr.recursion((i,item,next1) => {
												if( item.id == data.gamegoods_id ) next1();
												else {
													gamelist.recursion((n,ntem,next2) => {
														ntem.game.recursion((j,jtem,next3) => {
															if( jtem.id = item.gameinfo_id ) {
																delete item.gameinfo_id;
																res.userlike.push(item);
															}
															next3();
														}, over => {
															next2();
														} );
													}, ntemover => {
														next1();
													} );
												}
											}, itemover => {
												if ( res.userlike.length >= 3 )  {
													let i = res.userlike.search({
														id : data.gamegoods_id
													} );
													if( i !== false ){
														res.userlike.splice(i,1);
													}
													res.userlike = res.userlike.slice(0,3);
												}
												res.userlike = deleteitem.call(this, res.userlike);
												return api_success(res);
											} );
										} );
									} );
								} );
							} );
						} );
						function deleteitem(data){
							data.recursion((i,item,next) => {
								delete item.gameinfo_id;
								delete item.goodsIntegral;
								delete item.goodsDescribe;
								delete item.goodsNum;
								delete item.goodsReceive;
								next();
							} );
							return data;
						}
					}
					else return api_error("6001");
				} );
			} 
			else return api_error("6401");
		} );
	}
	//查看京东卡详情
	_jdcardInfo(data){
		let res = {
			goods : {},
			state : 0
		}
		if( "jdcard" == data.goods.toLowerCase() ){
			this.redis.hget("user", data.openId, user => {
				if( !user ) return api_error("4102");
				this.redis.hget("jdcard", data.jdcard_id, jdcard => {
					if( !jdcard ) return api_error("6001");
					res.goods = jdcard;
					res.state = user.integral >= jdcard.JDIntegral ? 1 : 0;
					return api_success(res);
				} );
			} );
		}
		else return api_error("6401");
	}
	//查看实物商品详情
	_matterGoodsInfo(data){
		let res = {
			goods : {},
			state : 0
		};
		if ( "mattergoods" == data.goods.toLowerCase() ){
			this.redis.hget("user", data.openId, user => {
				if( !user ) return api_error("4102");
				this.redis.hget("mattergoods", "allmattergoods", mattergoods => {
					if( !mattergoods ) return api_error("6001");
					else {
						let i = mattergoods.search( {
							id : data.mattergoods_id
						} );
						if ( i !== false ) {
							this.redis.hget("mattergoodsformat", data.mattergoods_id, mattergoodsformat => {
								mattergoods[i].goodsFormat = mattergoodsformat || [];
								res.goods = mattergoods[i];
								res.state = user.integral >= mattergoods[i].goodsIntegral ? 1 : 0;
								return api_success(res);
							} );
						} 
						else return api_error("6001");
					}
					/*this.redis.hget("mattergoodsformat", data.mattergoods_id, mattergoodsformat => {
						mattergoods.goodsFormat = mattergoodsformat || [];
						res.goods = mattergoods;
						res.state = user.integral >= mattergoods.goodsIntegral ? 1 : 0;
						return api_success(res);
					} );*/
				} );
			} );
		}
		else return api_error("6401");
	}
	//用户兑换商品
	_exchangeGoods(data){
		this.redis.hget("user", data.openId, user => {
			if(!user) return api_error("4102");
			let exchangegoods = {
				id : data.id,
				nickName : user.nickName,
				openId : data.openId,
				implDate : time().timeFormat()
			}
			if( "gamegoods" == data.goods.toLowerCase() ){
				this.redis.hget("usergoodslist", data.openId, goodsList => {
					goodsList = goodsList || [];
					if ( goodsList.length > 0 ) {
						goodsList.recursion((i,item,next) => {
							if ( item.goodsType == 0 ) {
								if ( item.goodsInfo.gamegoods_id == data.id ) return api_error("6405");
								else next();
							}
							else next();
						}, over => {
							this.redis.hget("gamegoods", data.id, gamegoods => {//用户兑换游戏商品
								if ( !gamegoods ) return api_error("6002");
								if ( user.integral < gamegoods.goodsIntegral ) return api_error("6003");
								//查询出礼包兑换码
								this.redis.lpop("gamegoodscode"+data.id, gamegoodscode => {
									if( !gamegoodscode ) return api_error("6002");
									exchangegoods.goodsName = gamegoods.goodsName;
									exchangegoods.goodsIntegral = gamegoods.goodsIntegral;
									gamegoods.goodsReceive += 1;
									exchangegoods.goodsType = 0;
									exchangegoods.goodsInfo = {
										gamegoods_id : data.id,
										goodsName : gamegoods.goodsName,
										gameid : gamegoods.gameinfo_id,
										goodsdescribe : gamegoods.goodsDescribe,
										code : gamegoodscode,
										goodsNum : gamegoods.goodsNum,
										goodsReceive : gamegoods.goodsReceive
									};
									exchangegoods.goodsReceive = gamegoods.goodsReceive;
									exchangegoods.gameinfo_id = gamegoods.gameinfo_id;
									if ( gamegoods.goodsReceive >= gamegoods.goodsNum ) this.redis.hdel("gamegoods", data.id);
									else this.redis.hset("gamegoods", data.id, gamegoods);
									addUserGoods.call(this, exchangegoods);
									rlog("exchangeGameGoods", exchangegoods);
									//更改用户积分
									user.integral -= gamegoods.goodsIntegral;
									this.redis.hset("user", data.openId, user, resuser => {
										//更改库里用户积分
										rlog("updateUserIntegral", user);
										exchangegoods.goodsInfo.integral = user.integral;
										return api_success(exchangegoods.goodsInfo);
									} );
								} );
							} );
						} );
					}
					else {
						this.redis.hget("gamegoods", data.id, gamegoods => {//用户兑换游戏商品
							if ( !gamegoods ) return api_error("6002");
							if ( user.integral < gamegoods.goodsIntegral ) return api_error("6003");
							//查询出礼包兑换码
							this.redis.lpop("gamegoodscode"+data.id, gamegoodscode => {
								if( !gamegoodscode ) return api_error("6002");
								exchangegoods.goodsName = gamegoods.goodsName;
								exchangegoods.goodsIntegral = gamegoods.goodsIntegral;
								gamegoods.goodsReceive += 1;
								exchangegoods.goodsType = 0;
								exchangegoods.goodsInfo = {
									gamegoods_id : data.id,
									goodsName : gamegoods.goodsName,
									gameid : gamegoods.gameinfo_id,
									goodsdescribe : gamegoods.goodsDescribe,
									code : gamegoodscode,
									goodsNum : gamegoods.goodsNum,
									goodsReceive : gamegoods.goodsReceive
								};
								exchangegoods.goodsReceive = gamegoods.goodsReceive;
								exchangegoods.gameinfo_id = gamegoods.gameinfo_id;
								if ( gamegoods.goodsReceive >= gamegoods.goodsNum ) this.redis.hdel("gamegoods", data.id);
								else this.redis.hset("gamegoods", data.id, gamegoods);
								addUserGoods.call(this, exchangegoods);
								rlog("exchangeGameGoods", exchangegoods);
								//更改用户积分
								user.integral -= gamegoods.goodsIntegral;
								this.redis.hset("user", data.openId, user, resuser => {
									//更改库里用户积分
									rlog("updateUserIntegral", user);
									exchangegoods.goodsInfo.integral = user.integral;
									return api_success(exchangegoods.goodsInfo);
								} );
							} );
						} );
					}
				} );
			}
			else if ("mattergoods" == data.goods.toLowerCase()) {
				if( !data.username || !data.tel || !data.address || !data.goodsformat ) return api_error("5001");
				this.redis.hget("mattergoods", "allmattergoods", mattergoods => {//用户兑换实物
					if ( !mattergoods ) return api_error("6002");
					else {
						let i = mattergoods.search( {
							id : data.id
						} );
						if( i !== false ) {
							if ( user.integral < mattergoods[i].goodsIntegral ) return api_error("6003");
							else {
								exchangegoods.goodsName = mattergoods[i].goodsName;
								exchangegoods.goodsIntegral = mattergoods[i].goodsIntegral;
								mattergoods[i].goodsReceive += 1;
								exchangegoods.goodsType = 1;
								exchangegoods.goodsInfo = {
									username : data.username,
									tel : data.tel,
									address : data.address,
									goodsformat : data.goodsformat,
									goodsNum : mattergoods[i].goodsNum,
									goodsReceive : mattergoods[i].goodsReceive
								};
								exchangegoods.goodsReceive = mattergoods[i].goodsReceive;
								//更改用户积分
								user.integral -= mattergoods[i].goodsIntegral;
								if ( mattergoods[i].goodsReceive >= mattergoods[i].goodsNum ) {
									mattergoods.splice(i,1);
									this.redis.hset("mattergoods", "allmattergoods", mattergoods);
								}
								else this.redis.hset("mattergoods", "allmattergoods", mattergoods);
								addUserGoods.call(this, exchangegoods);
								rlog("exchangeMatterGoods", exchangegoods);
								this.redis.hset("user", data.openId, user, resuser => {
									//更改库里用户积分
									rlog("updateUserIntegral", user);
									delete exchangegoods.goodsInfo.username;
									delete exchangegoods.goodsInfo.tel;
									delete exchangegoods.goodsInfo.address;
									delete exchangegoods.goodsInfo.goodsformat;
									exchangegoods.goodsInfo.integral = user.integral;
									return api_success(exchangegoods.goodsInfo);
								} );
							}
						}
						else return api_error("6002");
					}
				} );
			}
			else if ( "jdcard" == data.goods.toLowerCase() ) {
				this.redis.hget("jdcard", data.id, jdcard => {
					if( !jdcard ) return api_error("6002");
					this.redis.lpop("jdcardcode"+data.id, jdcardcode => {
						if( !jdcardcode ) return api_error("6002");
						if ( user.integral < jdcard.JDIntegral ) return api_error("6003");
						exchangegoods.goodsName = jdcard.JDName;
						exchangegoods.goodsIntegral = jdcard.JDIntegral;
						exchangegoods.goodsInfo = jdcardcode;
						jdcard.JDReceive += 1;
						exchangegoods.JDReceive = jdcard.JDReceive;
						if ( jdcard.JDReceive >= jdcard.JDNum  ) this.redis.hdel("jdcard", data.id, resjdcard => {
							this.redis.del("jdcardcode"+data.id);
						} );
						else this.redis.hset("jdcard", data.id, jdcard);
						addUserGoods.call(this, exchangegoods);
						//存入数据库中
						rlog("exchangeJDCard", exchangegoods);
						//更改用户积分
						user.integral -= jdcardcode.JDIntegral;
						this.redis.hset("user", data.openId, user);
						//更改库里用户积分
						rlog("updateUserIntegral", user);
						return api_success( {
							cardNum : jdcardcode.cardNum,
							cardPwd : jdcardcode.cardPwd,
							endTime : jdcardcode.endTime
						} );
					} );
				} );
			}
			else return api_error("6401");
			//存储用户兑换记录
			function addUserGoods(data){
				this.redis.hget("usergoodslist", data.openId, usergoods => {
					let userGoodsArr = {
						goodsName : data.goodsName,
						goodsType : data.goodsType,
						goodsIntegral : data.goodsIntegral,
						goodsInfo : data.goodsInfo,
						implDate : data.implDate
					}
					usergoods = usergoods || [];
					usergoods.unshift(userGoodsArr);
					//存储用户兑换记录列表
					this.redis.hset("usergoodslist", data.openId, usergoods);
					let zouma = {
						nickName : data.nickName,
						goodsName : data.goodsName
					};
					//存储商城跑马灯
					this.redis.lpush("mallzouma", zouma);
				} );
			}
		} );
	}

}();
