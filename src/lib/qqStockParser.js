var request = require('request');
var cheerio = require('cheerio');

/**
 * QQStockParser class
 */
function QQStockParser() {
  this.base_url = 'http://stock.finance.qq.com';
  this.list_url = '/sstock/view/show.php';
  this.item_detail_url = '/corp1/distri.php';
  this.db = {
    list: {},
    detail: {}
  };

  /**
   * 0: idle
   * 1: updating groups
   * 2: updating apps in group
   * 3: updating apps in all groups
   */
  this.STATE_IDLE = 0;
  this.STATE_UPDATING_LIST = 1;
  this.STATE_UPDATING_ITEM_DETAIL = 2;

  this.state = this.STATE_IDLE;

  /**
   * add data listener
   *
   */
  this.on('data_stockListPage', function(list) {
    console.log(list['result'].length);
  })

}

//具有事件驱动功能
require('util').inherits(QQStockParser, require('events').EventEmitter);

/**
 * get app groups
 *
 * @param [boolean] force need force update?
 */
QQStockParser.prototype.getStockList = function(type) {
  this.getStockListAtOnePage(type, 1)
  this.on('data_stockListPage_First', function(firstPageData) {
    var totalPages = firstPageData.totalPage
    for (var np = 2; np <= totalPages; np++) {
      this.getStockListAtOnePage(type, np)
    }
  })
};

/**
 * 获取单页的股票列表信息
 *
 * @param type {int} 1:上证, 2:深证, 3:中小版块, 4:创业板
 */
QQStockParser.prototype.getStockListAtOnePage = function(type, page) {
  page = page || 1;
  var stock = this;
  var url = stock.base_url + stock.list_url + '?t=qgqp&c=search_by_type&type=' + type + '&p=' + page
  console.log('start url:' + url)
  request(url, function(error, response, data) {
    if (error) {
      console.log(error);
    }
    else {
      var listData = JSON.parse(data.replace(/var\s+\S+=\{/, '{'))
      if (listData['ret'] !== '0') {
        stock.emit('error', "error msg:" + listData['msg'])
      }
      else {
        var result = listData['data']
        result['type'] = type
        stock.emit('data_stockListPage', result)
        if (result['curPage'] === 1 || result['curPage'] === '1') {
          stock.emit('data_stockListPage_First', result)
        }
      }
    }
  });
};


/**
 * exports
 */
module.exports = QQStockParser