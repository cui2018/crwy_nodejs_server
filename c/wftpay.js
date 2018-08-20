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
			let out_trade_no = newOrderId();
			//查询游戏支付数据gamepay
			let redis = LOAD.redis();
			redis.hget("gamepay", data.gameid, gamepay => {
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
							orderGameId : gamepay.id || 236, //游戏gameid
							orderGameName : gamepay.gameName || "潮人游戏", //游戏名字
							orderProvider : data.appkey, //游戏商appkey
							orderIntegral : data.money * 20, //订单积分
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
								else redis.hget("distributor", userinfo.updateQD, resqd => {
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
							redis.hset("ordering",out_trade_no,userorder);
						} );
					} );
				} );
				let gamepayname = gamepay.gameName || "潮人游戏";
				let param = {
					out_trade_no : out_trade_no,
					sub_appid : CONFIG.wechat.appid,
					sub_openid : data.uid == 'ot9Ek06-uJLCQfEgixG4uRTvpSJM' ? 'ot9Ek0_Juh6jaGHstyppSKKAm5Y0' : data.uid,
					service : "pay.weixin.jspay",
					version : "2.0",
					charset : "UTF-8",
					sign_type : "MD5",
					is_raw : 1,
					mch_id : "105590060598",
					notify_url : CONFIG.wechat.wftpaynotify,
					nonce_str : out_trade_no,
					total_fee : data.money * 100,//单位分
					mch_create_ip : data.userip,
					body : "潮人微游" + gamepayname + "游戏" + data.describe,
					describe : "潮人微游"+ gamepayname + "游戏" + data.describe,
					attach : "潮人微游" + gamepayname + "游戏" + data.describe,
					sellerorder : data.sellerorder
				};
				//过滤第三方银行参数
				param.recursion((i,item,next) => {
					if( item == null || item == "" || i.toLowerCase() == "sign") {
						delete param[i];
						next();
					}
					else next();
				}, over => {
					//属性排序
					let newObj = this._objKeySort(param);
					let num = out_trade_no.charAt(out_trade_no.length-1);
					if( num % 2 == 0 ) newObj = this._xysign(newObj);
					else newObj = this._zxsigin(newObj);
					let xml = XML.encode(newObj);
					//通知第三方银行
					CURLS.post("https://pay.swiftpass.cn/pay/gateway", xml, resWFT =>{
						XML.decode(resWFT, result =>{
							if("0" == result.xml.result_code && "0" == result.xml.status){
								let resWX = JSON.parse(result.xml.pay_info.toString());
								//返回前端参数（微信）
								return api_success({
									appId : resWX.appId,
									timeStamp : resWX.timeStamp,
									nonceStr : resWX.nonceStr,
									package : resWX.package,
									paySign : resWX.paySign,
									signType : resWX.signType
								});
							}else{
								return api_error("4000");
							}
						});
					});
				});
			} );
		} ) ) end("Param Error!");
	}
	notify() {
		if ( !post(xml => {
			XML.decode(xml, data => {
				if ( !data ) return "data_error";
				data = data.xml;
				if ( !data ) return "xml_error";
				if ( !data.sign ) return "sign_error";
				let redis = LOAD.redis();
				redis.hget("ordering", data.out_trade_no, order => {
					if ( !order ) return "orderNum_error";
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
							return "order_fail";
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
								userip : order.userip
						};
						let beforesign = backsigns.serialize()+"&key=xiaoluo&xiaoluo";
						let backsign = MD5.en(beforesign);
						let curl = LOAD.library(http[order.orderBackUrl.split(":")[0]]);
						curl.get(order.orderBackUrl+"?"+backsigns.serialize()+"&sign="+backsign+"&describe=crwygame", res => {
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
								//更改用户积分
								redis.hget("user", order.orderUserId, user => {
									user.integral += parseInt(order.orderIntegral);
									redis.hset("user", order.orderUserId, user);
									//更改数据库数据
									rlog("updateUserIntegral", user);
								} );
								//存入用户今日首充订单任务redis中
								redis.hget("rechargetaskorder", order.orderUserId, orderArr => {
									if( !orderArr || orderArr != time().timeFormat("%Y-%m-%d") ) redis.hset("rechargetaskorder", order.orderUserId, time().timeFormat("%Y-%m-%d"));
								});
								//好友充值任务
								redis.hget("newuserfriend", order.orderUserId, newuserfriend => {
									if( newuserfriend ) redis.hget("friendtaskorder", order.orderUserId, friendtaskMoney => {
										friendtaskMoney = friendtaskMoney == null ? order.orderMoney : friendtaskMoney + order.orderMoney;
										redis.hset("friendtaskorder", order.orderUserId, friendtaskMoney);
									} );
								} );
								return "success";
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
	//对象属性排序
	_objKeySort(obj){
		let newkey = Object.keys(obj).sort();
		let newObj = {};
		newkey.recursion((i,item,next) => {
			newObj[newkey[i]] = obj[newkey[i]];
			next();
		}, over => {
			
		} );
		return newObj;
	}
	/**
	 * 兴业银行支付加密验签处理
	 * @param obj
	 * @returns {obj}
	 */
	_xysign(obj){
		obj.mch_id = CONFIG.wechat.XYNum;
		obj.sign_type = "MD5";
		obj.sign = MD5.up(obj.serialize()+"&key="+CONFIG.wechat.XYkey);
		return obj;
	}
	/**
	 * 中信银行支付加密验签处理
	 * @param obj
	 * @returns {obj}
	 */
	_zxsigin(obj){
		obj.mch_id = CONFIG.wechat.ZXNum;
		obj.sign_type = "RSA_1_256";
		let privatekey = CONFIG.wechat.ZXkey;
		let CRYPTO = require('crypto');
		privatekey = this._insert_str(privatekey, '\n', 64);
		privatekey = "-----BEGIN RSA PRIVATE KEY-----\n" + privatekey + "-----END RSA PRIVATE KEY-----";
		let sign = CRYPTO.createSign('RSA-SHA256');
		sign.update(obj.serialize(),'utf-8');
		obj.sign = sign.sign(privatekey,'base64');
		return obj;
	}
	/**
	* 在指定位置插入字符串
	* @param str
	* @param insert_str
	* @param sn
	* @returns {string}
	*/
	_insert_str(str, insert_str, sn) {
	    let newstr = "";
	    for (let i = 0; i < str.length; i += sn) {
	        let tmp = str.substring(i, i + sn);
	        newstr += tmp + insert_str;
	    }
	    return newstr;
	}
}();