module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//查询赚积分
	userintegral(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._everydaySign(data, false, {});
		} ) ) end("Param Error!");
	}
	//用户实名认证任务
	identitytaskuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._identityTaskUser(data,true);
		} ) ) end("Param Error!");
	}
	//用户绑定手机号任务
	phonetaskuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._phoneTaskUser(data,true);
		} ) ) end("Param Error!");
	}
	//用户分享通知后台
	ressharetaskuser(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._resShareTaskUser(data);
		} ) ) end("Param Error!");
	}
	//用户做分享任务
	sharetaskuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._shareTaskUser(data);
		} ) ) end("Param Error!");
	}
	//用户做赚佣金任务
	friendtaskuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._friendTaskUser(data);
		} ) ) end("Param Error!");
	}
	//用户做签到任务
	everydaysignuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._everydaySignUser(data);
		} ) ) end("Param Error!");
	}
	//用户做每日首充任务
	rechargetaskuser(){
		if ( !post(data => {
			if ( !data.openId || !data.integral ) return api_error("5001");
			this._rechargeTaskUser(data);
		} ) ) end("Param Error!");
	}
	//每日签到
	_everydaySign(data,bool,o){
		let signintask = {};
		this.redis.hget("user", data.openId, user => {
			this.redis.hget("everydaysign", data.openId, everydaysign => {
				let beforetime = (time()-24*60*60).timeFormat("%Y-%m-%d");
				if( !everydaysign || (everydaysign.signtime != time().timeFormat("%Y-%m-%d") && everydaysign.signtime != beforetime) ) {
					signintask.signstate = 0;
					signintask.signintegral = 20;
					o.signstate = signintask.signstate;
					o.signintegral = signintask.signintegral;
					this._rechargeTask(data, false, o);
				}
				else{
					if( everydaysign.signtime == time().timeFormat("%Y-%m-%d") ){
						this.redis.hget("signintask_score", everydaysign.signtimes + 1, integral => {
							integral = integral || 20;
							signintask.signstate = everydaysign.signstate;
							signintask.signintegral = integral;
							signintask.signtimes = everydaysign.signtimes;
							if(bool){
								signintask.integral = user.integral;
								return api_success(signintask);
							}
							else {
								o.signstate = signintask.signstate;
								o.signintegral = signintask.signintegral;
								this._rechargeTask(data, false, o);
							}
						} );
					}
					else{
						let beforetime = (time()-24*60*60).timeFormat("%Y-%m-%d");
						if ( beforetime == everydaysign.signtime ) {
							this.redis.hget("signintask_score", everydaysign.signtimes+1, integral => {
								integral = integral || 20;
								signintask.signstate = 0;
								signintask.signintegral = integral;
								o.signstate = signintask.signstate;
								o.signintegral = signintask.signintegral;
								this._rechargeTask(data, false, o);
							} );
						}
						else{
							o.signstate = 0;
							o.signintegral = 20;
							this._rechargeTask(data, false, o);
						}
					}
				}
			} );
		} );
	}
	//首充任务 (查询用户订单redis中用户今日是否充值)
	_rechargeTask(data,bool,o){
		let rechargetaskuser = {
			rechargetaskstate : 0
		};
		this.redis.hget("rechargetaskorder", data.openId, rechargetaskorder => {
			if( rechargetaskorder == time().timeFormat("%Y-%m-%d") ) {
				//查询用户今日首充任务完成状态
				this.redis.hget("rechargetask", data.openId, rechargetask => {
					if ( !rechargetask ||  rechargetask.state == 0 || rechargetask.ordertime != time().timeFormat("%Y-%m-%d")) this.redis.hset("rechargetask", data.openId, {
						state : 1,
						ordertime : time().timeFormat("%Y-%m-%d")
					}, over => {
						o.rechargetaskstate = 1;
						this._friendTask(data, false, o);
					} );
					else {
						rechargetaskuser.rechargetaskstate = rechargetask.state;
						if( bool ) {
							this.redis.hget("user", data.openId, user => {
								rechargetaskuser.integral = user.integral;
								return api_success(rechargetaskuser);
							} );
						}
						else {
							o.rechargetaskstate = rechargetaskuser.rechargetaskstate;
							this._friendTask(data, false, o);
						}
					}
				} );
			}
			else {
				o.rechargetaskstate = 0;//用户今日未充值
				this._friendTask(data, false, o);
			}
		} );
	}
	//赚佣金任务 (好友充值)
	_friendTask(data,bool,o){
		let friendtask = {
			friendtaskstate : 0
		};
		this.redis.hget("friendtask", data.openId, newuserfriendArr => {
			let moneyIntegral = 0;
			if( newuserfriendArr ) {
				newuserfriendArr.recursion((i, item, next) => {
					this.redis.hget("friendtaskorder", newuserfriendArr[i], friendMoney => {
						if ( friendMoney ) moneyIntegral += parseInt(friendMoney) * 2;
						next();
					} );
				}, over => {
					if ( bool )	this.redis.hget("user", data.openId, user => {
						friendtask.integral = user.integral;
						return api_success(friendtask);
					} );
					else {
						if ( moneyIntegral > 0) o.friendtaskstate = 1;
						else o.friendtaskstate = 0;
						o.friendtaskmoneyIntegral = moneyIntegral;
						this._shareTask(data, false, o);
					}
				} );
			}
			else {
				o.friendtaskstate = 0;
				o.friendtaskmoneyIntegral = 0;
				this._shareTask(data, false, o);
			}
		} );
	}
	//分享任务
	_shareTask(data,bool,o){
		let sharetask = {
			sharetaskstate : 0
		};
		this.redis.hget("sharetask", data.openId, sharetaskres => {
			if( !sharetaskres || sharetaskres.state == 0 || sharetaskres.sharetime != time().timeFormat("%Y-%m-%d") ) {
				sharetask.sharetaskstate = 0;
				o.sharetaskstate = sharetask.sharetaskstate;
				this._oneTask(data, false, o); 
			}
			else {
				sharetask.sharetaskstate = sharetaskres.state;
				if( bool ) {
					this.redis.hget("user", data.openId, user => {
							sharetask.integral = user.integral;
							return api_success(sharetask);
						} );
				}
				else {
					o.sharetaskstate = sharetask.sharetaskstate;
					this._oneTask(data, false, o);
				}
			}
		} );
	}
	//一次任务
	_oneTask(data,bool,o){
		let resonetask = {
			phonetask : 0,
			identitytask : 0
		};
		this.redis.hget("identity", data.openId, identity => {
			if ( identity ) resonetask.identitytask = 1;
			this.redis.hget("user", data.openId, user => {
				if ( !user ) return api_error("4102");
				if( user.phone ) resonetask.phonetask = 1;
				this.redis.hget("onetask", data.openId, onetask => {
					if ( onetask ) {
						resonetask.phonetask = onetask.phonetask;
						resonetask.identitytask = onetask.identitytask;
						if( bool ) {
							resonetask.integral = user.integral;
							return api_success(resonetask);
						}
						else {
							o.phonetask = resonetask.phonetask;
							o.identitytask = resonetask.identitytask;
							return api_success(o);
						}
					}
					else {
						o.phonetask = resonetask.phonetask;
						o.identitytask = resonetask.identitytask;
						return api_success(o);
					}
				} );
				
			} );
		} );
	}
	//用户分享通知后台
	_resShareTaskUser(data){
		let sharetask = {
			state : 1,
			sharetime : time().timeFormat("%Y-%m-%d")
		};
		this.redis.hget("sharetask", data.openId, resharetask => {
			if( !resharetask ) {
				this.redis.hset("sharetask", data.openId, sharetask);
				return api_success();
			}
			else {
				if ( sharetask.sharetime == resharetask.sharetime ) return api_success();
				else {
					this.redis.hset("sharetask", data.openId, sharetask);
					return api_success();
				}
			}
		} );
	}
	//用户任务列表
	_taskList(data){
		this.redis.hget("userintegrallist", data.openId, userintegrallist => {
			userintegrallist = userintegrallist || [];
			userintegrallist.unshift(data);
			this.redis.hset("userintegrallist", data.openId, userintegrallist);
			return;
		} );
	}
	//用户做实名认证任务
	_identityTaskUser(data){
		this.redis.hget("onetask", data.openId, resuseronetask => {
			if ( !resuseronetask || resuseronetask.identitytask != 2 ) this.redis.hget("user", data.openId, user => {
				if ( !user ) return api_error("4102");
				else { 
					this.redis.hget("onetask", data.openId, onetask => {
						let onetaskuser = {
							identitytask : 2
						};
						if ( !onetask ) {
							onetaskuser.phonetask = user.phone == null ? 0 : 1;
						}
						else {
							onetaskuser.phonetask = onetask.phonetask;
						}
						//更改用户积分数据redis
						user.integral += parseInt(data.integral);
						this.redis.hset("user", data.openId, user, updateUser => {
							//更改库里用户积分
							rlog("updateUserIntegral", user);
							this.redis.hset("onetask", data.openId, onetaskuser, useronetask => {
								//返回用户数据
								this._oneTask(data, true);
							} );
						} );
						//用户做实名认证任务写入库
						let identitytaskuser = {
							nickName : user.nickName,
							openid : data.openId,
							identitytask : 1,
							identityintegral : data.integral,
							identity_implDate : time().timeFormat("%Y-%m-%d")
						};
						rlog("oneTask", identitytaskuser);
						//储存积分记录列表redis
						let tasklistuser = {
							openId : data.openId,
							usertask : "实名认证",
							integral : data.integral,
							implDate : time().timeFormat()
						};
						this._taskList(tasklistuser);
						return;
					} );
				}
			} );
				else return api_error("6404");
		} );
	}
	//用户做绑定手机号任务
	_phoneTaskUser(data){
		this.redis.hget("onetask", data.openId, resuseronetask => {
			if ( !resuseronetask || resuseronetask.phonetask != 2 ) this.redis.hget("user", data.openId, user => {
				if ( !user ) return api_error("4102");
				else {
					this.redis.hget("identity", data.openId, identity => {
						let onetaskuser = {
							phonetask : 2
						};
						this.redis.hget("onetask", data.openId, onetask => {
							if ( !onetask ) {
								onetaskuser.identitytask = identity == null ? 0 : 1;
							}
							else {
								onetaskuser.identitytask = onetask.identitytask;
							}
							//更改用户积分数据redis
							user.integral += parseInt(data.integral);
							this.redis.hset("user", data.openId, user, updateUser => {
								//更改库里用户积分
								rlog("updateUserIntegral", user);
								this.redis.hset("onetask", data.openId, onetaskuser, useronetask => {
									//返回用户数据
									this._oneTask(data, true);
								} );
							} );
							//用户做绑定手机号认证任务写入库
							let phonetaskuser = {
								nickName : user.nickName,
								openid : data.openId,
								phonetask : 1,
								phoneintegral : data.integral,
								phone_implDate : time().timeFormat("%Y-%m-%d")
							};
							rlog("oneTask", phonetaskuser);
							//储存积分记录列表redis
							let tasklistuser = {
								openId : data.openId,
								usertask : "绑定手机号",
								integral : data.integral,
								implDate : time().timeFormat()
							};
							this._taskList(tasklistuser);
							return;
						} );
					} );
				}
			} );
				else return api_error("6404");
		} );
	}
	//用户做分享任务
	_shareTaskUser(data){
		let sharetask = {
			state : 2,
			sharetime : time().timeFormat("%Y-%m-%d")
		};
		this.redis.hget("sharetask", data.openId, usersharetask => {
			if ( !usersharetask || usersharetask.sharetime != sharetask.sharetime) this.redis.hget("user", data.openId, user => {
				if ( !user ) return api_error("4102");
				/*let sharetask = {
					state : 2,
					sharetime : time().timeFormat("%Y-%m-%d")
				};*/
				else {
					//更改用户积分数据redis
					user.integral += parseInt(data.integral);
					this.redis.hset("user", data.openId, user, updateUser => {
						//更改库里用户积分
						rlog("updateUserIntegral", user);
						this.redis.hset("sharetask", data.openId, sharetask, usersharetask => {
							this._shareTask(data, true);
						} );
					} );
					//用户做分享任务写入库
					let againtask = {
						nickName : user.nickName,
						openid : data.openId,
						sharetask : 1,
						sharetask_integral : data.integral,
						implDate : time().timeFormat("%Y-%m-%d")
					};
					rlog("againTask", againtask);
					//储存积分记录列表redis
					let tasklistuser = {
						openId : data.openId,
						usertask : "分享任务",
						integral : data.integral,
						implDate : time().timeFormat()
					};
					this._taskList(tasklistuser);
					return;
				}
			} );
				else return api_error("6400");
		} );
	}
	//用户做赚佣金任务
	_friendTaskUser(data){
		this.redis.hget("user", data.openId, user => {
			if ( !user ) return api_error("4102");
			else {
				//更新用户积分数据redis
				user.integral += parseInt(data.integral);
				this.redis.hset("user", data.openId, user, updateUser => {
					//更改库里用户积分
					rlog("updateUserIntegral", user);
					//删除好友充值赚的佣金
					this.redis.hget("friendtask", data.openId, newuserfriendArr => {
						if( newuserfriendArr ) newuserfriendArr.recursion((i, item, next) => {
							this.redis.hdel("friendtaskorder", newuserfriendArr[i], friendMoney => {
								next();
							} );
						}, over => {
							this._friendTask(data, true);
						} );
					} );
				} );
				//用户做赚佣金任务写入库
				let againtask = {
					nickName : user.nickName,
					openid : data.openId,
					friendtask : 1,
					friendtask_integral : data.integral,
					implDate : time().timeFormat("%Y-%m-%d")
				};
				rlog("againTask", againtask);
				//储存积分记录列表redis
				let tasklistuser = {
					openId : data.openId,
					usertask : "赚佣金",
					integral : data.integral,
					implDate : time().timeFormat()
				};
				this._taskList(tasklistuser);
				return;
			}
		} );
	}
	//用户做每日首充任务
	_rechargeTaskUser(data){
		let rechargetaskuser = {
			state : 2,
			ordertime : time().timeFormat("%Y-%m-%d")
		};
		this.redis.hget("rechargetask", data.openId, userrechargetask => {
			if ( !userrechargetask || userrechargetask.state == 1 ) this.redis.hget("user", data.openId, user => {
				if ( !user ) return api_error("4102");
				else {
					let rechargetaskuser = {
						state : 2,
						ordertime : time().timeFormat("%Y-%m-%d")
					};
					//更新用户积分数据
					user.integral += parseInt(data.integral);
					this.redis.hset("user", data.openId, user, updateUser => {
						//更改库里用户积分
						rlog("updateUserIntegral", user);
						this.redis.hset("rechargetask", data.openId, rechargetaskuser, userrechargetask => {
							this._rechargeTask(data, true);
						} );
					});
					//用户做每日首充任务写入库
					let againtask = {
						nickName : user.nickName,
						openid : data.openId,
						rechargetask : 1,
						rechargetask_integral : data.integral,
						implDate : time().timeFormat("%Y-%m-%d")
					};
					rlog("againTask", againtask);
					//储存积分记录列表redis
					let tasklistuser = {
						openId : data.openId,
						usertask : "每日首充",
						integral : data.integral,
						implDate : time().timeFormat()
					};
					this._taskList(tasklistuser);
					return;
				}
			} );
				else return api_error("6402");
		} );
	}
	//用户做签到任务
	_everydaySignUser(data,bool){
		this.redis.hget("user", data.openId, user => {
			if( !user ) return api_error("4102");
			else{
				let everydaysignuser = {
					signtime : time().timeFormat("%Y-%m-%d"),
					signstate : 1,
					signtimes : 1
				};
				this.redis.hget("everydaysign", data.openId, everydaysign => {
					if( !everydaysign || everydaysign.signtime != everydaysignuser.signtime ) {
						let beforetime = (time()-24*60*60).timeFormat("%Y-%m-%d");
						if ( !everydaysign || everydaysign.signtime != beforetime ) this.redis.hset("everydaysign", data.openId, everydaysignuser, usereverydaysign => {
							//更改用户redis积分
							user.integral += parseInt(data.integral);
							this.redis.hset("user", data.openId, user, updateUser => {
								//更改库里用户积分
								rlog("updateUserIntegral", user);
								this._everydaySign(data, true);
							} );
						} );
						else {
							if( everydaysign.signtimes == 6 ) everydaysign.signtimes = 0;
							else everydaysign.signtimes += 1;
							everydaysign.signtime = everydaysignuser.signtime;
							everydaysign.signstate = 1;
							this.redis.hset("everydaysign", data.openId, everydaysign, usereverydaysign => {
								//更改用户redis积分
								user.integral += parseInt(data.integral);
								this.redis.hset("user", data.openId, user, updateUser => {
									//更改库里用户积分
									rlog("updateUserIntegral", user);
									this._everydaySign(data, true);
								} );
							} );
						}
					}
					else return api_error("6403");
				} );
				//用户做签到任务写入库
				let againtask = {
					nickName : user.nickName,
					openid : data.openId,
					signintask : 1,
					signintask_integral : data.integral,
					implDate : time().timeFormat("%Y-%m-%d")
				};
				rlog("againTask", againtask);
				//储存积分记录列表redis
				let tasklistuser = {
					openId : data.openId,
					usertask : "签到",
					integral : data.integral,
					implDate : time().timeFormat()
				};
				this._taskList(tasklistuser);
				return;
			}
		} );
	}
}();