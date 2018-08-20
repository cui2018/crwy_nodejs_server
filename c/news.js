module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//新闻列表
	newslist() {
		if ( !post(data => {
			this._fiandnews();
		} ) ) end("Param Error!");
	}
	//查询资讯列表
	_fiandnews(){
		let redis = LOAD.redis();
		redis.get("news", news => {
			if ( !news ) return api_error("5003");
			else {
				news.recursion((i,item,next) => {
					item.id = encrypt(String(item.id));
					next();
				}, over => {
					return api_success(news);
				} );
			}
		} );
	}
}();