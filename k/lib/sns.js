const CURLS = LOAD.library("curls");
const CONFIG = LOAD.config();
class Sns {
	constructor() {
		this.redis = LOAD.redis();
	}
	sendcode(data,success,error) {
		let openid = data.openid;
		let tel = data.tel;
		if ( !success ) success = function(datas) {
			api_success(datas);
		};
		if ( !error ) error = function(errcode,msg) {
			api_error(errcode,msg);
		};
		this.redis.hget("snscode", openid, snscode => {
			let code = rand(0,999999).leading(6);
			if ( snscode ) {
				let last = time() - snscode.time;
				if ( last < 60 ) return error(5101,60 - last);
				else if ( snscode.to5m >= 3 ) return error(5102);
				else if ( snscode.to15m >= 10 ) return error(5103);
				else if ( snscode.tohour >= 20 ) return error(5104);
				else if ( snscode.today >= 50 ) return error(5105);
				let thatday = day(snscode.time);
				snscode.tel = tel;
				snscode.code = code;
				snscode.time = time();
				snscode.to5m = last > 300 ? 1 : snscode.to5m + 1;
				snscode.to15m = last > 900 ? 1 : snscode.to15m + 1;
				snscode.tohour = last > 3600 ? 1 : snscode.tohour + 1;
				snscode.today = thatday == day() ? snscode.today + 1 : 1;
				snscode.state = 0;
			}
			else snscode = {
				tel : tel,
				code : code,
				time : time(),
				to5m : 1,
				to15m : 1,
				tohour : 1,
				today : 1,
				state : 0
			};
			this.redis.hset("snscode",openid,snscode);
			CURLS.option( {
				auth : `api:key-${CONFIG.sns.key}`
			} ).post("https://sms-api.luosimao.com/v1/send.json", {
				mobile : tel,
				message : `您的验证码是${code}，请尽快完成验证。【潮人微游】`
			}, res => {
				if ( res.error == 0 ) success(res);
				else error(5106,res);
			} );
		} );
	}
	validate(data,success,error) {
		let openid = data.openid;
		let tel = data.tel;
		let code = data.code;
		if ( !success ) success = function() {
			api_success();
		};
		if ( !error ) error = function(errcode,msg) {
			api_error(errcode,msg);
		};
		this.redis.hget("snscode", openid, snscode => {
			if ( !snscode ) return error(5107);
			else if ( snscode.tel != tel || snscode.code != code ) {
				snscode.state = 2;
				this.redis.hset("snscode",openid,snscode);
				return error(5107);
			}
			else if ( snscode.state != 0 || time() - snscode.time > 300 ) {
				snscode.state = 2;
				this.redis.hset("snscode",openid,snscode);
				return error(5108);
			}
			else {
				snscode.state = 1;
				this.redis.hset("snscode",openid,snscode);
				return success();
			}
		} );
	}
}
module.exports = Sns;