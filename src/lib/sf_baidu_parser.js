var request = require('request');
var cheerio = require('cheerio');

/**
 * SfBaiduParser class
 */
function SfBaiduParser(start_url) {
  this.base_url = start_url.replace(/\/+$/, '')
  this.GROUPS_CSS_PATH = 'div.container div.sort ul li a'
  this.PAGE_COUNT_GET_REG = new RegExp("</html>[\s|\S]+var\s+totalP\s*=\s*(\d+)\b[\s|\S]+</script>")
  this.db = {}

  /**
   * 0: idle
   * 1: updating groups
   * 2: updating apps in group
   * 3: updating apps in all groups
   */
  this.STATE_IDLE = 0
  this.STATE_UPDATING_GROUPS = 1
  this.STATE_UPDATING_GROUP_APPS = 2
  this.STATE_UPDATING_ALL_APPS = 3

  this.state = this.STATE_IDLE
}

//具有事件驱动功能
require('util').inherits(SfBaiduParser, require('events').EventEmitter)

/**
 * get app groups
 *
 * @param [boolean] force need force update?
 */
SfBaiduParser.prototype.get_groups = function(force) {
  if (this.state == this.STATE_UPDATING_GROUPS) {
    console.log('now busy to updating groups')
    return undefined
  }
  if (force || !(this.db && this.db.groups)) {
    var baidu = this
    baidu.state = baidu.STATE_UPDATING_GROUPS

    request(baidu.base_url + '/', function(error, response, html) {
      if (error) {
        console.log(error)
      }
      else {
        baidu.db = baidu.db || {}
        baidu.db.groups = baidu.db.groups || {}

        var $ = cheerio.load(html)
        $(baidu.GROUPS_CSS_PATH).each(function(index, link) {
          var name = $(link).text()
          var url = $(link).attr('href')
          baidu.db.groups[name] = baidu.db.groups[name] || {}
          baidu.db.groups[name].url = url
        })
      }
      baidu.state = baidu.STATE_IDLE
    })
  }
}

/**
 * get app list
 *
 * @param [string] group the group name
 * @return [string] the update event will be emit
 */
SfBaiduParser.prototype.get_apps = function(group) {
  if ((this.state == this.STATE_UPDATING_GROUP_APPS ||
      this.state == this.STATE_UPDATING_ALL_APPS) &&
    this.update_apps_current_group == group) {
    console.log("now busy to updating the group's apps")
    return undefined
  }

  if (this.db.groups && this.db.groups.indexOf(group) > -1) {
    var groupUrl = this.db.groups[group].url
    var baidu = this
    baidu.state = baidu.STATE_UPDATING_GROUP_APPS
    baidu.update_apps_current_group = group

    request(baidu.base_url + groupUrl, function(error, response, html) {
      if (error) {
        console.log(error)
      }
      else {
        var setPagesScriptMat = baidu.PAGE_COUNT_GET_REG.match(html)
        var pageCount = setPagesScriptMat && setPagesScriptMat[1].to_i
        pageCount = (pageCount || 1)
        var $ = cheerio.load(html)
        $(baidu.PAGE_COUNT_GET_REG).each(function(index, link) {
          var name = $(link).text()
          var url = $(link).attr('href')
          baidu.db.groups[name] = baidu.db.groups[name] || {}
          baidu.db.groups[name].url = url
        })
        baidu.state = baidu.STATE_IDLE
      }
    })
    baidu.state = baidu.STATE_IDLE
    baidu.update_apps_current_group = null

  }
  else {
    var failMsg = 'not exist group:' + group
    console.log(failMsg)
    throw (failMsg)
  }
}

/**
 * exports
 */
module.exports = SfBaiduParser