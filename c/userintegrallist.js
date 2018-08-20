module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	integrallist(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._integralList(data);
		} ) ) end("Param Error!");
	}
	_integralList(data){
		this.redis.hget("userintegrallist", data.openId, userintegrallist => {
			userintegrallist = userintegrallist || [];
			userintegrallist.recursion((i,item,next) => {
				delete item.openId;
				next();
			}, over => {
				return api_success(userintegrallist);
			} );
		} );
	}
}();