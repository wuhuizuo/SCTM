require 'nokogiri'
require 'open-uri'

module Sctm
  class SfBaiduParser
    GROUPS_CSS_PATH = 'div.container div.sort ul li a'
    
    APP_DETAIL_INFO_CSS_PATH = 'div#softAbs div.info'
    APP_DETAIL_SIZE_CSS_PATH = APP_DETAIL_INFO_CSS_PATH + ' p:nth-child(2) span.lInfo'
    APP_DETAIL_VERSION_CSS_PATH = APP_DETAIL_INFO_CSS_PATH + ' p:nth-child(2) span.mInfo'
    APP_DETAIL_BIT_CSS_PATH = APP_DETAIL_INFO_CSS_PATH + ' p:nth-child(3) span.lInfo'
    APP_DETAIL_DATE_CSS_PATH = APP_DETAIL_INFO_CSS_PATH + ' p:nth-child(3) span.mInfo'    
    
    REG_DETAIL_KV_SPLIT_BY = /\s*[：|:]\s*/
    PAGE_COUNT_GET_REG = Regexp.new('</html>[\s\S]+var\s+totalP\s*=\s*(\d+)\b[\s\S]+</script>')
    
    def initialize(sf_main_url)
      @base_url = sf_main_url.sub(/\/$/, '')
      @db = {}
    end
    
    attr_reader :db
    
    # @return [String] the body data string
    def get_relative_url(relative_url)
      open(@base_url + relative_url).read
    end
    
    def get_groups(force = false)
      if force or !(@db and @db[:groups]) 
        noko_html = Nokogiri::HTML get_relative_url('/')
        group_links = noko_html.css(GROUPS_CSS_PATH)
        group_name_link_map = group_links.map{ |l| [l.text, l.get_attribute(:href)] }
        @db[:groups] ||= {}
        group_name_link_map.each do |n_l|
          name, relative_link = n_l
          @db[:groups][name] ||= {}
          @db[:groups][name][:url] = relative_link
        end
      end
      @db[:groups].keys
    end
    
    def get_apps(group)
      if get_groups.include? group
        unless @db[:apps] and @db[:apps].find{|_, app| app[:group] == group }
          # get the page count
          group_url = @db[:groups][group][:url]
          set_pages_script_mat = get_relative_url(group_url).match(PAGE_COUNT_GET_REG)
          page_count = set_pages_script_mat && set_pages_script_mat[1].to_i
          page_count ||= 1
          # get all apps in the group
          @db[:apps] ||= {}
          (1..page_count).each do |p_c|
            page_url = group_url.sub(/\/$/, '') + "/#{p_c}"
            @db[:apps].merge! get_apps_in_one_page(page_url, group)
          end
        end
        @db[:apps].select{|n, att| att[:group] == group }.keys
      else
        raise "not exist group:#{group}"
      end
    end
    
    def get_app_detail(group, app)
      raise "not exist app:#{app}" unless get_apps(group).include?(app)
      unless @db[:apps][app][:detail]
        app_url = @db[:apps][app][:url]
        app_html = Nokogiri::HTML get_relative_url(app_url)
        
        # initilize other detail info.        
        @db[:apps][app][:detail] ||= {}

        # get the version,size, bit, update date
        [ APP_DETAIL_SIZE_CSS_PATH,        
          APP_DETAIL_VERSION_CSS_PATH,
          APP_DETAIL_BIT_CSS_PATH,
          APP_DETAIL_DATE_CSS_PATH].each do |css_path|
          app_html.css(css_path).each do |span|
            content = span.text.strip
            k, v = content.split(REG_DETAIL_KV_SPLIT_BY, 2)
            @db[:apps][app][:detail][k] = v
          end
        end
        
        # parse download count
        download_count_css = 'div#softAbs div.info p.certify span.download_count'
        dw_count = app_html.css(download_count_css).text.match(/(\d+)/)[1].to_i
        @db[:apps][app][:detail]['下载次数'] = dw_count
        
        # parse supported OSes
        os_css = 'div#softAbs div.info p.wInfo'
        k, v = app_html.css(os_css).text.strip.split(REG_DETAIL_KV_SPLIT_BY, 2)
        v = v.split('/').sort if v
        @db[:apps][app][:detail][k] = v
        
        # parse description and vendor
        description_css = 'div#mainContent div.softHolder div:nth-child(3)'
        description = app_html.css(description_css)
        section_title = description.css('p.infoTitle').text.strip
        description_text = description.css('p.message').text.strip
        @db[:apps][app][:detail][section_title] = description_text
        #mainContent > div.softHolder > div:nth-child(3) > p.infoTitle
        #mainContent > div.softHolder > div:nth-child(3) > p.message

        # 
        #TODO: get the app detail(size, update date, download url, etc.)
      end
      
      @db[:apps][app][:detail]
    end
    
    private 
    def get_apps_in_one_page(page_url, group_name)
      noko_html = Nokogiri::HTML get_relative_url(page_url)
      app_lis = noko_html.css('#softList li')
      apps = {}
      app_lis.each do |li|
        app_link = li.css('div.softInfo p.title a').first
        download_link = li.css('div.download a').first.get_attribute(:href)
        app_desc = li.css('div.softInfo p.desc').text.strip

        apps[app_link.text.strip] = { 
          url: app_link.get_attribute(:href), 
          group: group_name, 
          download_url: download_link,
          desc: app_desc 
        }
      end
      apps
    end
  end
end

require 'yaml'
baidu = Sctm::SfBaiduParser.new('http://rj.baidu.com')
# detail = baidu.get_app_detail('办公学习', '时刻在线')
# puts detail.to_yaml
groups = baidu.get_groups
# puts groups.join(',')
apps = baidu.get_apps(groups.first)
# puts apps.join(',')
app_detail = baidu.get_app_detail(groups.first, apps.first)
puts app_detail.to_yaml
puts baidu.db[:apps]