const XML = LOAD.library("xml");
const MD5 = LOAD.library("md5");
const CURLS = LOAD.library("curls");
const CONFIG = LOAD.config();
const S = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
module.exports = new class extends Controller {
	constructor() {
		super();
	}
	index() {
		if ( !post(data => {
			let signs = {
				uid : data.uid,
				appkey : data.appkey,
				gameid : data.gameid,
				money : data.money,
				backurl : decodeURIComponent(data.backurl),
				sellerorder : data.sellerorder,
				time : data.time,
				userip : data.userip,
				key : "xiaoluo&xiaoluo"
			};
			let signature = MD5.en(signs.serialize());
			if ( signature != data.sign ) return api_error(5004,"签名错误~");
			let nonce_str = this._getNonce();
			let out_trade_no = newOrderId();
			let sign = MD5.en(`appid=${CONFIG.wechat.appid}&attach=${data.describe}&body=${CONFIG.wechat.body}&detail=${data.describe}&device_info=WEB&mch_id=${CONFIG.wechat.mchid}&nonce_str=${nonce_str}&notify_url=${CONFIG.wechat.notify}&openid=${data.uid}&out_trade_no=${out_trade_no}&total_fee=${data.money*100}&trade_type=JSAPI&key=${CONFIG.wechat.key}`);
			let param = {
				appid : CONFIG.wechat.appid,
				mch_id : CONFIG.wechat.mchid,
				device_info : "WEB",
				nonce_str : nonce_str,
				sign : sign,
				body : CONFIG.wechat.body,
				detail : data.describe,
				attach : data.describe,
				out_trade_no : out_trade_no,
				total_fee : data.money * 100,
				notify_url : CONFIG.wechat.notify,
				trade_type : "JSAPI",
				openid : data.uid
			};
			let xml = XML.encode(param);
			CURLS.post("https://api.mch.weixin.qq.com/pay/unifiedorder", xml, res => {
				XML.decode(res, result => {
					if ( result.xml.return_code == "SUCCESS" && result.xml.result_code == "SUCCESS" ) {
						let mysql = LOAD.mysql().one("gameinfo", {
							gameid : data.gameid,
						}, "gameName,id", "", gameinfo => {
							mysql.close();
							//通知游戏商签名
							let backsigns = {
								uid : data.uid,
								appkey : data.appkey,
								gameid : data.gameid,
								money : data.money,
								orderid : out_trade_no,
								sellerorder : data.sellerorder,
								state : 1,
								time : data.time,
								userip : data.userip,
								key : "xiaoluo&xiaoluo"
							};
							let beforesign = backsigns.serialize();
							let redis = LOAD.redis();
							redis.hget("user", data.uid, userinfo => {
								delete backsigns.key;
								backsigns.describe = data.describe;
								redis.hget("distributor", userinfo.qd, resdistributor => {
									let userorder = {
										userip : data.userip,
										gameid : data.gameid,
										orderNum : out_trade_no, //订单号
										orderUserId : data.uid, //用户openid
										orderDescriptor : data.describe, //商品描述
										orderMoney : data.money, //商品金额
										orderGameId : gameinfo.id, //游戏gameid
										orderGameName : gameinfo.gameName, //游戏名字
										orderProvider : data.appkey, //游戏商appkey
										orderIntegral : data.money * 10, //订单积分
										orderPrNum : data.sellerorder, //游戏商订单号
										orderBackUrl : decodeURIComponent(data.backurl), //游戏商回调地址
										orderSignBefore : beforesign, //游戏商参数签名前与签名后sign
										orderDate : time().timeFormat(), //订单时间
										orderBackMe : "", //游戏商发货完成后回调信息
										orderUser : {
											id : userinfo.id,
											nickName : userinfo.nickName,
											openId : data.uid,
											headImgUrl : userinfo.headImgUrl,
											vipId : userinfo.vipId,
											qd : userinfo.qd,
											loginQD : userinfo.loginQD
										}, //订单用户信息
										orderQD : "PT" //用户订单公众号渠道
									};
									let userorderQD = "";
									function updateQD(dis,fn) {
										//用户渠道错误（未合作状态）,订单默认平台
										if ( !dis ) {
											userorderQD = "PT";
											fn(userorderQD);
										}
										else {
											//区分用户是否为公司用户
											if ( dis.busQDNum == 0 ) {
												userorderQD = userinfo.qd || "PT";
												fn(userorderQD);
											}
											else LOAD.redis().hget("distributor", userinfo.updateQD, resqd => {
												//用户登录渠道有误,订单默认平台
												if ( !resqd ) userorderQD = "PT";
												else {
													if ( resqd.busQDNum == 0 ) userorderQD = userinfo.qd || "PT";
													else userorderQD = userinfo.updateQD;
												}
												fn(userorderQD);
											} );
										}
									}
									updateQD(resdistributor, userorderQD => {
										userorder.orderQD = userorderQD;
										//订单信息存入数据库中
										rlog("addUserOrder",userorder);
										//存储订单redis
										LOAD.redis().hset("ordering",out_trade_no,userorder);
									} );
								} );
							} );
						} );
						let pack = "prepay_id=" + result.xml.prepay_id;
						let timestamp = time();
						api_success( {
							appId : CONFIG.wechat.appid,
							timeStamp : timestamp,
							nonceStr : nonce_str,
							package : pack,
							sign : MD5.en(`appId=${CONFIG.wechat.appid}&nonceStr=${nonce_str}&package=${pack}&signType=MD5&timeStamp=${timestamp}&key=${CONFIG.wechat.key}`)
						} );
					}
					else api_error(5201,result.xml.err_code);
				} );
			} );
		} ) ) end("Param Error!");
	}
	notify() {
		if ( !post(xml => {
			XML.decode(xml, data => {
				if ( !data ) return this._fail("参数错误");
				data = data.xml;
				if ( !data ) return this._fail("参数错误");
				let redis = LOAD.redis();
				redis.hget("ordering", data.out_trade_no, order => {
					if ( !order ) return this._fail("订单不存在");
					let sign = MD5.up(`appid=${CONFIG.wechat.appid}&attach=${order.orderDescriptor}&bank_type=${data.bank_type}&cash_fee=${order.orderMoney * 100}&device_info=WEB&fee_type=${data.fee_type}&is_subscribe=${data.is_subscribe}&mch_id=${CONFIG.wechat.mchid}&nonce_str=${data.nonce_str}&openid=${order.orderUserId}&out_trade_no=${data.out_trade_no}&result_code=${data.result_code}&return_code=${data.return_code}&time_end=${data.time_end}&total_fee=${order.orderMoney * 100}&trade_type=JSAPI&transaction_id=${data.transaction_id}&key=${CONFIG.wechat.key}`);
					if ( sign != data.sign ) return this._fail("签名错误");
					//删除订单redis
					redis.hdel("ordering",data.out_trade_no);
					//通知游戏方发货~
					let orderBackMeRes = "";
					function orderBack(n) {
						if ( n >= 3 ) {
							let userorderres = {
								state : 0,
								orderNum : data.out_trade_no,
								orderBackMe : orderBackMeRes.replace(/'/g,'"'),
								orderSuccessDate : time().timeFormat()
							}
							rlog("updateUserOrder", userorderres);
							this._fail("支付失败");
							return;
						}
						let http = {
							http : "curl",
							https : "curls"
						};
						let backsigns = {
								uid : order.orderUserId,
								appkey : order.orderProvider,
								gameid : order.gameid,
								money : order.orderMoney,
								orderid : order.orderNum,
								sellerorder : order.orderPrNum,
								state : 1,
								time : new Date().getTime(),
								userip : order.userip,
								key : "xiaoluo&xiaoluo"
						};
						let beforesign = backsigns.serialize();
						let backsign = MD5.en(beforesign);
						let curl = LOAD.library(http[order.orderBackUrl.split(":")[0]]);
						curl.get(order.orderBackUrl+"?"+backsigns.serialize()+"&sign="+backsign, res => {
							orderBackMeRes += JSON.stringify(res);
							if(res.state != 1) orderBack.call(this,n + 1);
							else{
								//更改用户订单状态和游戏戏商返回信息
								let userorderres = {
									state : 1,
									orderNum : data.out_trade_no,
									orderBackMe : orderBackMeRes.replace(/'/g,'"'),
									orderSuccessDate : time().timeFormat()
								}
								rlog("updateUserOrder", userorderres);
								this._success();
								return;
							}
						});
					}
					orderBack.call(this,0);
				} );
			} );
		} ) ) end("Param Error!");
	}
	_getNonce() {
		let nonce_str = "";
		for ( let i = 0; i < 16; i++ ) {
			nonce_str += S.substr(rand(0,S.length - 1),1).toString();
		}
		return nonce_str;
	}
	_success() {
		let xml = XML.encode( {
			return_code : "SUCCESS",
			return_msg : "OK"
		} );
		end(xml);
	}
	_fail(msg) {
		let xml = XML.encode( {
			return_code : "FAIL",
			return_msg : msg
		} );
		end(xml);
	}
}();