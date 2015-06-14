require_relative 'sf_baidu_parser'
module Sctm
  class SfParser
    SF_SITES = {
      baidu: 'http://rj.baidu.com/'
    }
    SF_PARSERS = {
      baidu: SfBaiduParser
    }
    # @param [String] sf_center 软件中心类别
    def initialize(sf_center = :baidu)
      @sf_main_url = SF_SITES[sf_center]
      @parser = SF_PARSERS[sf_center].new(@sf_main_url)
    end
    
    # 获取软件大类的分类
    def get_groups
      @parser.get_groups
    end
    
    # 获取指定类别下的软件列表
    def get_apps(group, limit = -1)
      @parser.get_apps(group, limit)
    end
    
    # 获取应用信息
    # @param [String] app_name 查询应用名称
    def get_app_detail(app_name)
      @parser.get_app_detail(app_name)
    end
  end  
end  
