module.exports = new class extends Controller {
	constructor() {
		super();
	}
	//用户反馈搜索游戏
	searchgame(){
		if( !post(data => {
			if ( !data.gameName ) return api_error("5101");
			this._searchGame(data);
		} ) ) end("Param Error!");
	}
	//用户游戏体验反馈
	gameexperience(){
		if( !post(data => {
			if ( !data.openid || !data.gameid || !data.gamearea || !data.usergamename || !data.question ) return api_error("5001");
			this._gameExperience(data);
		} ) ) end("Param Error!");
	}
	//用户充值问题
	gamepayques(){
		if( !post(data => {
			if ( !data.openid || !data.gameid || !data.gamearea || !data.usergamename || !data.paytime ) return api_error("5001");
			this._gamePayQues(data);
		} ) ) end("Param Error!");
	}
	//游戏建议
	gameadvise(){
		if( !post(data => {
			if ( !data.openid || !data.gameadvise || !data.wxname ) return api_error("5001");
			this._gameAdvise(data);
		} ) ) end("Param Error!");
	}
	//涉嫌返利、分销代理问题
	rebate(){
		if( !post(data => {
			if ( !data.openid || !data.QDName || !data.describe ) return api_error("5001");
			this._rebate(data);
		} ) ) end("Param Error!");
	}
	//招募兼职（刷单）骗钱
	foolmoney(){
		if( !post(data => {
			if ( !data.openid || !data.QDName || !data.describe ) return api_error("5001");
			this._foolMoney(data);
		} ) ) end("Param Error!");
	}
	//色情赌博
	gambling(){
		if( !post(data => {
			if ( !data.openid || !data.gamingname || !data.describe ) return api_error("5001");
			this._gambling(data);
		} ) ) end("Param Error!");
	}
	//诱导付款
	passivemoney(){
		if( !post(data => {
			if ( !data.openid || !data.QDName || !data.describe ) return api_error("5001");
			this._passiveMoney(data);
		} ) ) end("Param Error!");
	}
	//其他反馈
	otherfeedback(){
		if( !post(data => {
			if ( !data.openid || !data.wxname || !data.describe ) return api_error("5001");
			this._otherFeedBack(data);
		} ) ) end("Param Error!");
	}
	//用户反馈搜索游戏
	_searchGame(data) {
		let mysql = LOAD.mysql();
		mysql.get("gameinfo", {
			"gameName LIKE" : data.gameName
		}, "sort DESC", "", "id gameid,gameName",gameinfo => {
			mysql.close();
			if( !gameinfo ) return api_error("5302");
			return api_success(gameinfo);
		});
	}
	//用户游戏体验反馈
	_gameExperience(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addGameExperience", resdata);
		});
		return api_success("提交成功");
	}
	//用户充值问题
	_gamePayQues(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addGamePayQues", resdata);
		});
		return api_success("提交成功");
	}
	//游戏建议
	_gameAdvise(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addGameAdvise", resdata);
		});
		return api_success("提交成功");
	}
	//涉嫌返利、分销代理问题
	_rebate(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addRebate", resdata);
		});
		return api_success("提交成功");
	}
	//招募兼职（刷单）骗钱
	_foolMoney(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addFoolMoney", resdata);
		});
		return api_success("提交成功");
	}
	//色情赌博
	_gambling(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addGambling", resdata);
		});
		return api_success("提交成功");
	}
	//诱导付款
	_passiveMoney(data){
		this._dealWithData.call(this, data, resdata => {
			if(resdata) rlog("addPassiveMoney", resdata);
		});
		return api_success("提交成功");
	}
	//其他
	_otherFeedBack(data){
		data.imgArr = [];
		if ( data.img ) data.imgArr = data.img.split("%%");
		if (data.imgArr.length > 0) data.imgArr.pop();
		rlog("addOtherFeedBack", data);
		return api_success("提交成功");
	}
	//数据处理
	_dealWithData(data,fn){
		let redis = LOAD.redis();
		redis.hget("user", data.openid, user => {
			data.nickName = user.nickName;
			data.imgArr = [];
			if ( data.img ) data.imgArr = data.img.split("%%");
			if (data.imgArr.length > 0) data.imgArr.pop();
			if(fn) fn(data);
		});
	}
}();