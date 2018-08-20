module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	goodslist(){
		if ( !post(data => {
			if ( !data.openId ) return api_error("5001");
			this._goodsList(data);
		} ) ) end("Param Error!");
	}
	_goodsList(data){
		this.redis.hget("usergoodslist", data.openId, usergoodslist => {
			usergoodslist = usergoodslist || [];
			usergoodslist.recursion((i,item,next) => {
				delete item.goodsInfo.goodsNum;
				delete item.goodsInfo.goodsReceive;
				delete item.goodsInfo.integral;
				next();
			}, over => {
				return api_success(usergoodslist);
			} );
		} );
	}
}();