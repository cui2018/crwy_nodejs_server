const SNS = LOAD.library("sns");
module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	index() {
		if ( !post(data => {
			SNS.validate( {
				openid : data.openid,
				tel : data.tel,
				code : data.code
			}, e => {
				this.redis.hget("user", data.openid, user => {
					user.phone = data.tel;
					user.trueName = data.name;
					this.redis.hset("user",data.openid,user);
					rlog("updateUserinfoTel",data);
					this.redis.hget("onetask", data.openid, onetask => {
						if ( onetask ) {
							let onetaskuser = {
								phonetask : 1,
								identitytask : onetask.identitytask
							};
							this.redis.hset("onetask", data.openid, onetaskuser);
						}
					} );
					api_success( {
						phonetask : 1
					} );
				} );
			} );
		} ) ) end("Param Error!");
	}
}();