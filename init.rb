require 'redmine'

Redmine::Plugin.register :redmine_clone2ch do
  name 'Redmine Clone2ch plugin'
  author 'kawasima'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'https://github.com/kawasima/redmine_clone2ch/'
  author_url 'http://about.me/kawasima/'

  project_module :clone2ch do
    permission :view_clone2ch, :bbs => [:index]
  end

  menu :project_menu, :clone2ch, { :controller => :bbs, :action => 'index'}, :param => :project_id
end
