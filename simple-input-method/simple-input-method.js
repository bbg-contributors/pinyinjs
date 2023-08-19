/**
 * 简单的JS版输入法，拿来玩玩还而已，没有多大实际使用意义
 * simple-input-method.js
 */
var SimpleInputMethod = 
{
	hanzi: '', // 候选汉字
	pinyin: '', // 候选拼音
	doublePinyin: '', // 候选拼音的双拼格式，在程序运行过程中始终与this.pinyin保持同步
	result: [], // 当前匹配到的汉字集合
	pageCurrent: 1, // 当前页
	pageSize: 5, // 每页大小
	pageCount: 0, // 总页数
	doublePinyinModeEnabled: false,
	doublePinyinTypeIfEnabled: "",
	doublePinyinMapping: {
		"patterns": [
			{
				"patternName": "Xiaohe",
				"left": {
					"u": "sh",
					"i": "ch",
					"v": "zh"
				},
				"right": {
					"q": "iu",
					"w": "ei",
					"r": "uan",
					"t": ["ue", "ve"],
					"y": "un",
					"o": ["o", "uo"],
					"p": "ie",
					"s": ["iong", "ong"],
					"d": "ai",
					"f": "en",
					"g": "eng",
					"h": "ang",
					"j": "an",
					"k": ["ing", "uai"],
					"l": ["iang", "uang"],
					"z": "ou",
					"x": ["ia", "ua"],
					"c": "ao",
					"v": ["ui", "v"],
					"b": "in",
					"n": "iao",
					"m": "ian"
				},
				"conflictionSolutionList": {
					"t": {
						"ue": ["q", "y", "j", "l", "x", "n"],
						"ve": "else"
					},
					"o": {
						"uo": ["r", "t", "u", "i", "s", "d", "g", "h", "k", "l", "z", "c", "v", "n"],
						"o": "else"
					},
					"s": {
						"iong": ["q", "j", "x"],
						"ong": "else"
					},
					"k": {
						"ing": ["q", "t", "y", "p", "d", "j", "l", "x", "b", "n", "m"],
						"uai": "else"
					},
					"l": {
						"iang": ["q", "p", "j", "l", "x", "b", "n"],
						"uang": "else"
					},
					"x": {
						"ia": ["q", "p", "j", "x"],
						"ua": "else"
					},
					"v": {
						"ui": ["r", "t", "u", "i", "s", "d", "g", "h", "k", "z", "c", "v"],
						"v": "else"
					}
				}
			}
		]
	},
	convertSingleDoublePinyinCharToPinyin: function(char, leftOrRight, doublePinyinPatternType, previousCharInDoublePinyin) {
		if (leftOrRight === undefined || leftOrRight === null || leftOrRight !== "left" && leftOrRight !== "right") {
			throw new Error("必须指明传入的字符是声母还是韵母");
		}

		if (doublePinyinPatternType === undefined || doublePinyinPatternType === null) {
			throw new Error("必须指明双拼方案（例如“Xiaohe”）");
		}

		let doublePinyinPatterns = new Object();

		this.doublePinyinMapping.patterns.forEach((item) => {
			doublePinyinPatterns[item.patternName] = item;
		});


		if (doublePinyinPatterns[doublePinyinPatternType] === undefined || doublePinyinPatterns[doublePinyinPatternType] === null) {
			throw new Error("不支持此双拼方案");
		};

		let result = doublePinyinPatterns[doublePinyinPatternType][leftOrRight][char];

		if (result === undefined || result === null) {
			return char;
		} else {
			if (Array.isArray(result)) {
				// 字母对应多个韵母，需要判断是哪一个
				if (previousCharInDoublePinyin === undefined || previousCharInDoublePinyin === null) {
					throw new Error("无法根据声母判断选择哪一个韵母，必须传入previousChatInDoublePinyin来解决此问题");
				} else {
					let result;
					
					Object.keys(doublePinyinPatterns[doublePinyinPatternType].conflictionSolutionList[char]).forEach((item) => {
						if (Array.isArray(doublePinyinPatterns[doublePinyinPatternType].conflictionSolutionList[char][item])) {
							if (doublePinyinPatterns[doublePinyinPatternType].conflictionSolutionList[char][item].includes(previousCharInDoublePinyin)){
								result = item;
							}
						}
					});
					if (result === undefined || result === null){
						Object.keys(doublePinyinPatterns[doublePinyinPatternType].conflictionSolutionList[char]).forEach((item) => {
							if(doublePinyinPatterns[doublePinyinPatternType].conflictionSolutionList[char][item] === "else"){
								result = item;
							}
						});
					}
					if (result === undefined || result === null){
						throw new Error("无法根据conflictionSolutionList中的信息判断选择哪一个韵母");
					}
					return result;
				}
			} else {
				return result;
			}
		}
	},
	/**
	 * 初始化字典配置
	 */
	initDict: function()
	{
		var dict = pinyinUtil.dict;
		if(!dict.py2hz) throw '未找到合适的字典文件！';
		// 这一步仅仅是给字母a-z扩充，例如根据b找不到相关汉字，就把bi的结果赋值给b
		// 当然这种方式只是很简单的实现，真正的拼音输入法肯定不能这么简单处理
		dict.py2hz2 = {};
		dict.py2hz2['i'] = 'i'; // i比较特殊，没有符合的汉字，所以特殊处理
		for(var i=97; i<=123; i++)
		{
			var ch = String.fromCharCode(i);
			if(!dict.py2hz[ch])
			{
				for(var j in dict.py2hz)
				{
					if(j.indexOf(ch) == 0)
					{
						dict.py2hz2[ch] = dict.py2hz[j];
						break;
					}
				}
			}
		}
	},
	/**
	 * 初始化DOM结构
	 */
	initDom: function()
	{
		var temp = '<div class="pinyin"></div><div class="result"><ol></ol><div class="page-up-down"><span class="page-up">▲</span><span class="page-down">▼</span></div></div>';
		var dom = document.createElement('div');
		dom.id = 'simle_input_method';
		dom.className = 'simple-input-method';
		dom.innerHTML = temp;
		var that = this;
		// 初始化汉字选择和翻页键的点击事件
		dom.addEventListener('click', function(e)
		{
			var target = e.target;
			if(target.nodeName == 'LI') that.selectHanzi(parseInt(target.dataset.idx));
			else if(target.nodeName == 'SPAN')
			{
				if(target.className == 'page-up' && that.pageCurrent > 1)
				{
					that.pageCurrent--;
					that.refreshPage();
				}
				else if(target.className == 'page-down' && that.pageCurrent < that.pageCount)
				{
					that.pageCurrent++;
					that.refreshPage();
				}
			}
		})
		document.body.appendChild(dom);
	},
	/**
	 * 初始化
	 */
	init: function(selector, doublePinyinModeEnabled = false, doublePinyinTypeIfEnabled)
	{
		this.initDict();
		this.initDom();
		obj = document.querySelectorAll(selector);
		this._target = document.querySelector('#simle_input_method');
		this._pinyinTarget = document.querySelector('#simle_input_method .pinyin');
		this._resultTarget = document.querySelector('#simle_input_method .result ol');
		var that = this;
		if (doublePinyinModeEnabled) {
			this.doublePinyinModeEnabled = true;
			if (doublePinyinTypeIfEnabled === undefined || doublePinyinTypeIfEnabled === null) {
				throw new Error("You need to specify double pinyin type if you enabled double pinyin mode!");
			} else {
				this.doublePinyinTypeIfEnabled = doublePinyinTypeIfEnabled;
			}
		}
		for(var i=0; i<obj.length; i++)
		{
			obj[i].addEventListener('keydown', function(e)
			{
				var keyCode = e.keyCode;
				var preventDefault = false;
				if(keyCode >= 65 && keyCode <= 90) // A-Z
				{
					that.addChar(String.fromCharCode(keyCode+32), this);
					preventDefault = true;
				}
				else if(keyCode == 8 && that.pinyin) // 删除键
				{
					that.delChar();
					preventDefault = true;
				}
				else if(keyCode >= 48 && keyCode <= 57 && !e.shiftKey && that.pinyin) // 1-9
				{
					that.selectHanzi(keyCode-48);
					preventDefault = true;
				}
				else if(keyCode == 32 && that.pinyin) // 空格
				{
					that.selectHanzi(1);
					preventDefault = true;
				}
				else if(keyCode == 33 && that.pageCount > 0 && that.pageCurrent > 1 || keyCode == 189 && that.pageCount > 0 && that.pageCurrent > 1 || keyCode == 173 && that.pageCount > 0 && that.pageCurrent > 1) // 上翻页
				{
					that.pageCurrent--;
					that.refreshPage();
					preventDefault = true;
				}
				else if(keyCode == 34 && that.pageCount > 0 && that.pageCurrent < that.pageCount || keyCode == 187 && that.pageCount > 0 && that.pageCurrent < that.pageCount || keyCode == 61 && that.pageCount > 0 && that.pageCurrent < that.pageCount) // 下翻页
				{
					that.pageCurrent++;
					that.refreshPage();
					preventDefault = true;
				}
				else if(keyCode === 33 || keyCode === 189 || keyCode === 173 || keyCode === 34 || keyCode === 187 || keyCode === 61) {
					preventDefault = true;
				}
				if(preventDefault) e.preventDefault();
			});
			obj[i].addEventListener('focus', function()
			{
				// 如果选中的不是当前文本框，隐藏输入法
				if(that._input !== this) that.hide();
			});
		}
	},
	/**
	 * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
	 */
	getSingleHanzi: function(pinyin)
	{
		return pinyinUtil.dict.py2hz2[pinyin] || pinyinUtil.dict.py2hz[pinyin] || '';
	},
	/**
	 * 拼音转汉字
	 * @param pinyin 需要转换的拼音，如 zhongguo
	 * @return 返回一个数组，格式类似：[["中","重","种","众","终","钟","忠"], "zhong'guo"]
	 */
	getHanzi: function(pinyin)
	{
		var result = this.getSingleHanzi(pinyin);
		if(result) return [result.split(''), pinyin];
		var temp = '';
		for(var i=0, len = pinyin.length; i<len; i++)
		{
			temp += pinyin[i];
			result = this.getSingleHanzi(temp);
			if(!result) continue;
			// flag表示如果当前能匹配到结果、并且往后5个字母不能匹配结果，因为最长可能是5个字母，如 zhuang
			var flag = false;
			if((i+1) < pinyin.length)
			{
				for(var j=1, len = pinyin.length; j<=5 && (i+j)<len; j++)
				{
					if(this.getSingleHanzi(pinyin.substr(0, i+j+1)))
					{
						flag = true;
						break;
					}
				}
			}
			if(!flag) return [result.split(''), pinyin.substr(0, i+1) + "'" + pinyin.substr(i+1)];
		}
		return [[], '']; // 理论上一般不会出现这种情况
	},
	/**
	 * 选择某个汉字，i有效值为1-5
	 */
	selectHanzi: function(i)
	{
		var hz = this.result[(this.pageCurrent - 1) * this.pageSize + i - 1];
		if(!hz) return;
		this.hanzi += hz;
		var idx = this.pinyin.indexOf("'");
		if(idx > 0)
		{
			this.pinyin = this.pinyin.substr(idx+1);
			this.refresh();
		}
		else // 如果没有单引号，表示已经没有候选词了
		{
			this._input.value += this.hanzi;
			this.hide();
		}
	},
	/**
	 * 将拼音转换成汉字候选词，并显示在界面上
	 */
	refresh: function()
	{
		var temp = this.getHanzi(this.pinyin.replace(/'/g, ''));
		this.result = temp[0];
		this.pinyin = temp[1];
		var count = this.result.length;
		this.pageCurrent = 1;
		this.pageCount = Math.ceil(count / this.pageSize);
		this._pinyinTarget.innerHTML = this.hanzi + this.pinyin;
		this.refreshPage();
	},
	refreshPage: function()
	{
		var temp = this.result.slice((this.pageCurrent-1)*this.pageSize, this.pageCurrent*this.pageSize);
		var html = '';
		var i = 0;
		temp.forEach(function(val)
		{
			html += '<li data-idx="'+(++i)+'">' + val + '</li>';
		});
		this._target.querySelector('.page-up').style.opacity = this.pageCurrent > 1 ? '1' : '.3';
		this._target.querySelector('.page-down').style.opacity = this.pageCurrent < this.pageCount ? '1' : '.3';
		this._resultTarget.innerHTML = html;
	},
	addChar: function(ch, obj)
	{
		if(this.pinyin.length == 0) // 长度为1，显示输入法
		{
			this.show(obj);
		}
		if (this.doublePinyinModeEnabled) {
			if(this.pinyin.length === 0){
				this.pinyin += this.convertSingleDoublePinyinCharToPinyin(ch, "left", this.doublePinyinTypeIfEnabled);
			} else {
				if (this.doublePinyin.length % 2 === 0){
					// 已有双拼长度为偶数，证明没有输入声母，此时输入的是声母
					this.pinyin += this.convertSingleDoublePinyinCharToPinyin(ch, "left", this.doublePinyinTypeIfEnabled);
				} else {
					// 输入韵母
					this.pinyin += this.convertSingleDoublePinyinCharToPinyin(ch, "right", this.doublePinyinTypeIfEnabled, this.doublePinyin[this.doublePinyin.length-1]);
				}
			}
			this.doublePinyin += ch;
		} else {
			this.pinyin += ch;
		}
		this.refresh();
	},
	delChar: function()
	{
		if(this.pinyin.length <= 1)
		{
			if (this.doublePinyinModeEnabled) {
				this.doublePinyin = "";
			}
			this.hide();
			return;
		}
		if (this.doublePinyinModeEnabled) {
			let lastSegment = this.doublePinyin[this.doublePinyin.length-1];
			if (this.doublePinyin.length % 2 === 0){
				// 删除的是韵母
				this.pinyin = this.pinyin.substr(0, this.pinyin.length-this.convertSingleDoublePinyinCharToPinyin(lastSegment, "right", this.doublePinyinTypeIfEnabled, this.doublePinyin[this.doublePinyin.length-1]).length);
			} else {
				// 删除的是声母
				this.pinyin = this.pinyin.substr(0, this.pinyin.length-this.convertSingleDoublePinyinCharToPinyin(lastSegment, "left", this.doublePinyinTypeIfEnabled).length);
			}
			if (this.doublePinyin.length === 1) {
				this.doublePinyin = "";
			} else {
				this.doublePinyin = this.doublePinyin.substr(0, this.doublePinyin.length-1);
			}
		} else {
			this.pinyin = this.pinyin.substr(0, this.pinyin.length-1);
		}
		this.refresh();
	},
	show: function(obj)
	{
		var pos = obj.getBoundingClientRect();
		this._target.style.left = pos.left + 'px';
		this._target.style.top = pos.top + pos.height + document.body.scrollTop + 'px';
		this._input = obj;
		this._target.style.display = 'block';
	},
	hide: function()
	{
		this.reset();
		this._target.style.display = 'none';
	},
	reset: function()
	{
		this.hanzi = '';
		this.pinyin = '';
		this.result = [];
		this.pageCurrent = 1;
		this.pageCount = 0;
		this._pinyinTarget.innerHTML = '';
	}
};